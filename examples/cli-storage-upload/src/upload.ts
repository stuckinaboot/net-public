import { readFileSync } from "fs";
import { shouldSuggestXmlStorage } from "@net-protocol/storage";
import { StorageClient } from "@net-protocol/storage";
import {
  prepareNormalStorageTransaction,
  prepareXmlStorageTransactions,
} from "./transaction-prep";
import {
  filterExistingTransactions,
  filterXmlStorageTransactions,
} from "./transaction-filter";
import {
  createWalletClientFromPrivateKey,
  sendTransactionsWithIdempotency,
} from "./transaction-send";
import type { UploadOptions, UploadResult } from "./types";

/**
 * Main upload function - orchestrates the entire upload process
 */
export async function uploadFile(
  options: UploadOptions
): Promise<UploadResult> {
  // 1. Read file
  const fileContent = readFileSync(options.filePath, "utf-8");

  // 2. Create StorageClient
  const storageClient = new StorageClient({
    chainId: options.chainId,
    overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
  });

  // 3. Create wallet client
  const { walletClient, publicClient, operatorAddress } =
    createWalletClientFromPrivateKey(
      options.privateKey,
      options.chainId,
      options.rpcUrl
    );

  // 4. Determine storage type
  const useXmlStorage = shouldSuggestXmlStorage(fileContent);

  // 5. Prepare transactions
  let transactions: import("./types").TransactionWithId[];
  let chunkedHashes: string[] | undefined;

  if (useXmlStorage) {
    transactions = prepareXmlStorageTransactions(
      storageClient,
      options.storageKey,
      options.text,
      fileContent,
      operatorAddress
    );
    // Extract chunked hashes for efficient checking
    chunkedHashes = transactions
      .filter((tx) => tx.type === "chunked")
      .map((tx) => tx.id);
  } else {
    transactions = [
      prepareNormalStorageTransaction(
        storageClient,
        options.storageKey,
        options.text,
        fileContent
      ),
    ];
  }

  // 6. Filter existing transactions (idempotency)
  let transactionsToSend: import("./types").TransactionWithId[];
  let skippedCount = 0;

  if (useXmlStorage && chunkedHashes) {
    const filtered = await filterXmlStorageTransactions(
      storageClient,
      transactions,
      operatorAddress,
      chunkedHashes
    );
    transactionsToSend = filtered.toSend;
    skippedCount = filtered.skipped.length;
  } else {
    const filtered = await filterExistingTransactions(
      storageClient,
      transactions,
      operatorAddress,
      fileContent
    );
    transactionsToSend = filtered.toSend;
    skippedCount = filtered.skipped.length;
  }

  // 7. Check if all transactions were skipped
  if (transactionsToSend.length === 0) {
    return {
      success: true,
      skipped: true,
      transactionsSent: 0,
      transactionsSkipped: skippedCount,
      transactionsFailed: 0,
      operatorAddress,
    };
  }

  // 8. Send transactions
  const result = await sendTransactionsWithIdempotency(
    storageClient,
    walletClient,
    publicClient,
    transactionsToSend,
    operatorAddress
  );

  // Add skipped count from filtering step
  result.transactionsSkipped += skippedCount;

  // Add operator address to result
  result.operatorAddress = operatorAddress;

  return result;
}
