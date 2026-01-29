// React hooks - requires wagmi and react peer dependencies
export { useNetMessages } from "./hooks/useNetMessages";
export { useNetMessageCount } from "./hooks/useNetMessageCount";
export { useNetMessagesBatchAsync } from "./hooks/useNetMessagesBatchAsync";
export { NetProvider } from "./hooks/NetProvider";

// Re-export types used by hooks
export type {
  UseNetMessagesOptions,
  UseNetMessageCountOptions,
  UseNetMessagesBatchAsyncOptions,
} from "./types";
