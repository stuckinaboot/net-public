import { readFileSync } from "fs";
import { shouldSuggestXmlStorage, getStorageKeyBytes } from "@net-protocol/storage";
import { StorageClient } from "@net-protocol/storage";
import { stringToHex } from "viem";
import {
  prepareNormalStorageTransaction,
  prepareXmlStorageTransactions,
} from "../transactions/prep";
import {
  filterExistingTransactions,
  filterXmlStorageTransactions,
} from "../transactions/filter";
import {
  createWalletClientFromPrivateKey,
  sendTransactionsWithIdempotency,
} from "../transactions/send";
import type { UploadOptions, UploadResult, TransactionWithId, NormalStorageArgs } from "../types";

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
    createWalletClientFromPrivateKey({
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });

  // 4. Determine storage type
  const useXmlStorage = shouldSuggestXmlStorage(fileContent);
  const storageType: "normal" | "xml" = useXmlStorage ? "xml" : "normal";

  // 5. Prepare transactions
  let transactions: TransactionWithId[];
  let chunkedHashes: string[] | undefined;

  if (useXmlStorage) {
    transactions = prepareXmlStorageTransactions({
      storageClient,
      storageKey: options.storageKey,
      text: options.text,
      content: fileContent,
      operatorAddress,
    });
    // Extract chunked hashes for efficient checking
    chunkedHashes = transactions
      .filter((tx) => tx.type === "chunked")
      .map((tx) => tx.id);
  } else {
    // Build typed args JSON object
    const storageKeyBytes = getStorageKeyBytes(options.storageKey) as `0x${string}`;
    const typedArgs: NormalStorageArgs = {
      key: storageKeyBytes,
      text: options.text,
      value: stringToHex(fileContent),
    };
    
    transactions = [
      prepareNormalStorageTransaction(
        storageClient,
        typedArgs,
        options.storageKey // Pass original string key for preparePut
      ),
    ];
  }

  // 6. Filter existing transactions (idempotency)
  let transactionsToSend: TransactionWithId[];
  let skippedCount = 0;

  if (useXmlStorage && chunkedHashes) {
    const filtered = await filterXmlStorageTransactions({
      storageClient,
      transactions,
      operatorAddress,
      chunkedHashes,
    });
    transactionsToSend = filtered.toSend;
    skippedCount = filtered.skipped.length;
  } else {
    const filtered = await filterExistingTransactions({
      storageClient,
      transactions,
      operatorAddress,
      expectedContent: fileContent,
    });
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
      storageType,
    };
  }

  // 8. Send transactions
  const result = await sendTransactionsWithIdempotency({
    storageClient,
    walletClient,
    publicClient,
    transactions: transactionsToSend,
    operatorAddress,
  });

  // Add skipped count from filtering step
  result.transactionsSkipped += skippedCount;

  // Add operator address and storage type to result
  result.operatorAddress = operatorAddress;
  result.storageType = storageType;

  return result;
}

