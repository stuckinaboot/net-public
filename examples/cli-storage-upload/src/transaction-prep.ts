import { WriteTransactionConfig } from "@net-protocol/core";
import { StorageClient, getStorageKeyBytes } from "@net-protocol/storage";
import type { TransactionWithId } from "./types";

/**
 * Prepare normal storage transaction with ID
 * Uses StorageClient.preparePut() from net-public
 */
export function prepareNormalStorageTransaction(
  storageClient: StorageClient,
  storageKey: string,
  text: string,
  content: string
): TransactionWithId {
  const storageKeyBytes = getStorageKeyBytes(storageKey) as `0x${string}`;

  // Use StorageClient.preparePut() from net-public
  const transaction = storageClient.preparePut({
    key: storageKey,
    text,
    value: content,
  });

  return {
    id: storageKeyBytes,
    type: "normal",
    transaction,
  };
}

/**
 * Prepare XML storage transactions with IDs
 * Returns array: [metadata transaction, ...chunk transactions]
 * Uses StorageClient.prepareXmlStorage() from net-public
 */
export function prepareXmlStorageTransactions(
  storageClient: StorageClient,
  storageKey: string,
  text: string,
  content: string,
  operatorAddress: string
): TransactionWithId[] {
  const storageKeyBytes = getStorageKeyBytes(storageKey) as `0x${string}`;

  // Use StorageClient.prepareXmlStorage() from net-public
  // This handles all the chunking, ChunkedStorage preparation, and metadata generation
  // Pass storageKey as string - prepareXmlStorage will convert it internally
  const result = storageClient.prepareXmlStorage({
    data: content,
    operatorAddress: operatorAddress as `0x${string}`,
    storageKey: storageKey, // Pass as string, not bytes32
    filename: text,
    useChunkedStorageBackend: true, // Use ChunkedStorage backend (default)
  });

  // Map WriteTransactionConfig[] to TransactionWithId[]
  // First transaction is metadata, rest are chunk transactions
  const transactions: TransactionWithId[] = result.transactionConfigs.map(
    (tx, index) => {
      if (index === 0) {
        // First transaction is metadata - use our storageKeyBytes for ID
        return {
          id: storageKeyBytes,
          type: "metadata",
          transaction: tx,
        };
      } else {
        // Rest are ChunkedStorage transactions
        // Extract the key from transaction args (first arg is the chunkedHash)
        const chunkedHash = tx.args[0] as string;
        return {
          id: chunkedHash,
          type: "chunked",
          transaction: tx,
        };
      }
    }
  );

  return transactions;
}
