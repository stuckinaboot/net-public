import React from "react";
import { Box, Text, useStdout } from "ink";
import type { NetMessage } from "@net-protocol/feeds";
import type { CommentWithDepth } from "../hooks";

interface CommentTreeProps {
  post: NetMessage;
  comments: CommentWithDepth[];
  replyCounts: Map<string, number>;
  selectedIndex: number; // 0 = post, 1+ = comments
  loading: boolean;
  error: Error | null;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

/** Truncate text for comment display, preserving some line breaks */
function truncateText(text: string, maxLength = 500): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength - 3) + "...";
}

/** Split text into lines, accounting for terminal width wrapping */
function getTextLines(text: string, width: number): string[] {
  const lines: string[] = [];
  const rawLines = text.split("\n");

  for (const rawLine of rawLines) {
    if (rawLine.length === 0) {
      lines.push("");
    } else if (rawLine.length <= width) {
      lines.push(rawLine);
    } else {
      // Wrap long lines
      let remaining = rawLine;
      while (remaining.length > 0) {
        lines.push(remaining.slice(0, width));
        remaining = remaining.slice(width);
      }
    }
  }

  return lines;
}

export function CommentTree({
  post,
  comments,
  replyCounts,
  selectedIndex,
  loading,
  error,
}: CommentTreeProps) {
  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows ?? 24;
  const terminalWidth = stdout?.columns ?? 80;

  // Reserve lines for header, status bar, padding
  const reservedLines = 6;
  const availableHeight = terminalHeight - reservedLines;

  // selectedIndex: 0 = post, 1+ = comments (comment index = selectedIndex - 1)
  const isPostSelected = selectedIndex === 0;
  const selectedCommentIndex = selectedIndex - 1;

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">Loading post...</Text>
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

  // Calculate post content - leave room for selector prefix "▶ " (2 chars) and left margin
  const contentWidth = Math.max(40, terminalWidth - 8);
  const postText = post.text ?? "";
  const postLines = getTextLines(postText, contentWidth);

  const linesPerComment = 3;

  // Determine how many post lines to show based on selection
  // When post is selected, show more of the post; when comment selected, show less
  const maxPostLines = isPostSelected
    ? Math.max(3, availableHeight - 6) // Leave room for header, metadata, comments header, some comments
    : 3; // Show preview when viewing comments

  const displayPostLines = postLines.slice(0, maxPostLines);
  const postHasMore = postLines.length > maxPostLines;

  // Calculate comment viewport
  // Reserve: Post header (1) + post lines + post metadata (1) + post "more" indicator (1 if needed)
  //        + Comments header (1) + scroll indicators (2)
  const postOverhead = 1 + displayPostLines.length + 1 + (postHasMore ? 1 : 0) + 1 + 2;
  const linesForComments = Math.max(3, availableHeight - postOverhead);
  const visibleCommentCount = Math.floor(linesForComments / linesPerComment);

  // Calculate comment window to keep selected comment visible
  let commentStartIndex = 0;
  if (selectedCommentIndex > 0) {
    // Keep selected comment in view (only scroll when a comment is actually selected)
    commentStartIndex = Math.max(0, selectedCommentIndex - Math.floor(visibleCommentCount / 2));
    if (commentStartIndex + visibleCommentCount > comments.length) {
      commentStartIndex = Math.max(0, comments.length - visibleCommentCount);
    }
  }
  // When post is selected (selectedCommentIndex = -1), start from beginning
  const commentEndIndex = Math.min(commentStartIndex + visibleCommentCount, comments.length);
  const visibleComments = comments.slice(commentStartIndex, commentEndIndex);

  const hasMoreCommentsAbove = commentStartIndex > 0;
  const hasMoreCommentsBelow = commentEndIndex < comments.length;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Post section */}
      <Text bold color="cyan">Post</Text>
      <Box marginLeft={1}>
        <Text color={isPostSelected ? "green" : undefined} bold={isPostSelected}>
          {isPostSelected ? "▶ " : "  "}
        </Text>
        <Box flexDirection="column" width={contentWidth}>
          {displayPostLines.length === 0 ? (
            <Text color="gray">(no text)</Text>
          ) : (
            displayPostLines.map((line, i) => (
              <Text key={i} color={isPostSelected ? "green" : undefined} wrap="truncate-end">
                {line || " "}
              </Text>
            ))
          )}
          {postHasMore && (
            <Text color="gray" dimColor>
              {isPostSelected ? "↓ " : "↑ "}{postLines.length - maxPostLines} more lines
            </Text>
          )}
        </Box>
      </Box>
      <Text color="gray">
        {"   "}{truncateAddress(post.sender)} · {formatTimestamp(post.timestamp)}
      </Text>

      {/* Comments section */}
      <Box marginTop={1}>
        <Text bold color="cyan">Comments ({comments.length})</Text>
      </Box>

      {comments.length === 0 ? (
        <Box marginTop={1} marginLeft={1}>
          <Text color="gray">No comments yet</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {hasMoreCommentsAbove && (
            <Text color="gray" dimColor>
              {"    ↑ "}{commentStartIndex} more above
            </Text>
          )}
          {visibleComments.map((item, index) => {
            const actualIndex = commentStartIndex + index;
            const isSelected = actualIndex === selectedCommentIndex;
            const { comment, depth } = item;
            const key = `${comment.sender}:${comment.timestamp}`;
            const replyCount = replyCounts.get(key) ?? 0;
            const displayText = comment.text ? truncateText(comment.text) : null;

            // Indentation based on nesting depth
            const indent = "  ".repeat(depth);
            const replyIndicator = depth > 0 ? "↳ " : "";

            return (
              <Box
                key={key}
                flexDirection="column"
                marginLeft={1}
                marginBottom={1}
              >
                <Text
                  color={isSelected ? "green" : undefined}
                  bold={isSelected}
                >
                  {indent}{isSelected ? "▶ " : "  "}{replyIndicator}
                  {displayText || <Text color="gray" dimColor>(no text)</Text>}
                </Text>
                <Text color="gray">
                  {indent}{"    "}
                  {truncateAddress(comment.sender)} · {formatTimestamp(comment.timestamp)}
                  {replyCount > 0 && ` · ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
                </Text>
              </Box>
            );
          })}
          {hasMoreCommentsBelow && (
            <Text color="gray" dimColor>
              {"    ↓ "}{comments.length - commentEndIndex} more below
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
