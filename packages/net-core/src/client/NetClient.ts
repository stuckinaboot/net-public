import { PublicClient } from "viem";
import { readContract } from "viem/actions";
import { getPublicClient, getNetContract } from "../chainConfig";
import {
  getNetMessagesReadConfig,
  getNetMessageCountReadConfig,
} from "./messages";
import {
  GetNetMessagesOptions,
  GetNetMessageCountOptions,
  NetMessage,
} from "../types";

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

  async getMessages(params: GetNetMessagesOptions): Promise<NetMessage[]> {
    const config = getNetMessagesReadConfig({
      ...params,
      chainId: this.chainId,
    });

    const messages = await readContract(this.client, config);
    return messages as NetMessage[];
  }

  async getMessageCount(params: GetNetMessageCountOptions): Promise<number> {
    const config = getNetMessageCountReadConfig({
      ...params,
      chainId: this.chainId,
    });

    const count = await readContract(this.client, config);
    return Number(count);
  }

  async getMessagesBatch(
    params: GetNetMessagesOptions & {
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
}
