import type { Abi } from "viem";
import feedRegistryAbi from "./abis/feed-registry.json";

// Feed topic prefix convention
export const FEED_TOPIC_PREFIX = "feed-" as const;

// Comment topic suffix convention
export const COMMENT_TOPIC_SUFFIX = ":comments:" as const;

// Maximum nesting depth for comments (top comment → reply → reply-to-reply)
// Replies to 3rd-level comments attach as siblings to the 3rd level rather than indenting further
export const MAX_COMMENT_NESTING_DEPTH = 3 as const;

// Maximum feed name length (enforced by FeedRegistry contract)
export const MAX_FEED_NAME_LENGTH = 64 as const;

// FeedRegistry contract - deployed on Base mainnet only
export const FEED_REGISTRY_CONTRACT = {
  abi: feedRegistryAbi as Abi,
  address: "0x000000049ad5f63b6074d3466aa00415c012fc4c" as `0x${string}`,
} as const;

// Note: NULL_ADDRESS is imported directly from @net-protocol/core in files that need it
// It is not exported from this package's public API

