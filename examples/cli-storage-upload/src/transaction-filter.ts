import { StorageClient } from "@net-protocol/storage";
import { hexToString } from "viem";
import {
  checkNormalStorageExists,
  checkChunkedStorageExists,
  checkXmlChunksExist,
  checkXmlMetadataExists,
} from "./storage-check";
import type { TransactionWithId } from "./types";

/**
 * Filter transactions to only those that need to be sent
 * Checks existence for each transaction and filters out already-stored ones
 * Pure function - uses StorageClient, no side effects
 */
export async function filterExistingTransactions(
  storageClient: StorageClient,
  transactions: TransactionWithId[],
  operatorAddress: string,
  expectedContent?: string // For normal storage content comparison
): Promise<{
  toSend: TransactionWithId[];
  skipped: TransactionWithId[];
}> {
  const toSend: TransactionWithId[] = [];
  const skipped: TransactionWithId[] = [];

  for (const tx of transactions) {
    let exists = false;

    if (tx.type === "normal") {
      // Normal storage: check if exists and matches content
      if (expectedContent) {
        const check = await checkNormalStorageExists(
          storageClient,
          tx.id,
          operatorAddress,
          expectedContent
        );
        exists = check.exists && check.matches === true;
      } else {
        // Just check existence
        const check = await checkNormalStorageExists(
          storageClient,
          tx.id,
          operatorAddress,
          ""
        );
        exists = check.exists;
      }
    } else if (tx.type === "chunked") {
      // ChunkedStorage: check if metadata exists
      exists = await checkChunkedStorageExists(
        storageClient,
        tx.id,
        operatorAddress
      );
    } else if (tx.type === "metadata") {
      // XML metadata: check if exists
      // Extract expected metadata from transaction args (it's hex-encoded)
      const expectedMetadataHex = tx.transaction.args[2] as string;
      const expectedMetadata = hexToString(
        expectedMetadataHex as `0x${string}`
      );
      const check = await checkXmlMetadataExists(
        storageClient,
        tx.id,
        operatorAddress,
        expectedMetadata
      );
      exists = check.exists && check.matches === true;
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
 */
export async function filterXmlStorageTransactions(
  storageClient: StorageClient,
  transactions: TransactionWithId[],
  operatorAddress: string,
  chunkedHashes: string[]
): Promise<{
  toSend: TransactionWithId[];
  skipped: TransactionWithId[];
}> {
  // Separate metadata and chunk transactions
  const metadataTx = transactions.find((tx) => tx.type === "metadata");
  const chunkTxs = transactions.filter((tx) => tx.type === "chunked");

  const toSend: TransactionWithId[] = [];
  const skipped: TransactionWithId[] = [];

  // Check which chunks exist (parallel check)
  const existingChunks = await checkXmlChunksExist(
    storageClient,
    chunkedHashes,
    operatorAddress
  );

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
      const expectedMetadataHex = metadataTx.transaction.args[2] as string;
      const expectedMetadata = hexToString(
        expectedMetadataHex as `0x${string}`
      );
      const check = await checkXmlMetadataExists(
        storageClient,
        metadataTx.id,
        operatorAddress,
        expectedMetadata
      );
      if (check.exists && check.matches) {
        skipped.push(metadataTx);
      } else {
        toSend.unshift(metadataTx); // Metadata first
      }
    } else {
      toSend.unshift(metadataTx); // Metadata first
    }
  }

  return { toSend, skipped };
}
