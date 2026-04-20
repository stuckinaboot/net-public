import type { NetMessage } from "@net-protocol/core";

/**
 * Filter criteria for a webhook subscription.
 * At least one of topic, sender, or appAddress must be specified.
 */
export type SubscriptionFilter = {
  /** Match messages with this topic (indexed on-chain) */
  topic?: string;
  /** Match messages from this sender address */
  sender?: `0x${string}`;
  /** Match messages sent via this app contract */
  appAddress?: `0x${string}`;
};

/**
 * A registered webhook subscription.
 */
export type Subscription = {
  /** Unique subscription ID */
  id: string;
  /** Chain ID to watch */
  chainId: number;
  /** Filter criteria for matching messages */
  filter: SubscriptionFilter;
  /** URL to POST matched messages to */
  webhookUrl: string;
  /** Optional secret for HMAC-SHA256 signature in X-Net-Signature header */
  secret?: string;
  /** Whether subscription is active */
  active: boolean;
  /** ISO timestamp of creation */
  createdAt: string;
};

/**
 * Payload delivered to webhook endpoints.
 */
export type WebhookPayload = {
  /** Subscription that triggered this delivery */
  subscriptionId: string;
  /** Chain the message was observed on */
  chainId: number;
  /** The Net message */
  message: {
    app: string;
    sender: string;
    timestamp: string;
    data: string;
    text: string;
    topic: string;
  };
  /** On-chain message index */
  messageIndex: string;
  /** Whether this was sent via an app contract */
  viaApp: boolean;
  /** ISO timestamp of delivery attempt */
  deliveredAt: string;
};

/**
 * Result of a webhook delivery attempt.
 */
export type DeliveryResult = {
  subscriptionId: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  attemptedAt: string;
  retryCount: number;
};

/**
 * Configuration for the webhook watcher.
 */
export type WatcherConfig = {
  /** Chain ID to watch (default: 8453 / Base) */
  chainId?: number;
  /** Custom RPC URLs */
  rpcUrls?: string[];
  /** Poll interval in milliseconds for chains without websocket support (default: 2000) */
  pollIntervalMs?: number;
  /** Maximum retry attempts for failed deliveries (default: 3) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  retryBaseDelayMs?: number;
  /** Port for the management HTTP API (default: 3847) */
  apiPort?: number;
};
