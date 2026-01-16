import { useMemo } from "react";
import {
  useNetMessages,
  useNetMessageCount,
  NULL_ADDRESS,
} from "@net-protocol/core";
import { normalizeFeedTopic } from "../utils/feedUtils";
import type { UseFeedPostsOptions } from "../types";

/**
 * React hook for fetching posts from a feed topic.
 * Compatible with useTopicFeed API - returns same shape without error field.
 *
 * @param options - Feed posts options
 * @param options.chainId - Chain ID to query
 * @param options.topic - Topic name (will be auto-prefixed with "feed-" if not already present)
 * @param options.maxMessages - Maximum number of messages to fetch (default: 50)
 * @param options.enabled - Whether the query is enabled (default: true)
 * @param options.sender - Optional sender address to filter by
 * @returns Object with posts, totalCount, and isLoading
 *
 * @example
 * ```tsx
 * const { posts, totalCount, isLoading } = useFeedPosts({
 *   chainId: 8453,
 *   topic: "crypto", // Auto-prefixed to "feed-crypto"
 *   maxMessages: 50,
 *   sender: "0x123...", // Optional: only show posts from this address
 * });
 * ```
 */
export function useFeedPosts({
  chainId,
  topic,
  maxMessages = 50,
  enabled = true,
  sender,
}: UseFeedPostsOptions) {
  // Normalize topic (idempotent - safe to call multiple times)
  const normalizedTopic = useMemo(
    () => normalizeFeedTopic(topic),
    [topic]
  );

  // Build filter with optional sender
  const filter = useMemo(() => {
    const baseFilter = {
      appAddress: NULL_ADDRESS as `0x${string}`,
      topic: normalizedTopic,
    };
    if (sender) {
      return {
        ...baseFilter,
        maker: sender as `0x${string}`,
      };
    }
    return baseFilter;
  }, [normalizedTopic, sender]);

  // Get total message count for this feed
  const { count: totalCount, isLoading: isLoadingCount } =
    useNetMessageCount({
      chainId,
      filter,
      enabled,
    });

  // Calculate pagination (get last maxMessages posts)
  // Handle maxMessages = 0 specially (should return empty array)
  const startIndex =
    maxMessages === 0
      ? totalCount
      : totalCount > maxMessages
      ? totalCount - maxMessages
      : 0;

  // Get messages (only if enabled and count > 0)
  const { messages, isLoading: isLoadingMessages } = useNetMessages({
    chainId,
    filter,
    startIndex,
    endIndex: totalCount,
    enabled: enabled && totalCount > 0, // Guard to prevent query when no messages
  });

  return {
    posts: messages,
    totalCount,
    isLoading: isLoadingCount || isLoadingMessages,
    // Note: No error field returned (matches useTopicFeed API)
  };
}
