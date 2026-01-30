import { useMemo } from "react";
import { useNetMessageCount } from "@net-protocol/core/react";
import { NULL_ADDRESS } from "@net-protocol/core";
import { getCommentTopic } from "../utils/commentUtils";
import type { UseCommentCountOptions } from "../types";

/**
 * React hook for fetching the comment count for a single post.
 *
 * @param options - Comment count options
 * @param options.chainId - Chain ID to query
 * @param options.post - The post to get comment count for
 * @param options.enabled - Whether the query is enabled (default: true)
 * @returns Object with count and isLoading
 *
 * @example
 * ```tsx
 * const { count, isLoading } = useCommentCount({
 *   chainId: 8453,
 *   post: feedPost,
 * });
 * ```
 */
export function useCommentCount({
  chainId,
  post,
  enabled = true,
}: UseCommentCountOptions) {
  // Get the comment topic for this post
  const commentTopic = useMemo(() => getCommentTopic(post), [post]);

  // Build filter for comments
  const filter = useMemo(
    () => ({
      appAddress: NULL_ADDRESS as `0x${string}`,
      topic: commentTopic,
    }),
    [commentTopic]
  );

  // Get comment count
  const { count, isLoading } = useNetMessageCount({
    chainId,
    filter,
    enabled,
  });

  return {
    count,
    isLoading,
  };
}
