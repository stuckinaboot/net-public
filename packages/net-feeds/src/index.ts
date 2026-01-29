// Client classes
export { FeedClient } from "./client/FeedClient";

// Utilities
export { normalizeFeedTopic, isFeedTopic } from "./utils/feedUtils";
export { FEED_TOPIC_PREFIX } from "./constants";

// Types
export type {
  UseFeedPostsOptions,
  FeedClientOptions,
  GetFeedPostsOptions,
  PrepareFeedPostOptions,
  NetMessage,
  WriteTransactionConfig,
} from "./types";

// Note: NULL_ADDRESS is not exported from this package
// Import it from @net-protocol/core if needed

