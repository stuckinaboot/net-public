import { getNetContract } from "../chainConfig";
import { GetNetMessagesOptions, GetNetMessageCountOptions } from "../types";

// Internal config builder params (chainId required separately)
type GetNetMessagesReadConfigParams = {
  chainId: number;
  filter?: GetNetMessagesOptions["filter"];
  startIndex?: number;
  endIndex?: number;
};

/**
 * Build contract read args for message queries.
 * Accepts GetNetMessagesOptions for backward compatibility with hooks.
 */
export function getNetMessagesReadConfig(
  params: GetNetMessagesOptions | GetNetMessagesReadConfigParams
) {
  const { chainId, filter, startIndex = 0, endIndex } = params;
  const netContract = getNetContract(chainId);

  if (!filter) {
    return {
      abi: netContract.abi,
      address: netContract.address,
      functionName: "getMessagesInRange",
      args: [startIndex, endIndex ?? 0],
      chainId,
    };
  }

  const hasMaker = Boolean(filter.maker);
  const hasTopic = Boolean(filter.topic);

  let functionName: string;
  let args: unknown[];

  if (hasMaker && hasTopic) {
    functionName = "getMessagesInRangeForAppUserTopic";
    args = [startIndex, endIndex, filter.appAddress, filter.maker, filter.topic];
  } else if (hasMaker) {
    functionName = "getMessagesInRangeForAppUser";
    args = [startIndex, endIndex, filter.appAddress, filter.maker];
  } else if (hasTopic) {
    functionName = "getMessagesInRangeForAppTopic";
    args = [startIndex, endIndex, filter.appAddress, filter.topic];
  } else {
    functionName = "getMessagesInRangeForApp";
    args = [startIndex, endIndex, filter.appAddress];
  }

  return {
    abi: netContract.abi,
    address: netContract.address,
    functionName,
    args,
    chainId,
  };
}

// Internal config builder params (chainId required separately)
type GetNetMessageCountReadConfigParams = {
  chainId: number;
  filter?: GetNetMessageCountOptions["filter"];
};

/**
 * Build contract read args for message count.
 * Accepts GetNetMessageCountOptions for backward compatibility with hooks.
 */
export function getNetMessageCountReadConfig(
  params: GetNetMessageCountOptions | GetNetMessageCountReadConfigParams
) {
  const { chainId, filter } = params;
  const netContract = getNetContract(chainId);

  if (!filter) {
    return {
      abi: netContract.abi,
      address: netContract.address,
      functionName: "getTotalMessagesCount",
      args: [],
      chainId,
    };
  }

  const hasMaker = Boolean(filter.maker);
  const hasTopic = Boolean(filter.topic);

  let functionName: string;
  let args: unknown[];

  if (hasMaker && hasTopic) {
    functionName = "getTotalMessagesForAppUserTopicCount";
    args = [filter.appAddress, filter.maker, filter.topic];
  } else if (hasMaker) {
    functionName = "getTotalMessagesForAppUserCount";
    args = [filter.appAddress, filter.maker];
  } else if (hasTopic) {
    functionName = "getTotalMessagesForAppTopicCount";
    args = [filter.appAddress, filter.topic];
  } else {
    functionName = "getTotalMessagesForAppCount";
    args = [filter.appAddress];
  }

  return {
    abi: netContract.abi,
    address: netContract.address,
    functionName,
    args,
    chainId,
  };
}
