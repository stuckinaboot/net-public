import { getNetContract } from "../chainConfig";
import { GetNetMessagesOptions, GetNetMessageCountOptions } from "../types";

// Internal config builder params (chainId required separately)
type GetNetMessagesReadConfigParams = {
  chainId: number;
  filter?: GetNetMessagesOptions["filter"];
  startIndex?: number;
  endIndex?: number;
};

// Build contract read args for message queries
// Accepts GetNetMessagesOptions for backward compatibility with hooks
export function getNetMessagesReadConfig(
  params: GetNetMessagesOptions | GetNetMessagesReadConfigParams
) {
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

// Internal config builder params (chainId required separately)
type GetNetMessageCountReadConfigParams = {
  chainId: number;
  filter?: GetNetMessageCountOptions["filter"];
};

// Build contract read args for message count
// Accepts GetNetMessageCountOptions for backward compatibility with hooks
export function getNetMessageCountReadConfig(
  params: GetNetMessageCountOptions | GetNetMessageCountReadConfigParams
) {
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


