import { PublicClient } from "viem";
import { readContract } from "viem/actions";
import { getPublicClient, getNetContract } from "../chainConfig";
import {
  getNetMessagesReadConfig,
  getNetMessageCountReadConfig,
} from "./messages";
import {
  NetClientMessagesOptions,
  NetClientMessageCountOptions,
  NetMessage,
  WriteTransactionConfig,
} from "../types";
import { normalizeDataOrEmpty } from "../utils/dataUtils";

/**
 * NetClient - Client for interacting with Net protocol messages
 * 
 * **Pattern for client methods:**
 * - Client methods never require `chainId` in their parameters
 * - All methods use `this.chainId` internally (set during construction)
 * - Config builders receive `chainId` as a separate required parameter
 * - This ensures consistency: the client's `chainId` is the single source of truth
 */
export class NetClient {
  private client: PublicClient;
  private chainId: number;

  constructor(params: { chainId: number; overrides?: { rpcUrls: string[] } }) {
    this.client = getPublicClient({
      chainId: params.chainId,
      rpcUrl: params.overrides?.rpcUrls,
    });
    this.chainId = params.chainId;
  }

  async getMessages(params: NetClientMessagesOptions): Promise<NetMessage[]> {
    const config = getNetMessagesReadConfig({
      ...params,
      chainId: this.chainId,
    });

    const messages = await readContract(this.client, config);
    return messages as NetMessage[];
  }

  async getMessageCount(params: NetClientMessageCountOptions): Promise<number> {
    const config = getNetMessageCountReadConfig({
      ...params,
      chainId: this.chainId,
    });

    const count = await readContract(this.client, config);
    return Number(count);
  }

  async getMessagesBatch(
    params: NetClientMessagesOptions & {
      batchCount?: number;
    }
  ): Promise<NetMessage[]> {
    const { startIndex = 0, endIndex, batchCount = 4 } = params;

    if (endIndex === undefined || endIndex < startIndex) {
      return [];
    }

    const total = endIndex - startIndex;
    const batchSize = Math.ceil(total / batchCount);
    const numBatches = Math.ceil(total / batchSize);

    const batches: Promise<NetMessage[]>[] = [];

    for (let i = 0; i < numBatches; i++) {
      const batchStart = startIndex + i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, endIndex);

      batches.push(
        this.getMessages({
          ...params,
          startIndex: batchStart,
          endIndex: batchEnd,
        })
      );
    }

    const results = await Promise.all(batches);
    return results.flat();
  }

  async getMessageAtIndex(params: {
    messageIndex: number;
    appAddress?: `0x${string}`;
    topic?: string;
  }): Promise<NetMessage | null> {
    const { messageIndex, appAddress, topic } = params;
    const netContract = getNetContract(this.chainId);
    const msgIdxBigInt = BigInt(messageIndex);

    let functionName: string;
    let args: any[];

    if (appAddress && topic) {
      functionName = "getMessageForAppTopic";
      args = [msgIdxBigInt, appAddress, topic];
    } else if (appAddress) {
      functionName = "getMessageForApp";
      args = [msgIdxBigInt, appAddress];
    } else {
      functionName = "getMessage";
      args = [msgIdxBigInt];
    }

    try {
      const message = await readContract(this.client, {
        abi: netContract.abi,
        address: netContract.address,
        functionName,
        args,
      });
      return message as NetMessage;
    } catch {
      return null;
    }
  }

  /**
   * Validate message parameters
   */
  private validateMessageParams(params: {
    text: string;
    data?: string | `0x${string}`;
  }) {
    const hasText = params.text.length > 0;
    const hasData =
      params.data !== undefined &&
      (typeof params.data === "string"
        ? params.data.length > 0
        : params.data !== "0x");

    if (!hasText && !hasData) {
      throw new Error("Message must have non-empty text or data");
    }
  }

  /**
   * Prepare transaction config for sending a direct Net message (user sends directly, not via app).
   */
  prepareSendMessage(params: {
    text: string;
    topic: string;
    data?: `0x${string}` | string;
  }): WriteTransactionConfig {
    this.validateMessageParams({ text: params.text, data: params.data });

    const netContract = getNetContract(this.chainId);
    const data = normalizeDataOrEmpty(params.data);

    return {
      to: netContract.address,
      functionName: "sendMessage",
      args: [params.text, params.topic, data],
      abi: netContract.abi,
    };
  }

  /**
   * Prepare transaction config for sending a message via an app contract.
   *
   * Note: This transaction should be called FROM the app contract, not directly from a user wallet.
   */
  prepareSendMessageViaApp(params: {
    sender: `0x${string}`;
    text: string;
    topic: string;
    data?: `0x${string}` | string;
    appAddress: `0x${string}`;
  }): WriteTransactionConfig {
    this.validateMessageParams({ text: params.text, data: params.data });

    const netContract = getNetContract(this.chainId);
    const data = normalizeDataOrEmpty(params.data);

    return {
      to: netContract.address,
      functionName: "sendMessageViaApp",
      args: [params.sender, params.text, params.topic, data],
      abi: netContract.abi,
    };
  }
}
