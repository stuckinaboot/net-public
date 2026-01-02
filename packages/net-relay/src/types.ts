import type { Hash, Address, PublicClient } from "viem";
import type { WriteTransactionConfig } from "@net-protocol/core";

/**
 * Error response from API endpoints
 */
export interface ErrorResponse {
  success: false;
  error: string;
}

/**
 * Response from /api/relay/[chainId]/fund endpoint
 */
export interface FundResponse {
  success: boolean;
  message?: string;
  payer?: Address;
  amount?: string;
  error?: string;
}

/**
 * Response from /api/relay/fund/verify endpoint
 */
export interface VerifyFundResponse {
  success: boolean;
  paymentTxHash?: Hash;
  backendWalletAddress?: Address;
  fundedAmountEth?: string;
  transactionHash?: Hash; // Combined: payment record storage + ETH transfer (atomic)
  alreadyProcessed?: boolean;
  message?: string;
  error?: string;
}

/**
 * Response from /api/relay/submit endpoint
 */
export interface SubmitResponse {
  success: boolean;
  transactionHashes: Hash[];
  successfulIndexes: number[];
  failedIndexes: number[];
  errors: { index: number; error: string }[];
  backendWalletAddress: Address;
  appFeeTransactionHash: Hash;
  error?: string;
}

/**
 * Response from /api/relay/session endpoint
 */
export interface CreateSessionResponse {
  success: boolean;
  sessionToken?: string;
  expiresAt?: number;
  error?: string;
}

/**
 * Response from /api/relay/balance endpoint
 */
export interface BalanceResponse {
  success: boolean;
  backendWalletAddress: Address;
  balanceWei: string;
  balanceEth: string;
  sufficientBalance: boolean;
  minRequiredWei: string;
  minRequiredEth: string;
  error?: string;
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
  backendWalletAddress: Address;
  appFeeTransactionHash: Hash;
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
  chainId: number;
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
  chainId: number;
  operatorAddress: Address;
  secretKey: string;
  transactions: WriteTransactionConfig[];
  sessionToken: string; // Required: session token for authentication
}

/**
 * Parameters for retrying failed transactions
 */
export interface RetryFailedTransactionsParams {
  apiUrl: string;
  chainId: number;
  operatorAddress: Address;
  secretKey: string;
  failedIndexes: number[];
  originalTransactions: WriteTransactionConfig[];
  backendWalletAddress: Address; // Keep - needed for recheck function if provided
  config?: RetryConfig;
  sessionToken: string; // Required: session token for authentication
  // Optional generic recheck function (replaces storage-specific logic)
  recheckFunction?: (
    failedIndexes: number[],
    transactions: WriteTransactionConfig[],
    backendWalletAddress: Address
  ) => Promise<number[]>;
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

/**
 * Result of waiting for transaction confirmations
 */
export interface ConfirmationResult {
  hash: Hash;
  receipt: any;
}

/**
 * Parameters for checking backend wallet balance
 */
export interface CheckBackendWalletBalanceParams {
  apiUrl: string;
  chainId: number;
  operatorAddress: Address;
  secretKey: string;
}

/**
 * Result of checking backend wallet balance
 */
export interface CheckBalanceResult {
  backendWalletAddress: Address;
  balanceWei: string;
  balanceEth: string;
  sufficientBalance: boolean;
  minRequiredWei: string;
  minRequiredEth: string;
}

/**
 * Result of creating x402 client
 */
export interface X402ClientResult {
  fetchWithPayment: typeof fetch;
  httpClient: {
    getPaymentSettleResponse: (
      getHeader: (name: string) => string | null
    ) => { transaction?: string; txHash?: string } | null;
  };
}

