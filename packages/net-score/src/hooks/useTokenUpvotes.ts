import { useMemo } from "react";
import { useUpvotes } from "./useUpvotes";
import { getTokenScoreKey } from "../utils/scoreKeyUtils";
import type { UseTokenUpvotesOptions } from "../types";

/**
 * Convenience React hook for fetching upvotes for a single token address.
 * Wraps useUpvotes with automatic token score key generation.
 *
 * @param options - Token upvote query options
 * @param options.chainId - Chain ID to query
 * @param options.tokenAddress - The token contract address
 * @param options.enabled - Whether the query is enabled (default: true)
 * @returns Object with upvotes count, isLoading, error, and refetch
 *
 * @example
 * ```tsx
 * const { upvotes, isLoading } = useTokenUpvotes({
 *   chainId: 8453,
 *   tokenAddress: "0x...",
 * });
 * ```
 */
export function useTokenUpvotes({
  chainId,
  tokenAddress,
  enabled = true,
}: UseTokenUpvotesOptions) {
  const scoreKey = useMemo(
    () => getTokenScoreKey(tokenAddress),
    [tokenAddress]
  );

  return useUpvotes({ chainId, scoreKey, enabled });
}
