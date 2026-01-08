import type { WriteTransactionConfig } from "@net-protocol/core";
import {
  MAX_TRANSACTIONS_PER_BATCH,
  MAX_BATCH_SIZE_BYTES,
  MAX_TRANSACTION_SIZE_BYTES,
} from "./constants";

/**
 * Estimate the size of a serialized transaction config in bytes
 *
 * Storage transactions can be large due to:
 * - Large args arrays (chunk data)
 * - Hex-encoded data in args
 * - Full ABI included in each transaction (can be 2-3KB)
 *
 * The entire transaction object is serialized to JSON, including the ABI,
 * so we must account for all fields.
 */
export function estimateTransactionSize(tx: WriteTransactionConfig): number {
  // Measure actual sizes of serialized fields
  const argsSize = tx.args ? JSON.stringify(tx.args).length : 0;
  const abiSize = tx.abi ? JSON.stringify(tx.abi).length : 0;
  
  // Add overhead for: to (~44 bytes), functionName (~20 bytes), 
  // JSON structure/keys (~100 bytes)
  const overhead = 200;

  // Cap at MAX_TRANSACTION_SIZE_BYTES to prevent single transaction from exceeding batch limit
  return Math.min(
    argsSize + abiSize + overhead,
    MAX_TRANSACTION_SIZE_BYTES
  );
}

/**
 * Estimate the total request size for a batch of transactions
 */
export function estimateRequestSize(
  transactions: WriteTransactionConfig[]
): number {
  // Base overhead: operatorAddress (~42 bytes),
  // secretKey (~50-200 bytes), JSON structure (~100 bytes)
  const baseOverhead = 300;
  const transactionsSize = transactions.reduce(
    (sum, tx) => sum + estimateTransactionSize(tx),
    0
  );
  return baseOverhead + transactionsSize;
}

/**
 * Batch transactions into groups that respect count and size limits
 *
 * With 100KB per transaction estimate:
 * - Size limit: ~9 transactions per batch (900KB / 100KB)
 * - Count limit: 100 transactions per batch
 * - Size limit is the constraining factor for large transactions
 */
export function batchTransactions(
  transactions: WriteTransactionConfig[]
): WriteTransactionConfig[][] {
  const batches: WriteTransactionConfig[][] = [];
  let currentBatch: WriteTransactionConfig[] = [];

  for (const tx of transactions) {
    // Calculate what the batch size would be with this transaction added
    const batchWithTx = [...currentBatch, tx];
    const estimatedSize = estimateRequestSize(batchWithTx);

    // Check if adding this transaction would exceed limits
    // Size limit is typically the constraining factor (9 transactions @ 100KB each)
    if (
      currentBatch.length >= MAX_TRANSACTIONS_PER_BATCH ||
      estimatedSize > MAX_BATCH_SIZE_BYTES
    ) {
      // Start a new batch
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    }

    // If a single transaction exceeds the batch size limit, we still add it
    // (it will be its own batch, and the server will reject it with a clear error)
    currentBatch.push(tx);
  }

  // Add the last batch if it has transactions
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

