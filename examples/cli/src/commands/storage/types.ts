import { WriteTransactionConfig } from "@net-protocol/core";
import type { StorageClient } from "@net-protocol/storage";
import type { WalletClient, PublicClient } from "viem";

/**
 * Normal storage transaction args
 */
export interface NormalStorageArgs {
  key: `0x${string}`;      // bytes32 storage key
  text: string;             // filename/description  
  value: `0x${string}`;     // hex-encoded content
}

/**
 * Chunked storage transaction args
 */
export interface ChunkedStorageArgs {
  hash: `0x${string}`;       // chunkedStorage hash
  text: string;              // empty string for chunks
  chunks: `0x${string}`[];   // empty array for chunks
}

/**
 * Metadata storage transaction args (same structure as normal)
 */
export interface MetadataStorageArgs {
  key: `0x${string}`;
  text: string;
  value: `0x${string}`;
}

/**
 * Union type for typed args
 */
export type StorageTransactionArgs = 
  | { type: "normal"; args: NormalStorageArgs }
  | { type: "chunked"; args: ChunkedStorageArgs }
  | { type: "metadata"; args: MetadataStorageArgs };

/**
 * Transaction with unique identifier for tracking existence
 */
export interface TransactionWithId {
  id: string; // Unique identifier (storage key or ChunkedStorage hash)
  type: "normal" | "chunked" | "metadata"; // Transaction type
  transaction: WriteTransactionConfig;
  typedArgs: StorageTransactionArgs; // Typed JSON args object
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
  operatorAddress?: string; // Operator address (from private key)
  storageType?: "normal" | "xml"; // Storage type used
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

/**
 * Parameters for filterExistingTransactions - accepts JSON object
 */
export interface FilterExistingTransactionsParams {
  storageClient: StorageClient;
  transactions: TransactionWithId[];
  operatorAddress: string;
  expectedContent?: string;
}

/**
 * Parameters for filterXmlStorageTransactions - accepts JSON object
 */
export interface FilterXmlStorageTransactionsParams {
  storageClient: StorageClient;
  transactions: WriteTransactionConfig[];
  operatorAddress: string;
  // chunkedHashes removed - derived internally from transaction args
}

/**
 * Parameters for sendTransactionsWithIdempotency - accepts JSON object
 */
export interface SendTransactionsParams {
  storageClient: StorageClient;
  walletClient: WalletClient;
  publicClient: PublicClient;
  transactions: TransactionWithId[];
  operatorAddress: string;
}

/**
 * Parameters for checkTransactionExists - accepts JSON object
 */
export interface CheckTransactionExistsParams {
  storageClient: StorageClient;
  tx: TransactionWithId;
  operatorAddress: string;
}

/**
 * Parameters for checkNormalStorageExists - accepts JSON object
 */
export interface CheckNormalStorageExistsParams {
  storageClient: StorageClient;
  storageKey: string;
  operatorAddress: string;
  expectedContent: string;
}

/**
 * Parameters for checkChunkedStorageExists - accepts JSON object
 */
export interface CheckChunkedStorageExistsParams {
  storageClient: StorageClient;
  chunkedHash: string;
  operatorAddress: string;
}

/**
 * Parameters for checkXmlChunksExist - accepts JSON object
 */
export interface CheckXmlChunksExistParams {
  storageClient: StorageClient;
  chunkedHashes: string[];
  operatorAddress: string;
}

/**
 * Parameters for checkXmlMetadataExists - accepts JSON object
 */
export interface CheckXmlMetadataExistsParams {
  storageClient: StorageClient;
  storageKey: string;
  operatorAddress: string;
  expectedMetadata: string;
}

/**
 * Parameters for createWalletClientFromPrivateKey - accepts JSON object
 */
export interface CreateWalletClientParams {
  privateKey: `0x${string}`;
  chainId: number;
  rpcUrl?: string;
}

/**
 * Parameters for prepareXmlStorageTransactions - accepts JSON object
 */
export interface PrepareXmlStorageTransactionsParams {
  storageClient: StorageClient;
  storageKey: string;
  text: string;
  content: string;
  operatorAddress: string;
}

/**
 * Result of preview operation
 */
export interface PreviewResult {
  storageType: "normal" | "xml";
  totalChunks: number;
  alreadyStoredChunks: number;
  needToStoreChunks: number;
  metadataNeedsStorage?: boolean; // Only for XML storage
  operatorAddress: string;
  storageKey: string;
  totalTransactions: number; // Total transactions (chunks + metadata if XML)
  transactionsToSend: number; // Transactions that would be sent
  transactionsSkipped: number; // Transactions already stored
}

/**
 * Re-export relay types for convenience
 */
export type {
  UploadWithRelayOptions,
  UploadWithRelayResult,
  RelayFundResult,
  RelaySubmitResult,
  RetryConfig,
} from "./relay/types";
