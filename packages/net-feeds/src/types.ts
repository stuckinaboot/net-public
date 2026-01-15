import type {
  NetMessage,
  WriteTransactionConfig,
} from "@net-protocol/core";

// Re-export NetMessage for convenience
export type { NetMessage };

/**
 * Options for the useFeedPosts hook
 */
export type UseFeedPostsOptions = {
  chainId: number;
  topic: string;
  maxMessages?: number; // Keep same name as useTopicFeed for compatibility
  enabled?: boolean; // Defaults to true if not provided
  sender?: `0x${string}`; // Optional: filter by sender address
};

/**
 * Options for creating a FeedClient instance
 */
export type FeedClientOptions = {
  chainId: number;
  overrides?: { rpcUrls: string[] };
};

/**
 * Options for getting feed posts via FeedClient
 */
export type GetFeedPostsOptions = {
  topic: string;
  maxPosts?: number;
};

/**
 * Options for preparing a feed post transaction
 */
export type PrepareFeedPostOptions = {
  topic: string;
  text: string;
  data?: string; // Optional arbitrary data (string will be converted to hex bytes). Can be a storage key, JSON, or any other data.
};

// Re-export WriteTransactionConfig for convenience
export type { WriteTransactionConfig };

