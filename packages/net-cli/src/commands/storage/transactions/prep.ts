import { WriteTransactionConfig } from "@net-protocol/core";
import { StorageClient, getStorageKeyBytes } from "@net-protocol/storage";
import { hexToString } from "viem";
import type {
  TransactionWithId,
  NormalStorageArgs,
  PrepareXmlStorageTransactionsParams,
} from "../types";
import { extractTypedArgsFromTransaction, typedArgsToArray } from "../utils";

/**
 * Prepare normal storage transaction with ID
 * Uses StorageClient.preparePut() from net-public
 * Accepts typed JSON args object instead of individual parameters
 */
export function prepareNormalStorageTransaction(
  storageClient: StorageClient,
  args: NormalStorageArgs,
  originalStorageKey: string // Original string key needed for preparePut
): TransactionWithId {
  // Use StorageClient.preparePut() from net-public
  // preparePut needs the original string key, not bytes32
  const content = hexToString(args.value);
  
  const transaction = storageClient.preparePut({
    key: originalStorageKey,
    text: args.text,
    value: content,
  });

  const typedArgs = {
    type: "normal" as const,
    args,
  };

  return {
    id: args.key,
    type: "normal",
    transaction,
    typedArgs,
  };
}

/**
 * Prepare XML storage transactions with IDs
 * Returns array: [metadata transaction, ...chunk transactions]
 * Uses StorageClient.prepareXmlStorage() from net-public
 * Accepts JSON object as parameter
 */
export function prepareXmlStorageTransactions(
  params: PrepareXmlStorageTransactionsParams
): TransactionWithId[] {
  const { storageClient, storageKey, text, content, operatorAddress, chunkSize } = params;
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
    chunkSize,
  });

  // Map WriteTransactionConfig[] to TransactionWithId[]
  // First transaction is metadata, rest are chunk transactions
  const transactions: TransactionWithId[] = result.transactionConfigs.map(
    (tx, index) => {
      if (index === 0) {
        // First transaction is metadata - use our storageKeyBytes for ID
        const typedArgs = extractTypedArgsFromTransaction(tx, "metadata");
        return {
          id: storageKeyBytes,
          type: "metadata",
          transaction: tx,
          typedArgs,
        };
      } else {
        // Rest are ChunkedStorage transactions
        // Extract typed args and get hash from typed args
        const typedArgs = extractTypedArgsFromTransaction(tx, "chunked");
        if (typedArgs.type === "chunked") {
          const chunkedHash = typedArgs.args.hash;
          return {
            id: chunkedHash,
            type: "chunked",
            transaction: tx,
            typedArgs,
          };
        }
        // This should never happen, but TypeScript needs it
        throw new Error("Invalid chunked transaction");
      }
    }
  );

  return transactions;
}

