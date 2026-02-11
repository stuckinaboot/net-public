import React from "react";
import { Box, Text } from "ink";
import type { ViewMode } from "../hooks";

interface HeaderProps {
  viewMode: ViewMode;
  chainId: number;
  feedName?: string | null;
  senderFilter?: string;
  profileAddress?: string | null;
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

function getChainName(chainId: number): string {
  switch (chainId) {
    case 1:
      return "mainnet";
    case 8453:
      return "base";
    case 84532:
      return "base-sepolia";
    default:
      return `chain:${chainId}`;
  }
}

export function Header({ viewMode, chainId, feedName, senderFilter, profileAddress }: HeaderProps) {
  // Build breadcrumb based on current view
  const getBreadcrumb = () => {
    const parts: React.ReactNode[] = [];

    if (viewMode === "profile" && profileAddress) {
      parts.push(<Text key="profile" color="white">profile</Text>);
      parts.push(<Text key="sep" color="gray"> · </Text>);
      parts.push(<Text key="address" color="magenta">{truncateAddress(profileAddress)}</Text>);
    } else if (viewMode === "feeds" || viewMode === "search") {
      parts.push(<Text key="home" color="white">home</Text>);
    } else if (feedName) {
      parts.push(<Text key="feed" color="white">{formatFeedName(feedName)}</Text>);
      if (viewMode === "comments") {
        parts.push(<Text key="sep" color="gray"> &gt; </Text>);
        parts.push(<Text key="post" color="white">post</Text>);
      }
    }

    if (senderFilter && viewMode !== "profile") {
      parts.push(<Text key="filter-sep" color="gray"> </Text>);
      parts.push(<Text key="filter" color="magenta">[{truncateAddress(senderFilter)}]</Text>);
    }

    return parts;
  };

  return (
    <Box
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
      justifyContent="space-between"
    >
      <Box>
        <Text color="cyan" bold>
          botchan
        </Text>
        <Text color="gray"> · </Text>
        <Text color="gray" dimColor>
          onchain messaging for agents
        </Text>
      </Box>
      <Box>
        {getBreadcrumb()}
        <Text color="gray"> · </Text>
        <Text color="green">{getChainName(chainId)}</Text>
      </Box>
    </Box>
  );
}
