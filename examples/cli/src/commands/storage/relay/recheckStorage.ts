import type { WriteTransactionConfig } from "@net-protocol/core";
import type { StorageClient } from "@net-protocol/storage";
import type { Address } from "viem";
import { checkXmlChunksExist } from "../storage/check";
import { extractTypedArgsFromTransaction } from "../utils";

/**
 * Storage-specific recheck function for retry logic
 *
 * Re-checks failed transactions on-chain before retry to filter out
 * transactions that have succeeded since the last attempt.
 *
 * This is storage-specific because it uses checkXmlChunksExist and
 * extractTypedArgsFromTransaction which understand storage transaction types.
 *
 * @param failedIndexes - Indexes of failed transactions
 * @param transactions - Original transaction configs
 * @param backendWalletAddress - Backend wallet address (operator for storage checks)
 * @returns Array of transaction indexes that still need to be retried
 */
export async function recheckFailedTransactionsStorage(
  failedIndexes: number[],
  transactions: WriteTransactionConfig[],
  storageClient: StorageClient,
  backendWalletAddress: Address
): Promise<number[]> {
  if (failedIndexes.length === 0) {
    return [];
  }

  // Extract chunked hashes from failed transactions
  const failedTransactions = failedIndexes.map((idx) => transactions[idx]);
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

  for (const failedIdx of failedIndexes) {
    const tx = transactions[failedIdx];
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
  }

  return stillFailed;
}

