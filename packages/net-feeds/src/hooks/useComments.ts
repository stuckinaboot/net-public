import { useMemo } from "react";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core/react";
import { NULL_ADDRESS } from "@net-protocol/core";
import {
  getCommentTopic,
  parseCommentData,
} from "../utils/commentUtils";
import { MAX_COMMENT_NESTING_DEPTH } from "../constants";
import type {
  UseCommentsOptions,
  NetMessage,
  CommentWithReplies,
} from "../types";

/**
 * Builds a tree structure from flat comments using replyTo references.
 * Comments without replyTo are top-level; comments with replyTo are nested.
 *
 * @param comments - Flat array of comment messages
 * @returns Array of top-level comments with nested replies
 */
function buildCommentTree(comments: NetMessage[]): CommentWithReplies[] {
  // Create a map for quick lookup by sender+timestamp (unique identifier)
  const commentMap = new Map<string, CommentWithReplies>();

  // First pass: create CommentWithReplies for each comment
  for (const comment of comments) {
    const key = `${comment.sender}-${comment.timestamp}`;
    commentMap.set(key, {
      ...comment,
      replies: [],
      depth: 0,
    });
  }

  // Separate top-level comments and replies
  const topLevel: CommentWithReplies[] = [];

  // Second pass: build the tree
  for (const comment of comments) {
    const key = `${comment.sender}-${comment.timestamp}`;
    const commentWithReplies = commentMap.get(key)!;
    const commentData = parseCommentData(comment.data);

    if (!commentData?.replyTo) {
      // Top-level comment
      commentWithReplies.depth = 0;
      topLevel.push(commentWithReplies);
    } else {
      // Reply to another comment
      const parentKey = `${commentData.replyTo.sender}-${commentData.replyTo.timestamp}`;
      const parent = commentMap.get(parentKey);

      if (parent) {
        // Calculate depth, capping at max depth
        const newDepth = Math.min(parent.depth + 1, MAX_COMMENT_NESTING_DEPTH - 1);
        commentWithReplies.depth = newDepth;

        // If parent is at max depth, attach as sibling to max depth level
        if (parent.depth >= MAX_COMMENT_NESTING_DEPTH - 1) {
          // Find the top-level ancestor and attach there as a reply
          // This flattens replies beyond max depth
          parent.replies.push(commentWithReplies);
        } else {
          parent.replies.push(commentWithReplies);
        }
      } else {
        // Parent not found - treat as top-level
        commentWithReplies.depth = 0;
        topLevel.push(commentWithReplies);
      }
    }
  }

  // Sort top-level by timestamp (oldest first for chat-like ordering)
  topLevel.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  // Recursively sort replies
  function sortReplies(comment: CommentWithReplies) {
    comment.replies.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    comment.replies.forEach(sortReplies);
  }

  topLevel.forEach(sortReplies);

  return topLevel;
}

/**
 * React hook for fetching comments for a post with tree building.
 *
 * @param options - Comments options
 * @param options.chainId - Chain ID to query
 * @param options.post - The post to get comments for
 * @param options.maxComments - Maximum number of comments to fetch (default: 50)
 * @param options.enabled - Whether the query is enabled (default: true)
 * @returns Object with comments tree, totalCount, and isLoading
 *
 * @example
 * ```tsx
 * const { comments, totalCount, isLoading } = useComments({
 *   chainId: 8453,
 *   post: feedPost,
 * });
 *
 * // comments is a tree structure with nested replies
 * comments.forEach(comment => {
 *   console.log(comment.text, comment.depth, comment.replies.length);
 * });
 * ```
 */
export function useComments({
  chainId,
  post,
  maxComments = 50,
  enabled = true,
}: UseCommentsOptions) {
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

  // Get total comment count
  const { count: totalCount, isLoading: isLoadingCount } = useNetMessageCount({
    chainId,
    filter,
    enabled,
  });

  // Calculate pagination (get last maxComments comments)
  const startIndex =
    maxComments === 0
      ? totalCount
      : totalCount > maxComments
        ? totalCount - maxComments
        : 0;

  // Get comment messages
  const { messages, isLoading: isLoadingMessages } = useNetMessages({
    chainId,
    filter,
    startIndex,
    endIndex: totalCount,
    enabled: enabled && totalCount > 0,
  });

  // Build the comment tree
  const comments = useMemo(
    () => buildCommentTree(messages),
    [messages]
  );

  return {
    comments,
    totalCount,
    isLoading: isLoadingCount || isLoadingMessages,
  };
}
