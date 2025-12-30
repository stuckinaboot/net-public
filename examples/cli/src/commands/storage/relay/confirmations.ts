import { waitForTransactionReceipt } from "viem/actions";
import type { Hash } from "viem";
import type { PublicClient } from "viem";
import type { WaitForConfirmationsParams } from "./types";

/**
 * Default confirmation configuration
 */
const DEFAULT_CONFIRMATIONS = 1;
const DEFAULT_TIMEOUT = 60000; // 60 seconds

/**
 * Wait for transaction confirmations
 *
 * Uses waitForTransactionReceipt() from viem/actions to wait for
 * multiple transactions in parallel. Handles timeouts and tracks progress.
 *
 * @param params - Confirmation parameters
 * @returns Array of transaction receipts
 * @throws Error if timeout occurs or transaction fails
 */
export async function waitForConfirmations(
  params: WaitForConfirmationsParams
): Promise<Array<{ hash: Hash; receipt: any }>> {
  const {
    publicClient,
    transactionHashes,
    confirmations = DEFAULT_CONFIRMATIONS,
    timeout = DEFAULT_TIMEOUT,
    onProgress,
  } = params;

  if (transactionHashes.length === 0) {
    return [];
  }

  const results: Array<{ hash: Hash; receipt: any }> = [];
  let confirmed = 0;

  // Wait for all transactions in parallel
  const promises = transactionHashes.map(async (hash) => {
    try {
      const receipt = await waitForTransactionReceipt(publicClient, {
        hash,
        confirmations,
        timeout,
      });

      confirmed++;
      if (onProgress) {
        onProgress(confirmed, transactionHashes.length);
      }

      return { hash, receipt };
    } catch (error) {
      // Transaction failed or timed out
      throw new Error(
        `Transaction ${hash} failed or timed out: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  });

  // Wait for all promises
  const receipts = await Promise.all(promises);

  return receipts;
}

