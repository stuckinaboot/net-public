import type { WriteTransactionConfig } from "@net-protocol/core";
import type { Address } from "viem";
import type {
  RetryFailedTransactionsParams,
  RetryConfig,
  RelaySubmitResult,
} from "./types";
import { DEFAULT_RETRY_CONFIG } from "./constants";
import { submitTransactionsViaRelay } from "./submit";

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
  const delay =
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Retry failed transactions with exponential backoff
 *
 * This function:
 * 1. Extracts failed transactions by index from RelaySubmitResult
 * 2. Optionally re-checks on-chain before retry (via recheckFunction)
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
    chainId,
    operatorAddress,
    secretKey,
    failedIndexes: initialFailedIndexes,
    originalTransactions,
    backendWalletAddress,
    config = {},
    sessionToken,
    recheckFunction,
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

    // Re-check on-chain before retry (if recheckFunction provided)
    if (recheckFunction) {
      failedIndexes = await recheckFunction(
        failedIndexes,
        originalTransactions,
        backendWalletAddress
      );
    }

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
        chainId,
        operatorAddress,
        secretKey,
        transactions: failedTransactions,
        sessionToken,
      });

      // Merge results
      if (lastResult) {
        // Combine transaction hashes
        lastResult.transactionHashes.push(...retryResult.transactionHashes);
        // Combine successful indexes (adjust for original index)
        lastResult.successfulIndexes.push(
          ...retryResult.successfulIndexes.map((idx) => failedIndexes[idx])
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
      failedIndexes = retryResult.failedIndexes.map(
        (idx) => failedIndexes[idx]
      );
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

