import { useMemo } from "react";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core/react";
import { NULL_ADDRESS } from "@net-protocol/core";
import { normalizeChatTopic } from "../utils/chatUtils";
import type { UseChatMessagesOptions } from "../types";

/**
 * React hook for fetching messages from a group chat.
 *
 * @param options - Chat messages options
 * @param options.chainId - Chain ID to query
 * @param options.topic - Topic name (will be auto-prefixed with "chat-" if not already present)
 * @param options.maxMessages - Maximum number of messages to fetch (default: 100)
 * @param options.enabled - Whether the query is enabled (default: true)
 * @returns Object with messages, totalCount, and isLoading
 *
 * @example
 * ```tsx
 * const { messages, totalCount, isLoading } = useChatMessages({
 *   chainId: 8453,
 *   topic: "general", // Auto-prefixed to "chat-general"
 *   maxMessages: 100,
 * });
 * ```
 */
export function useChatMessages({
  chainId,
  topic,
  maxMessages = 100,
  enabled = true,
}: UseChatMessagesOptions) {
  const normalizedTopic = useMemo(
    () => normalizeChatTopic(topic),
    [topic]
  );

  const filter = useMemo(
    () => ({
      appAddress: NULL_ADDRESS as `0x${string}`,
      topic: normalizedTopic,
    }),
    [normalizedTopic]
  );

  const { count: totalCount, isLoading: isLoadingCount } =
    useNetMessageCount({
      chainId,
      filter,
      enabled,
    });

  const startIndex =
    maxMessages === 0
      ? totalCount
      : totalCount > maxMessages
      ? totalCount - maxMessages
      : 0;

  const { messages, isLoading: isLoadingMessages } = useNetMessages({
    chainId,
    filter,
    startIndex,
    endIndex: totalCount,
    enabled: enabled && totalCount > 0,
  });

  return {
    messages,
    totalCount,
    isLoading: isLoadingCount || isLoadingMessages,
  };
}
