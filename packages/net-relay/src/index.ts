// Client/Utilities
export { createRelaySession } from "./session";
export { checkBackendWalletBalance } from "./balance";
export { fundBackendWallet } from "./fund";
export { submitTransactionsViaRelay } from "./submit";
export { retryFailedTransactions } from "./retry";
export { batchTransactions, estimateTransactionSize, estimateRequestSize } from "./batch";
export { waitForConfirmations } from "./confirmations";
export { createRelayX402Client } from "./client/x402Client";

// High-level client class
export { RelayClient } from "./client/RelayClient";

// Types
export type {
  ErrorResponse,
  FundResponse,
  VerifyFundResponse,
  SubmitResponse,
  CreateSessionResponse,
  BalanceResponse,
  RelayFundResult,
  RelaySubmitResult,
  RetryConfig,
  FundBackendWalletParams,
  SubmitTransactionsViaRelayParams,
  RetryFailedTransactionsParams,
  WaitForConfirmationsParams,
  ConfirmationResult,
  CheckBackendWalletBalanceParams,
  CheckBalanceResult,
  X402ClientResult,
} from "./types";

// Constants
export {
  RELAY_DOMAIN_NAME,
  RELAY_DOMAIN_VERSION,
  RELAY_SESSION_TYPES,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CONFIRMATIONS,
  DEFAULT_TIMEOUT,
  MAX_TRANSACTIONS_PER_BATCH,
  MAX_BATCH_SIZE_BYTES,
  MAX_TRANSACTION_SIZE_BYTES,
} from "./constants";
