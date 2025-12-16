import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { decodeAbiParameters, stringToHex } from "viem";
import { STORAGE_ROUTER_CONTRACT } from "../constants";
import { CHUNKED_STORAGE_CONTRACT } from "../constants";
import { getPublicClient } from "@net-protocol/core";
import { readContract } from "viem/actions";
import { assembleChunks } from "../utils/chunkUtils";
import type { UseStorageFromRouterOptions, StorageData } from "../types";

const BATCH_SIZE = 2;

/**
 * Generic hook to fetch storage content from StorageRouter
 * Handles both regular storage and chunked storage seamlessly
 * Works for any storage key (not just canvases)
 */
export function useStorageFromRouter({
  chainId,
  storageKey,
  operatorAddress,
  enabled = true,
}: UseStorageFromRouterOptions) {
  const [assembledData, setAssembledData] = useState<StorageData | undefined>();
  const [isChunkLoading, setIsChunkLoading] = useState(false);
  const [chunkError, setChunkError] = useState<Error | undefined>();

  // Step 1: Get initial data from StorageRouter
  const {
    data: routerResult,
    isLoading: routerLoading,
    error: routerError,
  } = useReadContract({
    abi: STORAGE_ROUTER_CONTRACT.abi,
    address: STORAGE_ROUTER_CONTRACT.address,
    functionName: "get",
    args: [storageKey, operatorAddress],
    chainId,
    query: {
      enabled: enabled && !!operatorAddress,
    },
  });

  // Step 2: Process the result
  useEffect(() => {
    async function processResult() {
      if (!routerResult || routerLoading || routerError) {
        return;
      }

      const [isChunkedStorage, text, data] = routerResult as [
        boolean,
        string,
        `0x${string}`
      ];

      // Handle non-chunked data (early return)
      if (!isChunkedStorage) {
        setAssembledData({ text, value: data });
        return;
      }

      // Handle chunked data
      setIsChunkLoading(true);
      setChunkError(undefined);

      try {
        // Decode chunk count from the data
        const [chunkCount] = decodeAbiParameters([{ type: "uint8" }], data);

        if (chunkCount === 0) {
          setAssembledData(undefined);
          return;
        }

        // Fetch chunks in batches
        const allChunks = await fetchChunksInBatches(
          Number(chunkCount),
          operatorAddress,
          chainId,
          storageKey
        );

        // Assemble chunks
        const assembledString = assembleChunks(allChunks);

        if (assembledString === undefined) {
          setAssembledData(undefined);
        } else {
          // assembleChunks returns plain string, convert to hex for StorageData format
          const hexData = stringToHex(assembledString) as `0x${string}`;
          setAssembledData({ text, value: hexData });
        }
      } catch (error) {
        setChunkError(error as Error);
      } finally {
        setIsChunkLoading(false);
      }
    }

    processResult();
  }, [
    routerResult,
    routerLoading,
    routerError,
    operatorAddress,
    chainId,
    storageKey,
  ]);

  return {
    data: assembledData,
    isLoading: routerLoading || isChunkLoading,
    error: routerError || chunkError,
  };
}

/**
 * Fetch chunks in batches using getChunks
 */
async function fetchChunksInBatches(
  chunkCount: number,
  operatorAddress: string,
  chainId: number,
  storageKey: `0x${string}`
): Promise<string[]> {
  const client = getPublicClient({ chainId });
  if (!client) {
    throw new Error(`Chain not found for chainId: ${chainId}`);
  }

  const allChunks: string[] = [];

  for (let start = 0; start < chunkCount; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, chunkCount);

    const batch = (await readContract(client, {
      abi: CHUNKED_STORAGE_CONTRACT.abi,
      address: CHUNKED_STORAGE_CONTRACT.address,
      functionName: "getChunks",
      args: [storageKey, operatorAddress, start, end],
    })) as string[];

    allChunks.push(...batch);
  }
  return allChunks;
}
