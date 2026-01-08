// React Hooks
export { useStorage } from "./hooks/useStorage";
export { useStorageForOperator } from "./hooks/useStorage";
export { useStorageForOperatorAndKey } from "./hooks/useStorage";
export { useBulkStorage } from "./hooks/useStorage";
export { useStorageTotalWrites } from "./hooks/useStorage";
export { useXmlStorage } from "./hooks/useXmlStorage";
export { useStorageFromRouter } from "./hooks/useStorageFromRouter";

// Client
export { StorageClient } from "./client/StorageClient";

// Utilities
export {
  getStorageKeyBytes,
  formatStorageKeyForDisplay,
  encodeStorageKeyForUrl,
  generateStorageEmbedTag,
} from "./utils/keyUtils";
export {
  chunkDataForStorage,
  assembleChunks,
  shouldSuggestXmlStorage,
  getChunkCount,
} from "./utils/chunkUtils";
export {
  parseNetReferences,
  containsXmlReferences,
  detectStorageType,
  resolveOperator,
  getReferenceKey,
} from "./utils/xmlUtils";
export {
  processDataForStorage,
  chunkData,
  generateXmlMetadata,
  generateXmlMetadataWithSource,
  validateDataSize,
  computeTopLevelHash,
} from "./utils/writingUtils";
export {
  fileToDataUri,
  detectFileTypeFromBase64,
  base64ToDataUri,
} from "./utils/fileUtils";
export {
  processFileStreaming,
  processFileStreamingComplete,
  isBinaryFile,
  readFileSlice,
  estimateChunkCount,
} from "./utils/streamingUtils";
export type {
  StreamingChunkResult,
  StreamingProcessResult,
} from "./utils/streamingUtils";

// Types
export type {
  UseStorageOptions,
  BulkStorageKey,
  StorageData,
  StorageClientOptions,
  XmlReference,
  ChunkedMetadata,
  UseXmlStorageOptions,
} from "./types";

// Constants
export {
  STORAGE_CONTRACT,
  CHUNKED_STORAGE_CONTRACT,
  STORAGE_ROUTER_CONTRACT,
  CHUNKED_STORAGE_READER_CONTRACT,
  SAFE_STORAGE_READER_CONTRACT,
} from "./constants";

// XML Storage Client Functions
export {
  MAX_XML_DEPTH,
  CONCURRENT_XML_FETCHES,
  resolveXmlRecursive,
} from "./client/xmlStorage";
