import { StorageClient } from "@net-protocol/storage";
import { hexToString } from "viem";
import { WriteTransactionConfig } from "@net-protocol/core";
import {
  STORAGE_CONTRACT,
  CHUNKED_STORAGE_CONTRACT,
} from "@net-protocol/storage";
import {
  checkNormalStorageExists,
  checkChunkedStorageExists,
  checkXmlChunksExist,
  checkXmlMetadataExists,
} from "../storage/check";
import { extractTypedArgsFromTransaction } from "../utils";
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
 * Accepts WriteTransactionConfig[] directly and derives chunkedHashes internally
 * Accepts JSON object as parameter
 */
export async function filterXmlStorageTransactions(
  params: FilterXmlStorageTransactionsParams
): Promise<{
  toSend: WriteTransactionConfig[];
  skipped: WriteTransactionConfig[];
}> {
  const { storageClient, transactions, operatorAddress } = params;

  // Separate metadata and chunk transactions by contract address
  const metadataTx = transactions.find(
    (tx) => tx.to.toLowerCase() === STORAGE_CONTRACT.address.toLowerCase()
  );
  const chunkTxs = transactions.filter(
    (tx) => tx.to.toLowerCase() === CHUNKED_STORAGE_CONTRACT.address.toLowerCase()
  );

  // Derive chunkedHashes internally from WriteTransactionConfig[] args
  const chunkedHashes: string[] = [];
  for (const tx of chunkTxs) {
    const typedArgs = extractTypedArgsFromTransaction(tx, "chunked");
    if (typedArgs.type === "chunked") {
      chunkedHashes.push(typedArgs.args.hash); // Content-based hash (keccak256(xmlChunk))
    }
  }

  const toSend: WriteTransactionConfig[] = [];
  const skipped: WriteTransactionConfig[] = [];

  // Check which chunks exist (parallel check)
  const existingChunks = await checkXmlChunksExist({
    storageClient,
    chunkedHashes,
    operatorAddress,
  });

  // Filter chunk transactions
  for (const tx of chunkTxs) {
    const typedArgs = extractTypedArgsFromTransaction(tx, "chunked");
    if (typedArgs.type === "chunked") {
      const hash = typedArgs.args.hash;
      if (existingChunks.has(hash)) {
        skipped.push(tx);
      } else {
        toSend.push(tx);
      }
    }
  }

  // Check metadata (if all chunks exist and match, skip metadata too)
  if (metadataTx) {
    const allChunksExist = chunkedHashes.length > 0 && chunkedHashes.every((hash) =>
      existingChunks.has(hash)
    );
    if (allChunksExist) {
      // Verify metadata matches
      try {
        const typedArgs = extractTypedArgsFromTransaction(metadataTx, "metadata");
        if (typedArgs.type === "metadata") {
          const expectedMetadata = hexToString(typedArgs.args.value);
          const check = await checkXmlMetadataExists({
            storageClient,
            storageKey: typedArgs.args.key,
            operatorAddress,
            expectedMetadata,
          });
          if (check.exists && check.matches) {
            skipped.push(metadataTx);
          } else {
            toSend.unshift(metadataTx); // Metadata first
          }
        }
      } catch {
        // If we can't extract metadata args, include in toSend
        toSend.unshift(metadataTx);
      }
    } else {
      toSend.unshift(metadataTx); // Metadata first
    }
  }

  return { toSend, skipped };
}
