/**
 * Storage data tuple: [text, data]
 */
export type StorageData = [string, string];

/**
 * Bulk storage key for batch operations
 */
export type BulkStorageKey = {
  key: string;
  operator: string;
};

/**
 * Bulk storage result
 */
export type BulkStorageResult = {
  text: string;
  value: string;
};

/**
 * Options for useStorage hook
 */
export type UseStorageOptions = {
  chainId: number;
  key?: string;
  operatorAddress?: string;
  enabled?: boolean;
  index?: number; // Historical version index (0-based). undefined = latest version
};

/**
 * Options for StorageClient
 */
export type StorageClientOptions = {
  chainId: number;
  overrides?: { rpcUrls: string[] };
};

/**
 * XML reference structure
 */
export interface XmlReference {
  hash: string;
  version: string;
  index?: number;
  operator?: string;
  source?: string; // 'd' for direct Storage.sol, undefined for ChunkedStorage
}

/**
 * Chunked storage metadata
 */
export type ChunkedMetadata = {
  chunkCount: number;
  originalText: string;
};

/**
 * Options for useXmlStorage hook
 */
export type UseXmlStorageOptions = {
  chainId: number;
  key?: string;
  operatorAddress: string;
  skipXmlParsing?: boolean;
  enabled?: boolean;
  content?: string; // Preview mode: when provided, no blockchain fetch
  index?: number; // Historical version index (0-based). undefined = latest version
};

/**
 * Options for useCanvasFromRouter hook
 */
export type UseCanvasFromRouterOptions = {
  chainId: number;
  storageKey: `0x${string}`;
  operatorAddress: string;
  enabled?: boolean;
};

