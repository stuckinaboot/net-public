// Client classes
export { FeedClient } from "./client/FeedClient";

// Utilities
export { normalizeFeedTopic, isFeedTopic } from "./utils/feedUtils";
export {
  generatePostHash,
  getCommentTopic,
  parseCommentData,
  encodeCommentData,
  isCommentTopic,
} from "./utils/commentUtils";
export {
  FEED_TOPIC_PREFIX,
  COMMENT_TOPIC_SUFFIX,
  MAX_COMMENT_NESTING_DEPTH,
} from "./constants";

// Types
export type {
  UseFeedPostsOptions,
  FeedClientOptions,
  GetFeedPostsOptions,
  PrepareFeedPostOptions,
  NetMessage,
  WriteTransactionConfig,
  // Comment types
  CommentData,
  UseCommentCountOptions,
  UseCommentCountBatchOptions,
  UseCommentsOptions,
  CommentWithReplies,
  GetCommentsOptions,
  PrepareCommentOptions,
} from "./types";

// Note: NULL_ADDRESS is not exported from this package
// Import it from @net-protocol/core if needed

