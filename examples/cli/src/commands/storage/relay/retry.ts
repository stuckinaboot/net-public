import type { WriteTransactionConfig } from "@net-protocol/core";
import type { StorageClient } from "@net-protocol/storage";
import type { Address } from "viem";
import type {
  RetryFailedTransactionsParams,
  RetryConfig,
  RelaySubmitResult,
} from "./types";
import { retryFailedTransactions as retryFailedTransactionsPackage } from "@net-protocol/relay";
import { recheckFailedTransactionsStorage } from "./recheckStorage";

/**
 * Retry failed transactions with exponential backoff
 *
 * This is a wrapper around the package retryFailedTransactions that adds
 * storage-specific recheck logic.
 *
 * @param params - Retry parameters
 * @returns Final success/failure status after retries
 */
export async function retryFailedTransactions(
  params: RetryFailedTransactionsParams
): Promise<RelaySubmitResult> {
  const {
    storageClient,
    backendWalletAddress,
    apiUrl,
    chainId,
    operatorAddress,
    secretKey,
    failedIndexes,
    originalTransactions,
    config,
    sessionToken,
  } = params;

  // Use storage-specific recheck function
  return retryFailedTransactionsPackage({
    apiUrl,
    chainId,
    operatorAddress,
    secretKey,
    failedIndexes,
    originalTransactions,
    backendWalletAddress,
    config,
    sessionToken,
    recheckFunction: async (
      failedIndexes: number[],
      transactions: WriteTransactionConfig[],
      backendWalletAddress: Address
    ) => {
      return recheckFailedTransactionsStorage(
        failedIndexes,
        transactions,
        storageClient,
        backendWalletAddress
      );
    },
  });
}
