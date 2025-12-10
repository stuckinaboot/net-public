// React Hooks
export { useStorage } from "./hooks/useStorage";
export { useStorageForOperator } from "./hooks/useStorage";
export { useStorageForOperatorAndKey } from "./hooks/useStorage";
export { useBulkStorage } from "./hooks/useStorage";
export { useStorageTotalWrites } from "./hooks/useStorage";
export { useXmlStorage } from "./hooks/useXmlStorage";
export { useCanvasFromRouter } from "./hooks/useCanvasFromRouter";
export { useCanvasFromRouterWithXml } from "./hooks/useCanvasFromRouterWithXml";

// Client
export { StorageClient } from "./client/StorageClient";

// Utilities
export { getStorageKeyBytes, formatStorageKeyForDisplay, encodeStorageKeyForUrl, generateStorageEmbedTag } from "./utils/keyUtils";
export { chunkDataForStorage, assembleChunks } from "./utils/chunkUtils";
export { parseNetReferences, containsXmlReferences } from "./utils/xmlUtils";
export { processDataForStorage, chunkData, generateXmlMetadata, validateDataSize, computeTopLevelHash } from "./utils/writingUtils";

// Types
export type {
  UseStorageOptions,
  BulkStorageKey,
  StorageData,
  StorageClientOptions,
  XmlReference,
  ChunkedMetadata,
  UseXmlStorageOptions,
  UseCanvasFromRouterOptions,
} from "./types";

// Constants
export { STORAGE_CONTRACT, CHUNKED_STORAGE_CONTRACT, STORAGE_ROUTER_CONTRACT } from "./constants";

