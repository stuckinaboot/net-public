import { useReadContract } from "wagmi";
import { UPVOTE_APP, ALL_STRATEGY_ADDRESSES } from "../constants";
import type { UseUpvotesOptions } from "../types";

/**
 * React hook for fetching the upvote count for a single score key.
 * Uses UpvoteApp.getUpvotesWithLegacy, which aggregates across legacy contracts and strategies.
 *
 * @param options - Upvote query options
 * @param options.chainId - Chain ID to query
 * @param options.scoreKey - The bytes32 score key to look up
 * @param options.strategies - Strategy addresses to include (default: all strategies)
 * @param options.enabled - Whether the query is enabled (default: true)
 * @returns Object with upvotes count, isLoading, error, and refetch
 *
 * @example
 * ```tsx
 * const { upvotes, isLoading } = useUpvotes({
 *   chainId: 8453,
 *   scoreKey: getTokenScoreKey(tokenAddress),
 * });
 * ```
 */
export function useUpvotes({
  chainId,
  scoreKey,
  strategies = ALL_STRATEGY_ADDRESSES,
  enabled = true,
}: UseUpvotesOptions) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: UPVOTE_APP.address,
    abi: UPVOTE_APP.abi,
    functionName: "getUpvotesWithLegacy",
    args: [[scoreKey], strategies],
    chainId,
    query: { enabled },
  });

  return {
    upvotes: Array.isArray(data) && data.length > 0 ? Number(data[0]) : 0,
    isLoading,
    error,
    refetch,
  };
}
