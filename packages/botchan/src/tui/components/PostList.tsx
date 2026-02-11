import React from "react";
import { Box, Text } from "ink";
import type { NetMessage } from "@net-protocol/feeds";
import { useViewport } from "../hooks";

interface PostListProps {
  feedName: string;
  posts: NetMessage[];
  commentCounts: Map<string, number>;
  selectedIndex: number;
  loading: boolean;
  error: Error | null;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isAddress(str: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(str);
}

function formatFeedName(feedName: string): string {
  // Strip "feed-" prefix if present
  let name = feedName;
  if (name.startsWith("feed-")) {
    name = name.slice(5);
  }
  // If it's an address, truncate it
  if (isAddress(name)) {
    return `@${truncateAddress(name)}`;
  }
  return name;
}

function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Parse post text into title (first line) and body (rest) */
function parsePostContent(text: string | undefined): { title: string; body: string | null } {
  if (!text) return { title: "", body: null };

  const firstNewline = text.indexOf("\n");
  if (firstNewline === -1) {
    // No newline - entire text is title
    return { title: text.trim(), body: null };
  }

  const title = text.slice(0, firstNewline).trim();
  const body = text.slice(firstNewline + 1).trim();

  return { title, body: body || null };
}

/** Truncate text for post display, preserving wrapping */
function truncateText(text: string, maxLength = 250): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength - 3) + "...";
}

export function PostList({
  feedName,
  posts,
  commentCounts,
  selectedIndex,
  loading,
  error,
}: PostListProps) {
  const { startIndex, endIndex } = useViewport({
    itemCount: posts.length,
    selectedIndex,
    reservedLines: 6, // header + status bar + padding
    linesPerItem: 3, // title + metadata + margin
  });

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">Loading posts...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Error: {error.message}</Text>
      </Box>
    );
  }

  if (posts.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="gray">No posts in {formatFeedName(feedName)}</Text>
      </Box>
    );
  }

  const visiblePosts = posts.slice(startIndex, endIndex);
  const hasMoreAbove = startIndex > 0;
  const hasMoreBelow = endIndex < posts.length;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        {formatFeedName(feedName)} ({posts.length} posts)
      </Text>
      {hasMoreAbove && (
        <Text color="gray" dimColor>  ↑ {startIndex} more above</Text>
      )}
      <Box flexDirection="column" marginTop={hasMoreAbove ? 0 : 1}>
        {visiblePosts.map((post, index) => {
          const actualIndex = startIndex + index;
          const isSelected = actualIndex === selectedIndex;
          const postKey = `${post.sender}:${post.timestamp}`;
          const commentCount = commentCounts.get(postKey) ?? 0;
          const { title, body } = parsePostContent(post.text);
          const displayTitle = title ? truncateText(title) : null;
          const hasMore = body !== null;

          return (
            <Box
              key={postKey}
              flexDirection="column"
              marginBottom={1}
            >
              <Text
                color={isSelected ? "green" : undefined}
                bold={isSelected}
              >
                {isSelected ? "▶ " : "  "}
                {displayTitle || <Text color="gray" dimColor>(no text)</Text>}
                {hasMore && <Text color="gray" dimColor> [...]</Text>}
              </Text>
              <Text color="gray" dimColor>
                {"    "}
                {truncateAddress(post.sender)} · {formatTimestamp(post.timestamp)} · {commentCount} comment{commentCount !== 1 ? "s" : ""}
              </Text>
            </Box>
          );
        })}
      </Box>
      {hasMoreBelow && (
        <Text color="gray" dimColor>  ↓ {posts.length - endIndex} more below</Text>
      )}
    </Box>
  );
}
