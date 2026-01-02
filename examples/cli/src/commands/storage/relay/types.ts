import type { Hash, Address, PublicClient } from "viem";
import type { WriteTransactionConfig } from "@net-protocol/core";
import type { StorageClient } from "@net-protocol/storage";
// Import duplicate types from package
import type {
  RelayFundResult,
  RelaySubmitResult,
  RetryConfig,
  FundBackendWalletParams,
  SubmitTransactionsViaRelayParams,
  CheckBackendWalletBalanceParams,
  CheckBalanceResult,
  WaitForConfirmationsParams,
} from "@net-protocol/relay";

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

// Re-export types from package (these are identical)
export type {
  RelayFundResult,
  RelaySubmitResult,
  RetryConfig,
  FundBackendWalletParams,
  SubmitTransactionsViaRelayParams,
  CheckBackendWalletBalanceParams,
  CheckBalanceResult,
  WaitForConfirmationsParams,
};

/**
 * Parameters for retrying failed transactions
 *
 * CLI-specific version that includes storageClient for storage-specific recheck logic.
 * The package version uses recheckFunction instead.
 */
export interface RetryFailedTransactionsParams {
  apiUrl: string;
  chainId: number;
  operatorAddress: Address;
  secretKey: string;
  failedIndexes: number[];
  originalTransactions: WriteTransactionConfig[];
  storageClient: StorageClient;
  backendWalletAddress: Address;
  config?: RetryConfig;
  sessionToken: string; // Required: session token for authentication
}
