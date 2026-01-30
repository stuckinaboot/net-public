import { useMemo } from "react";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core/react";
import { FEED_REGISTRY_CONTRACT } from "../constants";
import type { UseRegisteredFeedsOptions, RegisteredFeed } from "../types";

/**
 * React hook for fetching all registered feeds from the FeedRegistry contract.
 *
 * @param options - Options for fetching feeds
 * @param options.chainId - Chain ID to query
 * @param options.maxFeeds - Maximum number of feeds to fetch (default: 100)
 * @param options.enabled - Whether the query is enabled (default: true)
 * @returns Object with feeds, totalCount, isLoading, and refetch
 *
 * @example
 * ```tsx
 * const { feeds, totalCount, isLoading } = useRegisteredFeeds({
 *   chainId: 8453,
 *   maxFeeds: 50,
 * });
 *
 * if (isLoading) return <div>Loading feeds...</div>;
 *
 * return (
 *   <ul>
 *     {feeds.map((feed) => (
 *       <li key={feed.feedName}>
 *         {feed.feedName} - registered by {feed.registrant}
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useRegisteredFeeds({
  chainId,
  maxFeeds = 100,
  enabled = true,
}: UseRegisteredFeedsOptions) {
  // Build filter for FeedRegistry app messages
  const filter = useMemo(
    () => ({
      appAddress: FEED_REGISTRY_CONTRACT.address,
    }),
    []
  );

  // Get total count of registered feeds
  const { count: totalCount, isLoading: isLoadingCount } = useNetMessageCount({
    chainId,
    filter,
    enabled,
  });

  // Calculate pagination (get most recent feeds)
  const startIndex =
    maxFeeds === 0
      ? totalCount
      : totalCount > maxFeeds
      ? totalCount - maxFeeds
      : 0;

  // Get messages from the registry
  const {
    messages,
    isLoading: isLoadingMessages,
    refetch,
  } = useNetMessages({
    chainId,
    filter,
    startIndex,
    endIndex: totalCount,
    enabled: enabled && totalCount > 0,
  });

  // Parse messages into RegisteredFeed objects
  const feeds: RegisteredFeed[] = useMemo(() => {
    if (!messages) return [];

    return messages.map((msg) => {
      // Decode description from data field (stored as hex bytes)
      let description = "";
      if (msg.data && msg.data.length > 2) {
        try {
          // Remove 0x prefix and convert hex to bytes
          const hexString = msg.data.slice(2);
          const hexBytes = hexString.match(/.{1,2}/g);
          if (hexBytes) {
            const bytes = new Uint8Array(
              hexBytes.map((byte) => parseInt(byte, 16))
            );
            description = new TextDecoder().decode(bytes);
          }
        } catch {
          // If decoding fails, leave description empty
        }
      }

      return {
        feedName: msg.topic, // Feed name is stored as the topic
        registrant: msg.sender,
        description,
        timestamp: Number(msg.timestamp),
      };
    });
  }, [messages]);

  return {
    feeds,
    totalCount,
    isLoading: isLoadingCount || isLoadingMessages,
    refetch,
  };
}
