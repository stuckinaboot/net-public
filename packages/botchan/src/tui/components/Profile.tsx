import React from "react";
import { Box, Text } from "ink";
import { useViewport } from "../hooks";
import type { ProfileMessage } from "../hooks";

interface ProfileProps {
  address: string;
  activityMessages: ProfileMessage[];
  loading: boolean;
  error: Error | null;
  selectedIndex: number; // 0 = "Their Feed" option, 1+ = Active On feeds
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Parse topic to get clean feed name (strips "feed-" prefix and comment suffix) */
function cleanFeedName(topic: string): string {
  // Remove :comments:... suffix
  let clean = topic.split(":comments:")[0];
  // Strip "feed-" prefix if present
  if (clean.startsWith("feed-")) {
    clean = clean.slice(5);
  }
  return clean;
}

/** Aggregate messages by feed for Active On view */
export interface FeedActivity {
  topic: string; // Topic for navigation (with feed- prefix)
  feedName: string; // Display name (without feed- prefix)
  postCount: number;
  lastActive: bigint;
}

export function aggregateByFeed(messages: ProfileMessage[]): FeedActivity[] {
  const feedMap = new Map<string, FeedActivity>();

  for (const { message, topic } of messages) {
    // Skip comments - only show posts in Active On
    if (topic.includes(":comments:")) {
      continue;
    }

    const feedName = cleanFeedName(topic);
    // Use feedName as key to avoid duplicates from "feed-X" vs "X"
    const existing = feedMap.get(feedName);
    if (existing) {
      existing.postCount++;
      if (message.timestamp > existing.lastActive) {
        existing.lastActive = message.timestamp;
      }
    } else {
      feedMap.set(feedName, {
        topic, // Keep original topic for navigation
        feedName,
        postCount: 1,
        lastActive: message.timestamp,
      });
    }
  }

  // Sort by most recently active
  return Array.from(feedMap.values()).sort(
    (a, b) => Number(b.lastActive - a.lastActive)
  );
}

export function Profile({
  address,
  activityMessages,
  loading,
  error,
  selectedIndex,
}: ProfileProps) {
  // Aggregate activity messages by feed
  const aggregatedFeeds = React.useMemo(
    () => aggregateByFeed(activityMessages),
    [activityMessages]
  );

  // Total items: 1 ("Their Feed" option) + aggregated feeds
  const totalItems = 1 + aggregatedFeeds.length;

  const { startIndex, endIndex } = useViewport({
    itemCount: totalItems,
    selectedIndex,
    reservedLines: 6,
    linesPerItem: 2,
  });

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">Loading profile...</Text>
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

  const hasMoreAbove = startIndex > 0;
  const hasMoreBelow = endIndex < totalItems;

  // Build visible items list
  const visibleItems: React.ReactNode[] = [];

  for (let i = startIndex; i < endIndex; i++) {
    const isSelected = i === selectedIndex;

    if (i === 0) {
      // "Their Feed" option - view posts TO this address
      visibleItems.push(
        <Box key="their-feed" flexDirection="column" marginBottom={1}>
          <Text
            color={isSelected ? "green" : undefined}
            bold={isSelected}
          >
            {isSelected ? "▶ " : "  "}
            <Text color={isSelected ? "green" : "magenta"}>@{truncateAddress(address)}</Text>
            <Text color="gray"> · view their feed</Text>
          </Text>
        </Box>
      );
    } else {
      // Active On feeds (index - 1 because first item is "Their Feed")
      const feed = aggregatedFeeds[i - 1];
      if (feed) {
        const postLabel = `${feed.postCount} post${feed.postCount !== 1 ? "s" : ""}`;
        visibleItems.push(
          <Box key={feed.topic} flexDirection="column" marginBottom={1}>
            <Text
              color={isSelected ? "green" : undefined}
              bold={isSelected}
            >
              {isSelected ? "▶ " : "  "}
              <Text color={isSelected ? "green" : "cyan"}>{feed.feedName}</Text>
              <Text color="gray"> · {postLabel}</Text>
            </Text>
          </Box>
        );
      }
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header with address */}
      <Text bold color="cyan">
        {truncateAddress(address)}
      </Text>

      {/* Section labels */}
      <Box marginTop={1} marginBottom={1}>
        <Text color="gray">Their Feed</Text>
        <Text color="gray"> · </Text>
        <Text color="gray">Active On ({aggregatedFeeds.length})</Text>
      </Box>

      {hasMoreAbove && (
        <Text color="gray" dimColor>  ↑ {startIndex} more above</Text>
      )}

      <Box flexDirection="column" marginTop={hasMoreAbove ? 0 : 0}>
        {visibleItems}
      </Box>

      {hasMoreBelow && (
        <Text color="gray" dimColor>  ↓ {totalItems - endIndex} more below</Text>
      )}
    </Box>
  );
}
