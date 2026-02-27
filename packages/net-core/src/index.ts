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

// Types
export type {
  NetMessage,
  NetMessageFilter,
  NetClientMessagesOptions,
  NetClientMessageCountOptions,
  GetNetMessagesOptions,
  GetNetMessageCountOptions,
  UseNetMessagesOptions,
  UseNetMessageCountOptions,
  UseNetMessagesBatchAsyncOptions,
  WriteTransactionConfig,
} from "./types";

// Constants
export { NET_CONTRACT_ADDRESS, NET_CONTRACT_ABI, NULL_ADDRESS } from "./constants";

// Builder Code (Base attribution)
export {
  BASE_BUILDER_CODE,
  BASE_CHAIN_ID,
  BASE_DATA_SUFFIX,
  getBaseDataSuffix,
} from "./builderCode";

