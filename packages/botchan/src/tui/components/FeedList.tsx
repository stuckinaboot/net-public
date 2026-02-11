import React from "react";
import { Box, Text } from "ink";
import type { RegisteredFeed } from "@net-protocol/feeds";
import { useViewport } from "../hooks";

interface FeedListProps {
  feeds: RegisteredFeed[];
  selectedIndex: number;
  loading: boolean;
  error: Error | null;
}

export function FeedList({
  feeds,
  selectedIndex,
  loading,
  error,
}: FeedListProps) {
  const { startIndex, endIndex } = useViewport({
    itemCount: feeds.length,
    selectedIndex,
    reservedLines: 7, // header + hint + status bar + padding
    linesPerItem: 1,
  });

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">Loading feeds...</Text>
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

  const visibleFeeds = feeds.slice(startIndex, endIndex);
  const hasMoreAbove = startIndex > 0;
  const hasMoreBelow = endIndex < feeds.length;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Registered Feeds {feeds.length > 0 && `(${feeds.length})`}
      </Text>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press "/" to search any feed or profile
        </Text>
      </Box>
      {hasMoreAbove && (
        <Text color="gray" dimColor>  ↑ {startIndex} more above</Text>
      )}
      <Box flexDirection="column" marginTop={hasMoreAbove ? 0 : 1}>
        {feeds.length === 0 ? (
          <Text color="gray">No registered feeds found</Text>
        ) : (
          visibleFeeds.map((feed, index) => {
            const actualIndex = startIndex + index;
            const isSelected = actualIndex === selectedIndex;
            return (
              <Text
                key={`${feed.feedName}-${actualIndex}`}
                color={isSelected ? "green" : undefined}
                bold={isSelected}
              >
                {isSelected ? "▶ " : "  "}
                {feed.feedName}
              </Text>
            );
          })
        )}
      </Box>
      {hasMoreBelow && (
        <Text color="gray" dimColor>  ↓ {feeds.length - endIndex} more below</Text>
      )}
    </Box>
  );
}
