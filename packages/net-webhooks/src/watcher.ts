import { createPublicClient, defineChain, http, parseAbiItem, type Log } from "viem";
import { getNetContract } from "@net-protocol/core";
import { NetClient } from "@net-protocol/core";
import type { WatcherConfig, WebhookPayload } from "./types.js";
import type { SubscriptionStore } from "./subscriptions.js";
import { deliverWebhook } from "./delivery.js";

// Default chain configs for viem (Base)
const DEFAULT_CHAIN_ID = 8453;
const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 1000;

const MessageSentEvent = parseAbiItem(
  "event MessageSent(address indexed sender, string indexed topic, uint256 messageIndex)"
);

const MessageSentViaAppEvent = parseAbiItem(
  "event MessageSentViaApp(address indexed app, address indexed sender, string indexed topic, uint256 messageIndex)"
);

export type WatcherEventHandler = (event: {
  type: "delivery" | "error";
  result?: Awaited<ReturnType<typeof deliverWebhook>>;
  error?: Error;
}) => void;

/**
 * Watches the Net Protocol contract for new messages and delivers
 * matching events to webhook subscribers.
 *
 * Note: Solidity `indexed string` parameters are stored as keccak256 hashes
 * in event logs. We cannot filter by topic at the event level — instead we
 * fetch the full message on-chain and match against the decoded topic string.
 * Filtering by sender/app (indexed address) works at the event level.
 */
export class NetWatcher {
  private chainId: number;
  private store: SubscriptionStore;
  private netClient: NetClient;
  private maxRetries: number;
  private retryBaseDelayMs: number;
  private pollIntervalMs: number;
  private unwatch: (() => void) | null = null;
  private onEvent?: WatcherEventHandler;

  constructor(
    store: SubscriptionStore,
    config: WatcherConfig = {},
    onEvent?: WatcherEventHandler
  ) {
    this.chainId = config.chainId ?? DEFAULT_CHAIN_ID;
    this.store = store;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryBaseDelayMs = config.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.onEvent = onEvent;

    this.netClient = new NetClient({
      chainId: this.chainId,
      overrides: config.rpcUrls ? { rpcUrls: config.rpcUrls } : undefined,
    });

    // Create a separate viem client for event watching
    const netContract = getNetContract(this.chainId);
    const rpcUrls = config.rpcUrls ?? ["https://base-mainnet.public.blastapi.io"];

    this.watchClient = createPublicClient({
      chain: defineChain({
        id: this.chainId,
        name: "Net Chain",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
          default: { http: rpcUrls },
          public: { http: rpcUrls },
        },
      }),
      transport: http(),
    });

    this.contractAddress = netContract.address;
  }

  private watchClient;
  private contractAddress: `0x${string}`;

  /**
   * Start watching for new messages on-chain.
   */
  start(): void {
    if (this.unwatch) {
      throw new Error("Watcher is already running");
    }

    const onError = (error: Error) => {
      if (this.onEvent) {
        this.onEvent({ type: "error", error });
      }
    };

    // Watch MessageSent events
    const unwatchDirect = this.watchClient.watchEvent({
      address: this.contractAddress,
      event: MessageSentEvent,
      onLogs: (logs) => {
        this.handleDirectMessages(logs).catch(onError);
      },
      onError,
      pollingInterval: this.pollIntervalMs,
    });

    // Watch MessageSentViaApp events
    const unwatchApp = this.watchClient.watchEvent({
      address: this.contractAddress,
      event: MessageSentViaAppEvent,
      onLogs: (logs) => {
        this.handleAppMessages(logs).catch(onError);
      },
      onError,
      pollingInterval: this.pollIntervalMs,
    });

    this.unwatch = () => {
      unwatchDirect();
      unwatchApp();
    };
  }

  /**
   * Stop watching.
   */
  stop(): void {
    if (this.unwatch) {
      this.unwatch();
      this.unwatch = null;
    }
  }

  /**
   * Whether the watcher is currently running.
   */
  get running(): boolean {
    return this.unwatch !== null;
  }

  private async handleDirectMessages(logs: Log[]): Promise<void> {
    for (const log of logs) {
      const args = (log as any).args;
      if (!args) continue;

      const { sender, messageIndex } = args;
      // Note: `topic` from event is a keccak256 hash (indexed string),
      // so we fetch the full message to get the real topic string.
      await this.processMessage({
        sender: sender as `0x${string}`,
        messageIndex: BigInt(messageIndex),
        viaApp: false,
      });
    }
  }

  private async handleAppMessages(logs: Log[]): Promise<void> {
    for (const log of logs) {
      const args = (log as any).args;
      if (!args) continue;

      const { app, sender, messageIndex } = args;
      await this.processMessage({
        sender: sender as `0x${string}`,
        appAddress: app as `0x${string}`,
        messageIndex: BigInt(messageIndex),
        viaApp: true,
      });
    }
  }

  private async processMessage(params: {
    sender: `0x${string}`;
    appAddress?: `0x${string}`;
    messageIndex: bigint;
    viaApp: boolean;
  }): Promise<void> {
    // Fetch the full message first — we need the real topic string
    // (event logs only contain keccak256 hash for indexed strings)
    let message;
    try {
      message = await this.netClient.getMessageAtIndex({
        messageIndex: Number(params.messageIndex),
        appAddress: params.appAddress,
      });
    } catch (err) {
      if (this.onEvent) {
        this.onEvent({
          type: "error",
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
      return;
    }

    if (!message) return;

    const matching = this.store.getMatching({
      chainId: this.chainId,
      topic: message.topic,
      sender: params.sender,
      appAddress: params.appAddress,
    });

    if (matching.length === 0) return;

    // Deliver to all matching subscriptions in parallel
    const deliveries = matching.map((sub) => {
      const payload: WebhookPayload = {
        subscriptionId: sub.id,
        chainId: this.chainId,
        message: {
          app: message.app,
          sender: message.sender,
          timestamp: message.timestamp.toString(),
          data: message.data,
          text: message.text,
          topic: message.topic,
        },
        messageIndex: params.messageIndex.toString(),
        viaApp: params.viaApp,
        deliveredAt: new Date().toISOString(),
      };

      return deliverWebhook({
        subscription: sub,
        payload,
        maxRetries: this.maxRetries,
        retryBaseDelayMs: this.retryBaseDelayMs,
      });
    });

    const results = await Promise.allSettled(deliveries);

    for (const result of results) {
      if (result.status === "fulfilled" && this.onEvent) {
        this.onEvent({ type: "delivery", result: result.value });
      }
    }
  }
}
