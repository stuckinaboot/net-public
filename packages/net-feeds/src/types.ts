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

/**
 * Data stored in a comment's data field to link it to a parent post or another comment
 */
export type CommentData = {
  /** The topic of the parent post (e.g., "feed-crypto") */
  parentTopic: string;
  /** The sender address of the parent post */
  parentSender: `0x${string}`;
  /** The timestamp of the parent post */
  parentTimestamp: number;
  /** For nested replies - references the comment being replied to */
  replyTo?: {
    sender: `0x${string}`;
    timestamp: number;
  };
};

/**
 * Options for the useCommentCount hook
 */
export type UseCommentCountOptions = {
  chainId: number;
  post: NetMessage;
  enabled?: boolean; // Defaults to true if not provided
};

/**
 * Options for the useCommentCountBatch hook
 */
export type UseCommentCountBatchOptions = {
  chainId: number;
  posts: NetMessage[];
  enabled?: boolean; // Defaults to true if not provided
};

/**
 * Options for the useComments hook
 */
export type UseCommentsOptions = {
  chainId: number;
  post: NetMessage;
  maxComments?: number; // Defaults to 50 if not provided
  enabled?: boolean; // Defaults to true if not provided
};

/**
 * A comment with optional nested replies (built client-side)
 */
export type CommentWithReplies = NetMessage & {
  replies: CommentWithReplies[];
  depth: number;
};

/**
 * Options for getting comments via FeedClient
 */
export type GetCommentsOptions = {
  post: NetMessage;
  maxComments?: number; // Defaults to 50 if not provided
};

/**
 * Options for preparing a comment transaction
 */
export type PrepareCommentOptions = {
  post: NetMessage;
  text: string;
  replyTo?: {
    sender: `0x${string}`;
    timestamp: number;
  };
};

// ============ Feed Registry Types ============

/**
 * A registered feed from the FeedRegistry contract
 */
export type RegisteredFeed = {
  /** The feed name (topic) */
  feedName: string;
  /** The address that registered the feed */
  registrant: `0x${string}`;
  /** Optional description of the feed */
  description: string;
  /** Timestamp when the feed was registered */
  timestamp: number;
};

/**
 * Options for the useFeedRegistry hook
 */
export type UseFeedRegistryOptions = {
  chainId: number;
};

/**
 * Options for checking if a feed is registered
 */
export type UseIsFeedRegisteredOptions = {
  chainId: number;
  feedName: string;
  enabled?: boolean;
};

/**
 * Options for the useRegisteredFeeds hook
 */
export type UseRegisteredFeedsOptions = {
  chainId: number;
  maxFeeds?: number; // Defaults to 100 if not provided
  enabled?: boolean; // Defaults to true if not provided
};

/**
 * Options for preparing a feed registration transaction
 */
export type PrepareRegisterFeedOptions = {
  feedName: string;
  description?: string;
};

