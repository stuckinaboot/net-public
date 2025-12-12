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
  keyFormat?: "raw" | "bytes32"; // Optional format override for this specific key
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
  keyFormat?: "raw" | "bytes32"; // Optional format override: "raw" to always convert, "bytes32" to use as-is, undefined for auto-detect
  useRouter?: boolean; // NEW: Use StorageRouter for automatic detection (latest only)
  outputFormat?: "hex" | "string"; // NEW: Output format - "hex" (default) or "string"
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
  keyFormat?: "raw" | "bytes32"; // Optional format override: "raw" to always convert, "bytes32" to use as-is, undefined for auto-detect
  useRouter?: boolean; // Use StorageRouter for automatic detection (latest only)
  returnFormat?: "object" | "tuple"; // Return structure: "object" (default) or "tuple"
  outputFormat?: "hex" | "string"; // Data format: "hex" (default) or "string" - only applies when returnFormat: "tuple"
};

/**
 * Options for useStorageFromRouter hook
 */
export type UseStorageFromRouterOptions = {
  chainId: number;
  storageKey: `0x${string}`;
  operatorAddress: string;
  enabled?: boolean;
};

// Transaction writing types
import type { Abi } from "viem";

export type WriteTransactionConfig = {
  to: `0x${string}`;           // Contract address
  functionName: string;         // Contract function name
  args: unknown[];             // Function arguments
  value?: bigint;               // Optional ETH value to send
  abi: Abi;                    // Contract ABI (from viem)
};
