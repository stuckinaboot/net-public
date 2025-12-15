import { useReadContract } from "wagmi";
import { useState, useEffect } from "react";
import { STORAGE_CONTRACT, SAFE_STORAGE_READER_CONTRACT } from "../constants";
import {
  CHUNKED_STORAGE_READER_CONTRACT,
  STORAGE_ROUTER_CONTRACT,
  CHUNKED_STORAGE_CONTRACT,
} from "../constants";
import { getNetContract } from "@net-protocol/core";
import { assembleChunks } from "../utils/chunkUtils";
import { getPublicClient } from "@net-protocol/core";
import { readContract } from "viem/actions";
import { hexToString, stringToHex, decodeAbiParameters } from "viem";
import { getStorageKeyBytes } from "../utils/keyUtils";
import type { UseStorageOptions, BulkStorageKey, StorageData } from "../types";

const BATCH_SIZE = 2;

export function useStorage({
  chainId,
  key,
  operatorAddress,
  enabled = true,
  index,
  keyFormat,
  useRouter = false,
  outputFormat = "hex",
}: UseStorageOptions) {
  // For latest version (index undefined), use existing simple flow
  const isLatestVersion = index === undefined;
  const shouldUseRouter = useRouter === true && isLatestVersion;
  const outputAsString = outputFormat === "string";
  const storageKeyBytes = key ? getStorageKeyBytes(key, keyFormat) : undefined;

  // Helper function to convert data based on outputFormat
  const formatData = (text: string, dataHex: `0x${string}`): StorageData => {
    return {
      text,
      value: outputAsString ? hexToString(dataHex) : dataHex,
    };
  };

  // Router path (latest only, automatic detection)
  const [routerData, setRouterData] = useState<StorageData | undefined>();
  const [routerChunkLoading, setRouterChunkLoading] = useState(false);
  const [routerChunkError, setRouterChunkError] = useState<Error | undefined>();

  const routerHook = useReadContract({
    abi: STORAGE_ROUTER_CONTRACT.abi,
    address: STORAGE_ROUTER_CONTRACT.address,
    functionName: "get",
    args:
      storageKeyBytes && operatorAddress
        ? [storageKeyBytes, operatorAddress]
        : undefined,
    chainId,
    query: {
      enabled: shouldUseRouter && enabled && !!key && !!operatorAddress,
    },
  });

  // useEffect to process router result
  useEffect(() => {
    async function processRouterResult() {
      if (!routerHook.data || routerHook.isLoading || routerHook.error) {
        return;
      }

      const [isChunkedStorage, text, data] = routerHook.data as [
        boolean,
        string,
        `0x${string}`
      ];

      // Handle non-chunked data (early return)
      if (!isChunkedStorage) {
        // Guard: ensure data exists before formatting
        if (!data || typeof data !== "string") {
          setRouterData(undefined);
          return;
        }
        // Regular storage - data is already hex, apply outputFormat
        const formatted = formatData(text, data);
        setRouterData(formatted);
        return;
      }

      // Handle chunked data
      setRouterChunkLoading(true);
      setRouterChunkError(undefined);

      try {
        // Decode chunk count from the data
        const [chunkCount] = decodeAbiParameters([{ type: "uint8" }], data);

        if (chunkCount === 0) {
          setRouterData(undefined);
          return;
        }

        // Fetch chunks in batches
        const client = getPublicClient({ chainId });
        if (!client) {
          throw new Error(`Chain not found for chainId: ${chainId}`);
        }

        const allChunks: string[] = [];
        for (let start = 0; start < Number(chunkCount); start += BATCH_SIZE) {
          const end = Math.min(start + BATCH_SIZE, Number(chunkCount));
          const batch = (await readContract(client, {
            abi: CHUNKED_STORAGE_CONTRACT.abi,
            address: CHUNKED_STORAGE_CONTRACT.address,
            functionName: "getChunks",
            args: [storageKeyBytes!, operatorAddress, start, end],
          })) as string[];
          allChunks.push(...batch);
        }

        // Assemble chunks
        const assembledString = assembleChunks(allChunks);

        // assembleChunks returns plain string (converted via hexToString internally) - handle based on outputFormat
        if (assembledString === undefined) {
          setRouterData(undefined);
        } else {
          if (outputAsString) {
            // assembleChunks already returns plain string
            setRouterData({ text, value: assembledString });
          } else {
            // Convert plain string to hex for hex output format
            const hexData = stringToHex(assembledString) as `0x${string}`;
            setRouterData({ text, value: hexData });
          }
        }
      } catch (error) {
        setRouterChunkError(error as Error);
      } finally {
        setRouterChunkLoading(false);
      }
    }

    processRouterResult();
  }, [
    routerHook.data,
    routerHook.isLoading,
    routerHook.error,
    operatorAddress,
    chainId,
    storageKeyBytes,
    outputAsString,
  ]);

  // Latest version: use Storage.get() directly (when router is disabled)
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
      enabled:
        !shouldUseRouter &&
        enabled &&
        !!operatorAddress &&
        !!key &&
        isLatestVersion,
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
              // assembleChunks returns plain string - convert to hex first, then apply outputFormat
              const hexData = stringToHex(assembledData) as `0x${string}`;
              setHistoricalData(formatData(text, hexData));
              setHistoricalLoading(false);
              return;
            }
          }
        } catch (chunkedError) {
          // Chunked storage failed, continue to regular storage
        }

        // Step 2: Try regular Storage.getValueAtIndex
        const result = await readContract(client, {
          abi: STORAGE_CONTRACT.abi,
          address: STORAGE_CONTRACT.address,
          functionName: "getValueAtIndex",
          args: [storageKeyBytes, operatorAddress, index],
        });

        const [text, data] = result as [string, `0x${string}`];
        // Guard: ensure data exists before formatting
        if (!data || typeof data !== "string") {
          setHistoricalData(undefined);
          setHistoricalLoading(false);
          return;
        }
        // Apply outputFormat to historical data
        setHistoricalData(formatData(text, data));
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
  }, [
    chainId,
    key,
    operatorAddress,
    index,
    enabled,
    isLatestVersion,
    outputAsString,
  ]);

  // Return appropriate data based on version type
  if (!isLatestVersion) {
    return {
      data: historicalData,
      isLoading: historicalLoading,
      error: historicalError,
    };
  }

  if (shouldUseRouter) {
    return {
      data: routerData,
      isLoading: routerHook.isLoading || routerChunkLoading,
      error: routerHook.error || routerChunkError,
    };
  }

  // Apply outputFormat to direct storage data
  // latestData is a tuple [string, string] from the contract, not a StorageData object
  const formattedDirectData = latestData
    ? (() => {
        const result = latestData as [string, `0x${string}`];
        const [text, valueHex] = result;
        // Guard: ensure valueHex exists before formatting
        if (!valueHex || typeof valueHex !== "string") {
          return undefined;
        }
        return formatData(text, valueHex);
      })()
    : undefined;

  return {
    data: formattedDirectData,
    isLoading: latestLoading,
    error: latestError as Error | undefined,
  };
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
  outputFormat = "hex",
}: UseStorageOptions) {
  const storageKeyBytes = key
    ? (getStorageKeyBytes(key, keyFormat) as `0x${string}`)
    : undefined;
  const outputAsString = outputFormat === "string";
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
    data: data
      ? (() => {
          const [text, valueHex] = data as [string, `0x${string}`];
          return {
            text,
            value: outputAsString ? hexToString(valueHex) : valueHex,
          };
        })()
      : undefined,
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
