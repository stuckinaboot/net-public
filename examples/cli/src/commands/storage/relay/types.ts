import type { Hash, Address, PublicClient } from "viem";
import type { WriteTransactionConfig } from "@net-protocol/core";
import type { StorageClient } from "@net-protocol/storage";

/**
 * Options for uploading a file via relay
 */
export interface UploadWithRelayOptions {
  filePath: string;
  storageKey: string;
  text: string;
  privateKey: `0x${string}`;
  chainId: number;
  rpcUrl?: string;
  apiUrl: string; // Backend API URL (e.g., "http://localhost:3000")
  secretKey: string; // Client-provided secret key
}

/**
 * Result of uploading a file via relay
 */
export interface UploadWithRelayResult {
  success: boolean;
  topLevelHash: string;
  chunksSent: number;
  chunksSkipped: number;
  metadataSubmitted: boolean;
  chunkTransactionHashes: Hash[];
  metadataTransactionHash?: Hash;
  backendWalletAddress: Address;
  errors?: Error[];
}

/**
 * Result of funding backend wallet
 */
export interface RelayFundResult {
  paymentTxHash: Hash;
  backendWalletAddress: Address;
}

/**
 * Result of submitting transactions via relay
 */
export interface RelaySubmitResult {
  transactionHashes: Hash[];
  successfulIndexes: number[];
  failedIndexes: number[];
  errors: { index: number; error: string }[];
  transactionsSent: number;
  transactionsFailed: number;
  backendWalletAddress: Address;
}

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  maxRetries?: number; // Default: 3
  initialDelay?: number; // Default: 1000ms
  maxDelay?: number; // Default: 30000ms
  backoffMultiplier?: number; // Default: 2
}

/**
 * Parameters for funding backend wallet
 */
export interface FundBackendWalletParams {
  apiUrl: string;
  operatorAddress: Address;
  secretKey: string;
  fetchWithPayment: typeof fetch;
  httpClient: {
    getPaymentSettleResponse: (
      getHeader: (name: string) => string | null
    ) => { transaction?: string; txHash?: string } | null;
  };
}

/**
 * Parameters for submitting transactions via relay
 */
export interface SubmitTransactionsViaRelayParams {
  apiUrl: string;
  paymentTxHash: Hash;
  operatorAddress: Address;
  secretKey: string;
  transactions: WriteTransactionConfig[];
}

/**
 * Parameters for retrying failed transactions
 */
export interface RetryFailedTransactionsParams {
  apiUrl: string;
  paymentTxHash: Hash;
  operatorAddress: Address;
  secretKey: string;
  failedIndexes: number[];
  originalTransactions: WriteTransactionConfig[];
  storageClient: StorageClient;
  backendWalletAddress: Address;
  config?: RetryConfig;
}

/**
 * Parameters for waiting for transaction confirmations
 */
export interface WaitForConfirmationsParams {
  publicClient: PublicClient;
  transactionHashes: Hash[];
  confirmations?: number; // Default: 1
  timeout?: number; // Default: 60000ms
  onProgress?: (confirmed: number, total: number) => void;
}

