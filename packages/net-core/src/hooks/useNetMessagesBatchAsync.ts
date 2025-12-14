import { useEffect, useState, useMemo } from "react";
import { UseNetMessagesBatchAsyncOptions, NetMessage } from "../types";
import { getNetMessagesReadConfig } from "../client/messages";
import { getPublicClient } from "../chainConfig";
import { readContract } from "viem/actions";

export function useNetMessagesBatchAsync(
  params: UseNetMessagesBatchAsyncOptions
) {
  const {
    startIndex = 0,
    endIndex,
    chainId,
    batchCount = 4,
    filter,
    enabled,
  } = params;

  const [messages, setMessages] = useState<NetMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Compute batch ranges
  const batchRanges = useMemo(() => {
    if (endIndex === undefined || endIndex < startIndex) return [];
    const total = endIndex - startIndex;
    const batchSize = Math.ceil(total / batchCount);
    const numBatches = Math.ceil(total / batchSize);
    const ranges: [number, number][] = [];
    for (let i = 0; i < numBatches; i++) {
      const batchStart = startIndex + i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, endIndex);
      ranges.push([batchStart, batchEnd]);
    }
    return ranges;
  }, [startIndex, endIndex, batchCount]);

  // Get configs for each batch
  const configs = useMemo(() => {
    return batchRanges.map(([batchStart, batchEnd]) =>
      getNetMessagesReadConfig({
        filter,
        chainId,
        startIndex: batchStart,
        endIndex: batchEnd,
      })
    );
  }, [batchRanges, filter, chainId]);

  useEffect(() => {
    if (!enabled) {
      setMessages([]);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    let cancelled = false;
    async function fetchAll() {
      setIsLoading(true);
      setError(undefined);
      setMessages([]);
      
      try {
        const client = getPublicClient({ chainId });
        const all: NetMessage[] = [];
        
        for (const config of configs) {
          const batch = await readContract(client, config);
          if (Array.isArray(batch)) {
            all.push(...(batch as NetMessage[]));
          }
          if (cancelled) return;
        }
        
        setMessages(all);
        setIsLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setIsLoading(false);
        }
      }
    }
    
    if (configs.length > 0) {
      fetchAll();
    }
    
    return () => {
      cancelled = true;
    };
  }, [configs, chainId, enabled]);

  return { messages, isLoading, error };
}

