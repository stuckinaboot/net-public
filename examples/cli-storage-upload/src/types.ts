import { WriteTransactionConfig } from "@net-protocol/core";

/**
 * Transaction with unique identifier for tracking existence
 */
export interface TransactionWithId {
  id: string; // Unique identifier (storage key or ChunkedStorage hash)
  type: "normal" | "chunked" | "metadata"; // Transaction type
  transaction: WriteTransactionConfig;
}

/**
 * Result of checking if storage data exists
 */
export interface StorageCheckResult {
  exists: boolean;
  matches?: boolean; // For normal storage: does content match?
}

/**
 * Result of upload operation
 */
export interface UploadResult {
  success: boolean;
  skipped: boolean;
  transactionsSent: number;
  transactionsSkipped: number;
  transactionsFailed: number;
  finalHash?: string;
  error?: string;
}

/**
 * Options for upload operation
 */
export interface UploadOptions {
  filePath: string;
  storageKey: string;
  text: string;
  privateKey: `0x${string}`;
  chainId: number;
  rpcUrl?: string;
}
