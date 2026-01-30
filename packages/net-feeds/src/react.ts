// React hooks - requires wagmi and react peer dependencies
export { useFeedPosts } from "./hooks/useFeedPosts";
export { useCommentCount } from "./hooks/useCommentCount";
export { useCommentCountBatch } from "./hooks/useCommentCountBatch";
export { useComments } from "./hooks/useComments";

// Re-export utilities commonly needed with hooks
export { generatePostHash } from "./utils/commentUtils";

// Re-export types used by hooks
export type {
  UseFeedPostsOptions,
  UseCommentCountOptions,
  UseCommentCountBatchOptions,
  UseCommentsOptions,
  CommentWithReplies,
} from "./types";
