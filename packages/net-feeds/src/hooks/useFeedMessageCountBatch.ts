import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { NULL_ADDRESS } from "@net-protocol/core";
import { normalizeFeedTopic } from "../utils/feedUtils";
import { TOPIC_COUNT_BULK_HELPER_CONTRACT } from "../constants";

export interface UseFeedMessageCountBatchOptions {
  chainId: number;
  feedNames: string[];
  enabled?: boolean;
}

/**
 * React hook for efficiently fetching message counts for multiple feeds in a single RPC call.
 *
 * Uses the TopicCountBulkHelper contract to batch all feed count queries into a single call.
 * This matches the pattern used by FeedClient.getCommentCountBatch().
 *
 * @param options - Batch feed count options
 * @param options.chainId - Chain ID to query
 * @param options.feedNames - Array of feed names to get message counts for
 * @param options.enabled - Whether the query is enabled (default: true)
 * @returns Object with counts Map (feedName -> count), isLoading, and error
 *
 * @example
 * ```tsx
 * const { counts, isLoading } = useFeedMessageCountBatch({
 *   chainId: 8453,
 *   feedNames: ["crypto", "gaming", "music"],
 * });
 *
 * // Get count for a specific feed
 * const count = counts.get("crypto") ?? 0;
 * ```
 */
export function useFeedMessageCountBatch({
  chainId,
  feedNames,
  enabled = true,
}: UseFeedMessageCountBatchOptions) {
  // Normalize feed names to topics (add "feed-" prefix)
  const topics = useMemo(
    () => feedNames.map((feedName) => normalizeFeedTopic(feedName)),
    [feedNames]
  );

  // Use TopicCountBulkHelper to fetch all counts in a single RPC call
  const { data, isLoading, error, refetch } = useReadContract({
    abi: TOPIC_COUNT_BULK_HELPER_CONTRACT.abi,
    address: TOPIC_COUNT_BULK_HELPER_CONTRACT.address,
    functionName: "getMessageCountsForTopics",
    args: [NULL_ADDRESS, topics],
    chainId,
    query: {
      enabled: enabled && feedNames.length > 0,
    },
  });

  // Build a Map from feed name to count for easy lookup
  const counts = useMemo(() => {
    const map = new Map<string, number>();

    if (!data) {
      return map;
    }

    const countsArray = data as bigint[];
    feedNames.forEach((feedName, index) => {
      map.set(feedName, Number(countsArray[index] ?? 0));
    });

    return map;
  }, [data, feedNames]);

  return {
    counts,
    isLoading,
    error: error as Error | undefined,
    refetch,
  };
}
