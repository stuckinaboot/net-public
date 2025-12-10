import { useReadContract } from "wagmi";
import { useState, useEffect } from "react";
import { STORAGE_CONTRACT, SAFE_STORAGE_READER_CONTRACT } from "../constants";
import { CHUNKED_STORAGE_READER_CONTRACT } from "../constants";
import { getNetContract } from "@net-protocol/core";
import { assembleChunks } from "../utils/chunkUtils";
import { getPublicClient } from "@net-protocol/core";
import { readContract } from "viem/actions";
import { hexToString, stringToHex } from "viem";
import { getStorageKeyBytes } from "../utils/keyUtils";
import type { UseStorageOptions, BulkStorageKey, StorageData } from "../types";

export function useStorage({
  chainId,
  key,
  operatorAddress,
  enabled = true,
  index,
  keyFormat,
}: UseStorageOptions) {
  // For latest version (index undefined), use existing simple flow
  const isLatestVersion = index === undefined;

  // Latest version: use Storage.get() directly
  const {
    data: latestData,
    isLoading: latestLoading,
    error: latestError,
  } = useReadContract({
    abi: STORAGE_CONTRACT.abi,
    address: STORAGE_CONTRACT.address,
    functionName: "get",
    args:
      key && operatorAddress
        ? [getStorageKeyBytes(key, keyFormat) as `0x${string}`, operatorAddress]
        : undefined,
    chainId,
    query: {
      enabled: enabled && !!operatorAddress && !!key && isLatestVersion,
    },
  });

  // Historical version: try chunked storage first, then regular storage
  const [historicalData, setHistoricalData] = useState<StorageData | undefined>(
    undefined
  );
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState<Error | undefined>();

  useEffect(() => {
    async function fetchHistoricalVersion() {
      if (isLatestVersion || !key || !operatorAddress || !enabled) {
        return;
      }

      setHistoricalLoading(true);
      setHistoricalError(undefined);
      setHistoricalData(undefined);

      try {
        const client = getPublicClient({ chainId });
        if (!client) {
          throw new Error(`Chain not found for chainId: ${chainId}`);
        }

        const storageKeyBytes = getStorageKeyBytes(
          key,
          keyFormat
        ) as `0x${string}`;

        // Step 1: Try ChunkedStorageReader.getMetadataAtIndex first
        try {
          const metadata = await readContract(client, {
            abi: CHUNKED_STORAGE_READER_CONTRACT.abi,
            address: CHUNKED_STORAGE_READER_CONTRACT.address,
            functionName: "getMetadataAtIndex",
            args: [storageKeyBytes, operatorAddress, index],
          });

          const [chunkCount, text] = metadata as [number, string];

          if (chunkCount > 0) {
            // Found chunked storage at index - fetch and assemble chunks
            const chunks = (await readContract(client, {
              abi: CHUNKED_STORAGE_READER_CONTRACT.abi,
              address: CHUNKED_STORAGE_READER_CONTRACT.address,
              functionName: "getChunksAtIndex",
              args: [storageKeyBytes, operatorAddress, 0, chunkCount, index],
            })) as string[];

            const assembledData = assembleChunks(chunks);
            if (assembledData !== undefined) {
              // Convert assembled string to hex for consistency with latest version format
              const hexData = stringToHex(assembledData);
              setHistoricalData([text, hexData]);
              setHistoricalLoading(false);
              return;
            }
          }
        } catch (chunkedError) {
          // Chunked storage failed, continue to regular storage
          console.log(
            "[useStorage] Chunked storage not found at index, trying regular storage:",
            chunkedError
          );
        }

        // Step 2: Try regular Storage.getValueAtIndex
        const result = await readContract(client, {
          abi: STORAGE_CONTRACT.abi,
          address: STORAGE_CONTRACT.address,
          functionName: "getValueAtIndex",
          args: [storageKeyBytes, operatorAddress, index],
        });

        const [text, data] = result as [string, `0x${string}`];
        // Keep data as hex for consistency with latest version format
        setHistoricalData([text, data]);
      } catch (error) {
        console.error(
          "[useStorage] Failed to fetch historical version:",
          error
        );
        setHistoricalError(error as Error);
      } finally {
        setHistoricalLoading(false);
      }
    }

    fetchHistoricalVersion();
  }, [chainId, key, operatorAddress, index, enabled, isLatestVersion]);

  // Return appropriate data based on version type
  if (isLatestVersion) {
    return {
      data: latestData as StorageData | undefined,
      isLoading: latestLoading,
      error: latestError as Error | undefined,
    };
  } else {
    return {
      data: historicalData,
      isLoading: historicalLoading,
      error: historicalError,
    };
  }
}

export function useStorageForOperator({
  chainId,
  operatorAddress,
}: UseStorageOptions) {
  const netContract = getNetContract(chainId);
  const { data: totalCount, isLoading: isLoadingCount } = useReadContract({
    abi: netContract.abi,
    address: netContract.address,
    functionName: "getTotalMessagesForAppUserCount",
    args: [STORAGE_CONTRACT.address, operatorAddress],
    chainId,
  });

  // Convert BigInt totalCount to number immediately
  const totalCountNumber = totalCount ? Number(totalCount) : 0;

  const { data: messages, isLoading: isLoadingMessages } = useReadContract({
    abi: netContract.abi,
    address: netContract.address,
    functionName: "getMessagesInRangeForAppUser",
    args: [0, totalCountNumber, STORAGE_CONTRACT.address, operatorAddress],
    chainId,
  }) as { data: any[] | undefined; isLoading: boolean };

  console.log("[useStorageForOperator] Contract calls:", {
    totalCount: totalCountNumber,
    messages,
    messagesLength: messages?.length,
  });

  return {
    data:
      messages?.map((msg: any) => [
        msg.topic,
        msg.text,
        Number(msg.timestamp),
        msg.data,
      ]) || [],
    isLoading: isLoadingCount || isLoadingMessages,
    error: undefined,
  };
}

export function useStorageForOperatorAndKey({
  chainId,
  key,
  operatorAddress,
  keyFormat,
}: UseStorageOptions) {
  const storageKeyBytes = key
    ? (getStorageKeyBytes(key, keyFormat) as `0x${string}`)
    : undefined;
  const readContractArgs = {
    abi: STORAGE_CONTRACT.abi,
    address: STORAGE_CONTRACT.address,
    functionName: "getForOperatorAndKey",
    args: storageKeyBytes ? [operatorAddress, storageKeyBytes] : undefined,
    chainId,
    query: {
      enabled: !!key && !!operatorAddress,
    },
  };

  const { data, isLoading, error } = useReadContract(readContractArgs);

  return {
    data: data as StorageData | undefined,
    isLoading,
    error: error as Error | undefined,
  };
}

export function useBulkStorage({
  chainId,
  keys,
  safe = false,
  keyFormat,
}: {
  chainId: number;
  keys: BulkStorageKey[];
  safe?: boolean;
  keyFormat?: "raw" | "bytes32";
}) {
  const contract = safe ? SAFE_STORAGE_READER_CONTRACT : STORAGE_CONTRACT;

  // Convert keys to bytes32 format
  const bulkKeys = keys.map((k) => ({
    key: getStorageKeyBytes(k.key, keyFormat) as `0x${string}`,
    operator: k.operator as `0x${string}`,
  }));

  const readContractArgs = {
    abi: contract.abi,
    address: contract.address,
    functionName: "bulkGet",
    args: [bulkKeys],
    chainId,
  };

  const { data, isLoading, error } = useReadContract(readContractArgs);

  return {
    data: data as { text: string; value: string }[] | undefined,
    isLoading,
    error: error as Error | undefined,
  };
}

/**
 * Get total number of versions (writes) for a storage key
 * Tries both chunked storage and regular storage
 */
export function useStorageTotalWrites({
  chainId,
  key,
  operatorAddress,
  enabled = true,
  keyFormat,
}: {
  chainId: number;
  key?: string;
  operatorAddress?: string;
  enabled?: boolean;
  keyFormat?: "raw" | "bytes32";
}) {
  const storageKeyBytes = key
    ? (getStorageKeyBytes(key, keyFormat) as `0x${string}`)
    : undefined;

  // Try ChunkedStorageReader first
  const {
    data: chunkedTotal,
    isLoading: chunkedLoading,
    error: chunkedError,
  } = useReadContract({
    abi: CHUNKED_STORAGE_READER_CONTRACT.abi,
    address: CHUNKED_STORAGE_READER_CONTRACT.address,
    functionName: "getTotalWrites",
    args:
      storageKeyBytes && operatorAddress
        ? [storageKeyBytes, operatorAddress]
        : undefined,
    chainId,
    query: {
      enabled: enabled && !!key && !!operatorAddress,
    },
  });

  // Try regular Storage as fallback
  const {
    data: regularTotal,
    isLoading: regularLoading,
    error: regularError,
  } = useReadContract({
    abi: STORAGE_CONTRACT.abi,
    address: STORAGE_CONTRACT.address,
    functionName: "getTotalWrites",
    args:
      storageKeyBytes && operatorAddress
        ? [storageKeyBytes, operatorAddress]
        : undefined,
    chainId,
    query: {
      enabled:
        enabled &&
        !!key &&
        !!operatorAddress &&
        (chunkedTotal === undefined || Number(chunkedTotal) === 0),
    },
  });

  // Determine which result to use
  const chunkedTotalNumber = chunkedTotal ? Number(chunkedTotal) : 0;
  const regularTotalNumber = regularTotal ? Number(regularTotal) : 0;

  // Use whichever returns > 0, prefer chunked if both are > 0
  const totalWrites =
    chunkedTotalNumber > 0 ? chunkedTotalNumber : regularTotalNumber;

  return {
    data: totalWrites > 0 ? totalWrites : undefined,
    isLoading: chunkedLoading || regularLoading,
    error:
      chunkedTotalNumber === 0 && regularTotalNumber === 0
        ? chunkedError || regularError
        : undefined,
  };
}
