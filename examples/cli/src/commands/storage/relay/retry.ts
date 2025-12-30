import type { WriteTransactionConfig } from "@net-protocol/core";
import type { StorageClient } from "@net-protocol/storage";
import type { Address } from "viem";
import type {
  RetryFailedTransactionsParams,
  RetryConfig,
  RelaySubmitResult,
} from "./types";
import { submitTransactionsViaRelay } from "./submit";
import { checkXmlChunksExist } from "../storage/check";
import { extractTypedArgsFromTransaction } from "../utils";

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(
  attempt: number,
  config: Required<RetryConfig>
): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Re-check failed transactions on-chain before retry
 *
 * Filters out transactions that have succeeded since the last attempt.
 *
 * @param params - Parameters for re-checking
 * @returns Array of transaction indexes that still need to be retried
 */
async function recheckFailedTransactions(
  failedIndexes: number[],
  originalTransactions: WriteTransactionConfig[],
  storageClient: StorageClient,
  backendWalletAddress: Address
): Promise<number[]> {
  if (failedIndexes.length === 0) {
    return [];
  }

  // Extract chunked hashes from failed transactions
  const failedTransactions = failedIndexes.map(
    (idx) => originalTransactions[idx]
  );
  const chunkedHashes: string[] = [];

  for (const tx of failedTransactions) {
    try {
      const typedArgs = extractTypedArgsFromTransaction(tx, "chunked");
      if (typedArgs.type === "chunked") {
        chunkedHashes.push(typedArgs.args.hash);
      }
    } catch {
      // Not a chunked transaction, skip
    }
  }

  if (chunkedHashes.length === 0) {
    // No chunked transactions to check, return all failed indexes
    return failedIndexes;
  }

  // Check which chunks exist on-chain
  const existingChunks = await checkXmlChunksExist({
    storageClient,
    chunkedHashes,
    operatorAddress: backendWalletAddress,
  });

  // Filter out indexes where the transaction has succeeded
  const stillFailed: number[] = [];
  let chunkIdx = 0;

  for (const failedIdx of failedIndexes) {
    const tx = originalTransactions[failedIdx];
    try {
      const typedArgs = extractTypedArgsFromTransaction(tx, "chunked");
      if (typedArgs.type === "chunked") {
        const hash = typedArgs.args.hash;
        if (!existingChunks.has(hash)) {
          // Transaction still hasn't succeeded
          stillFailed.push(failedIdx);
        }
        // If hash exists, transaction succeeded, skip retry
      } else {
        // Non-chunked transaction, always retry
        stillFailed.push(failedIdx);
      }
    } catch {
      // Can't determine type, retry to be safe
      stillFailed.push(failedIdx);
    }
    chunkIdx++;
  }

  return stillFailed;
}

/**
 * Retry failed transactions with exponential backoff
 *
 * This function:
 * 1. Extracts failed transactions by index from RelaySubmitResult
 * 2. Re-checks on-chain before retry (idempotency)
 * 3. Retries with exponential backoff
 * 4. Handles nested retries
 *
 * @param params - Retry parameters
 * @returns Final success/failure status after retries
 */
export async function retryFailedTransactions(
  params: RetryFailedTransactionsParams
): Promise<RelaySubmitResult> {
  const {
    apiUrl,
    paymentTxHash,
    operatorAddress,
    secretKey,
    failedIndexes: initialFailedIndexes,
    originalTransactions,
    storageClient,
    backendWalletAddress,
    config = {},
  } = params;

  const retryConfig: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let failedIndexes = initialFailedIndexes;
  let attempt = 0;
  let lastResult: RelaySubmitResult | null = null;

  while (failedIndexes.length > 0 && attempt < retryConfig.maxRetries) {
    attempt++;

    // Re-check on-chain before retry
    failedIndexes = await recheckFailedTransactions(
      failedIndexes,
      originalTransactions,
      storageClient,
      backendWalletAddress
    );

    if (failedIndexes.length === 0) {
      // All transactions have succeeded
      break;
    }

    // Calculate delay for exponential backoff
    const delay = calculateDelay(attempt - 1, retryConfig);
    if (attempt > 1) {
      // Don't delay on first attempt
      await sleep(delay);
    }

    // Extract failed transactions
    const failedTransactions = failedIndexes.map(
      (idx) => originalTransactions[idx]
    );

    // Retry failed transactions
    try {
      const retryResult = await submitTransactionsViaRelay({
        apiUrl,
        paymentTxHash,
        operatorAddress,
        secretKey,
        transactions: failedTransactions,
      });

      // Merge results
      if (lastResult) {
        // Combine transaction hashes
        lastResult.transactionHashes.push(...retryResult.transactionHashes);
        // Combine successful indexes (adjust for original index)
        lastResult.successfulIndexes.push(
          ...retryResult.successfulIndexes.map(
            (idx) => failedIndexes[idx]
          )
        );
        // Update failed indexes
        lastResult.failedIndexes = retryResult.failedIndexes.map(
          (idx) => failedIndexes[idx]
        );
        // Combine errors
        lastResult.errors.push(
          ...retryResult.errors.map((err) => ({
            index: failedIndexes[err.index],
            error: err.error,
          }))
        );
        // Update counts
        lastResult.transactionsSent += retryResult.transactionsSent;
        lastResult.transactionsFailed = retryResult.failedIndexes.length;
      } else {
        lastResult = {
          ...retryResult,
          successfulIndexes: retryResult.successfulIndexes.map(
            (idx) => failedIndexes[idx]
          ),
          failedIndexes: retryResult.failedIndexes.map(
            (idx) => failedIndexes[idx]
          ),
          errors: retryResult.errors.map((err) => ({
            index: failedIndexes[err.index],
            error: err.error,
          })),
        };
      }

      // Update failed indexes for next iteration
      failedIndexes = retryResult.failedIndexes.map((idx) => failedIndexes[idx]);
    } catch (error) {
      // Retry failed, keep current failed indexes
      console.error(`Retry attempt ${attempt} failed:`, error);
    }
  }

  if (!lastResult) {
    throw new Error("Retry failed: No result after retries");
  }

  return lastResult;
}

