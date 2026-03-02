// React hooks - requires wagmi and react peer dependencies
export { useUpvotes } from "./hooks/useUpvotes";
export { useUpvotesBatch } from "./hooks/useUpvotesBatch";
export { useTokenUpvotes } from "./hooks/useTokenUpvotes";

// User upvote hooks
export { useUserUpvotesGiven } from "./hooks/useUserUpvotesGiven";
export { useUserUpvotesReceived } from "./hooks/useUserUpvotesReceived";
export { useUserUpvotesGivenPerTokenBatch } from "./hooks/useUserUpvotesGivenPerTokenBatch";
export { useUserUpvotesReceivedPerTokenBatch } from "./hooks/useUserUpvotesReceivedPerTokenBatch";

// Re-export utilities commonly needed with hooks
export {
  getTokenScoreKey,
  getStorageScoreKey,
  getScoreKey,
} from "./utils/scoreKeyUtils";

// Re-export types used by hooks
export type {
  ScoreItem,
  FeedMessage,
  UseUpvotesOptions,
  UseUpvotesBatchOptions,
  UseTokenUpvotesOptions,
  UseUserUpvotesGivenOptions,
  UseUserUpvotesReceivedOptions,
  UseUserUpvotesGivenPerTokenBatchOptions,
  UseUserUpvotesReceivedPerTokenBatchOptions,
} from "./types";
