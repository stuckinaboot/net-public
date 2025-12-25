import { StorageClient } from "@net-protocol/storage";
import { hexToString } from "viem";
import {
  checkNormalStorageExists,
  checkChunkedStorageExists,
  checkXmlChunksExist,
  checkXmlMetadataExists,
} from "../storage/check";
import type {
  TransactionWithId,
  FilterExistingTransactionsParams,
  FilterXmlStorageTransactionsParams,
} from "../types";

/**
 * Filter transactions to only those that need to be sent
 * Checks existence for each transaction and filters out already-stored ones
 * Pure function - uses StorageClient, no side effects
 * Accepts JSON object as parameter
 */
export async function filterExistingTransactions(
  params: FilterExistingTransactionsParams
): Promise<{
  toSend: TransactionWithId[];
  skipped: TransactionWithId[];
}> {
  const { storageClient, transactions, operatorAddress, expectedContent } =
    params;
  const toSend: TransactionWithId[] = [];
  const skipped: TransactionWithId[] = [];

  for (const tx of transactions) {
    let exists = false;

    if (tx.type === "normal") {
      // Normal storage: always check if exists AND matches content
      if (expectedContent) {
        const check = await checkNormalStorageExists({
          storageClient,
          storageKey: tx.id,
          operatorAddress,
          expectedContent,
        });
        exists = check.exists && check.matches === true;
      } else {
        // Extract content from typed args if not provided
        if (tx.typedArgs.type === "normal") {
          const storedContent = hexToString(tx.typedArgs.args.value);
          const check = await checkNormalStorageExists({
            storageClient,
            storageKey: tx.id,
            operatorAddress,
            expectedContent: storedContent,
          });
          exists = check.exists && check.matches === true;
        }
      }
    } else if (tx.type === "chunked") {
      // ChunkedStorage: check if metadata exists
      exists = await checkChunkedStorageExists({
        storageClient,
        chunkedHash: tx.id,
        operatorAddress,
      });
    } else if (tx.type === "metadata") {
      // XML metadata: check if exists
      // Extract expected metadata from typed args (it's hex-encoded)
      if (tx.typedArgs.type === "metadata") {
        const expectedMetadata = hexToString(tx.typedArgs.args.value);
        const check = await checkXmlMetadataExists({
          storageClient,
          storageKey: tx.id,
          operatorAddress,
          expectedMetadata,
        });
        exists = check.exists && check.matches === true;
      }
    }

    if (exists) {
      skipped.push(tx);
    } else {
      toSend.push(tx);
    }
  }

  return { toSend, skipped };
}

/**
 * Filter XML storage transactions more efficiently
 * Checks all chunks in parallel, then filters
 * Accepts JSON object as parameter
 */
export async function filterXmlStorageTransactions(
  params: FilterXmlStorageTransactionsParams
): Promise<{
  toSend: TransactionWithId[];
  skipped: TransactionWithId[];
}> {
  const { storageClient, transactions, operatorAddress, chunkedHashes } =
    params;
  // Separate metadata and chunk transactions
  const metadataTx = transactions.find((tx) => tx.type === "metadata");
  const chunkTxs = transactions.filter((tx) => tx.type === "chunked");

  const toSend: TransactionWithId[] = [];
  const skipped: TransactionWithId[] = [];

  // Check which chunks exist (parallel check)
  const existingChunks = await checkXmlChunksExist({
    storageClient,
    chunkedHashes,
    operatorAddress,
  });

  // Filter chunk transactions
  for (const tx of chunkTxs) {
    if (existingChunks.has(tx.id)) {
      skipped.push(tx);
    } else {
      toSend.push(tx);
    }
  }

  // Check metadata (if all chunks exist and match, skip metadata too)
  if (metadataTx) {
    const allChunksExist = chunkedHashes.every((hash) =>
      existingChunks.has(hash)
    );
    if (allChunksExist) {
      // Verify metadata matches
      if (metadataTx.typedArgs.type === "metadata") {
        const expectedMetadata = hexToString(metadataTx.typedArgs.args.value);
        const check = await checkXmlMetadataExists({
          storageClient,
          storageKey: metadataTx.id,
          operatorAddress,
          expectedMetadata,
        });
        if (check.exists && check.matches) {
          skipped.push(metadataTx);
        } else {
          toSend.unshift(metadataTx); // Metadata first
        }
      }
    } else {
      toSend.unshift(metadataTx); // Metadata first
    }
  }

  return { toSend, skipped };
}
