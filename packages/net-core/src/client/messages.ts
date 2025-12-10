import { getNetContract, getPublicClient } from "../chainConfig";
import { GetNetMessagesOptions, GetNetMessageCountOptions, NetMessage } from "../types";
import { readContract } from "viem/actions";

// Build contract read args for message queries
export function getNetMessagesReadConfig(params: GetNetMessagesOptions) {
  const { chainId, filter, startIndex = 0, endIndex } = params;
  const netContract = getNetContract(chainId);

  // Standard filter-based config
  if (filter) {
    const functionName = filter.maker
      ? "getMessagesInRangeForAppUserTopic"
      : filter.topic
      ? "getMessagesInRangeForAppTopic"
      : "getMessagesInRangeForApp";

    const args = filter.maker
      ? [startIndex, endIndex, filter.appAddress, filter.maker, filter.topic ?? ""]
      : filter.topic
      ? [startIndex, endIndex, filter.appAddress, filter.topic]
      : [startIndex, endIndex, filter.appAddress];

    return {
      abi: netContract.abi,
      address: netContract.address,
      functionName,
      args,
      chainId,
    };
  }

  // Global messages
  return {
    abi: netContract.abi,
    address: netContract.address,
    functionName: "getMessagesInRange",
    args: [startIndex, endIndex ?? 0],
    chainId,
  };
}

// Build contract read args for message count
export function getNetMessageCountReadConfig(params: GetNetMessageCountOptions) {
  const { chainId, filter } = params;
  const netContract = getNetContract(chainId);

  // Standard filter-based config
  if (filter) {
    const functionName = filter.maker
      ? "getTotalMessagesForAppUserTopicCount"
      : filter.topic
      ? "getTotalMessagesForAppTopicCount"
      : "getTotalMessagesForAppCount";

    const args = filter.maker
      ? [filter.appAddress, filter.maker, filter.topic ?? ""]
      : filter.topic
      ? [filter.appAddress, filter.topic]
      : [filter.appAddress];

    return {
      abi: netContract.abi,
      address: netContract.address,
      functionName,
      args,
      chainId,
    };
  }

  // Global count
  return {
    abi: netContract.abi,
    address: netContract.address,
    functionName: "getTotalMessagesCount",
    args: [],
    chainId,
  };
}

// Standalone utility functions

/**
 * Get Net messages (standalone function, doesn't require NetClient instance)
 */
export async function getNetMessages(params: GetNetMessagesOptions): Promise<NetMessage[]> {
  const client = getPublicClient({
    chainId: params.chainId,
    rpcUrl: params.rpcUrl,
  });

  const config = getNetMessagesReadConfig(params);
  const messages = await readContract(client, config);
  return messages as NetMessage[];
}

/**
 * Get Net message count (standalone function, doesn't require NetClient instance)
 */
export async function getNetMessageCount(params: GetNetMessageCountOptions): Promise<number> {
  const client = getPublicClient({
    chainId: params.chainId,
    rpcUrl: params.rpcUrl,
  });

  const config = getNetMessageCountReadConfig(params);
  const count = await readContract(client, config);
  return Number(count);
}

/**
 * Get a single Net message by index
 */
export async function getNetMessageAtIndex(params: {
  chainId: number;
  messageIndex: number;
  appAddress?: `0x${string}`;
  topic?: string;
  rpcUrl?: string | string[];
}): Promise<NetMessage | null> {
  const client = getPublicClient({
    chainId: params.chainId,
    rpcUrl: params.rpcUrl,
  });

  const netContract = getNetContract(params.chainId);
  const msgIdxBigInt = BigInt(params.messageIndex);

  let functionName: string;
  let args: any[];

  if (params.appAddress && params.topic) {
    functionName = "getMessageForAppTopic";
    args = [msgIdxBigInt, params.appAddress, params.topic];
  } else if (params.appAddress) {
    functionName = "getMessageForApp";
    args = [msgIdxBigInt, params.appAddress];
  } else {
    functionName = "getMessage";
    args = [msgIdxBigInt];
  }

  try {
    const message = await readContract(client, {
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

