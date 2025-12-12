// React hooks
export { useNetMessages } from "./hooks/useNetMessages";
export { useNetMessageCount } from "./hooks/useNetMessageCount";
export { useNetMessagesBatchAsync } from "./hooks/useNetMessagesBatchAsync";
export { NetProvider } from "./hooks/NetProvider";

// Utility classes
export { NetClient } from "./client/NetClient";

// Chain configuration
export {
  getPublicClient,
  getChainName,
  getChainRpcUrls,
  setChainRpcOverrides,
  getNetContract,
} from "./chainConfig";

// Utilities
export { keccak256HashString, toBytes32 } from "./utils/crypto";
export { normalizeData, normalizeDataOrEmpty } from "./utils/dataUtils";

// Writing functions
export { prepareSendMessage, prepareSendMessageViaApp } from "./client/messageWriting";

// Types
export type {
  NetMessage,
  NetMessageFilter,
  GetNetMessagesOptions,
  GetNetMessageCountOptions,
  UseNetMessagesOptions,
  UseNetMessageCountOptions,
  UseNetMessagesBatchAsyncOptions,
  WriteTransactionConfig,
} from "./types";

// Constants
export { NET_CONTRACT_ADDRESS, NET_CONTRACT_ABI } from "./constants";

