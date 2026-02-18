import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { UPVOTE_APP, ALL_STRATEGY_ADDRESSES } from "../constants";
import { getScoreKey } from "../utils/scoreKeyUtils";
import type { UseUpvotesBatchOptions } from "../types";

/**
 * React hook for fetching upvote counts for multiple ScoreItems in a single contract call.
 * Uses UpvoteApp.getUpvotesWithLegacy with batched score keys.
 *
 * @param options - Batch upvote query options
 * @param options.chainId - Chain ID to query
 * @param options.items - Array of ScoreItems (token, storage, or feed) to get counts for
 * @param options.strategies - Strategy addresses to include (default: all strategies)
 * @param options.enabled - Whether the query is enabled (default: true)
 * @returns Object with upvoteCounts array, isLoading, error, and refetch
 *
 * @example
 * ```tsx
 * const { upvoteCounts, isLoading } = useUpvotesBatch({
 *   chainId: 8453,
 *   items: [
 *     { type: "token", tokenAddress: "0x..." },
 *     { type: "storage", operatorAddress: "0x...", storageKey: "my-key" },
 *   ],
 * });
 * ```
 */
export function useUpvotesBatch({
  chainId,
  items,
  strategies = ALL_STRATEGY_ADDRESSES,
  enabled = true,
}: UseUpvotesBatchOptions) {
  const scoreKeys = useMemo(
    () => items.map((item) => getScoreKey(item)),
    [items]
  );

  const { data, isLoading, error, refetch } = useReadContract({
    address: UPVOTE_APP.address,
    abi: UPVOTE_APP.abi,
    functionName: "getUpvotesWithLegacy",
    args: [scoreKeys, strategies],
    chainId,
    query: { enabled: enabled && scoreKeys.length > 0 },
  });

  return {
    upvoteCounts: Array.isArray(data) ? (data as bigint[]).map(Number) : [],
    isLoading,
    error,
    refetch,
  };
}
