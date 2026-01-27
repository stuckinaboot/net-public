import { readFileSync } from "fs";
import {
  shouldSuggestXmlStorage,
  getStorageKeyBytes,
  detectFileTypeFromBase64,
  base64ToDataUri,
} from "@net-protocol/storage";
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
import { createWalletClientFromPrivateKey } from "../transactions/send";
import type {
  UploadOptions,
  PreviewResult,
  TransactionWithId,
  NormalStorageArgs,
} from "../types";

/**
 * Preview function - performs all prep steps but doesn't submit transactions
 * Returns statistics about what would be uploaded
 */
export async function previewFile(
  options: UploadOptions
): Promise<PreviewResult> {
  // 1. Read file
  // Read file as buffer (binary) first
  const fileBuffer = readFileSync(options.filePath);

  // Detect if file is binary
  // Check for null bytes or non-text characters (excluding common whitespace)
  const isBinary = fileBuffer.some(
    (byte) =>
      byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)
  );

  // Convert based on file type
  let fileContent: string;
  if (isBinary) {
    // Convert binary file to base64 string (valid UTF-8)
    const base64String = fileBuffer.toString("base64");

    // Detect file type and add data URI prefix if detected
    const detectedType = detectFileTypeFromBase64(base64String);
    if (detectedType) {
      // Include data URI prefix for better type preservation
      // Format: "data:audio/mpeg;base64,SUQz..."
      fileContent = base64ToDataUri(base64String);
    } else {
      // Fallback to raw base64 if detection fails
      fileContent = base64String;
    }
  } else {
    // Read as UTF-8 for text files
    fileContent = fileBuffer.toString("utf-8");
  }

  // 2. Create StorageClient
  const storageClient = new StorageClient({
    chainId: options.chainId,
    overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
  });

  // 3. Create wallet client (needed for operator address)
  const { operatorAddress } = createWalletClientFromPrivateKey({
    privateKey: options.privateKey,
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  // 4. Determine storage type
  const useXmlStorage = shouldSuggestXmlStorage(fileContent);
  const storageType: "normal" | "xml" = useXmlStorage ? "xml" : "normal";

  // 5. Prepare transactions
  let transactions: TransactionWithId[];

  if (useXmlStorage) {
    transactions = prepareXmlStorageTransactions({
      storageClient,
      storageKey: options.storageKey,
      text: options.text,
      content: fileContent,
      operatorAddress,
    });
    // No need to extract chunkedHashes - filterXmlStorageTransactions derives them internally
  } else {
    // Build typed args JSON object
    const storageKeyBytes = getStorageKeyBytes(
      options.storageKey
    ) as `0x${string}`;
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
  let transactionsSkipped: TransactionWithId[];

  if (useXmlStorage) {
    // Extract WriteTransactionConfig[] from TransactionWithId[]
    // First transaction is metadata, rest are chunk transactions
    const chunkTransactions = transactions
      .filter((tx) => tx.type === "chunked")
      .map((tx) => tx.transaction);

    // Create a map from WriteTransactionConfig to TransactionWithId for easy lookup
    const txConfigToTxWithId = new Map(
      transactions
        .filter((tx) => tx.type === "chunked")
        .map((tx) => [tx.transaction, tx])
    );

    const filtered = await filterXmlStorageTransactions({
      storageClient,
      transactions: chunkTransactions, // Only chunk transactions
      operatorAddress,
    });

    // Map filtered WriteTransactionConfig[] back to TransactionWithId[]
    const filteredToSend: TransactionWithId[] = filtered.toSend
      .map((txConfig) => txConfigToTxWithId.get(txConfig))
      .filter((tx): tx is TransactionWithId => tx !== undefined);

    const filteredSkipped: TransactionWithId[] = filtered.skipped
      .map((txConfig) => txConfigToTxWithId.get(txConfig))
      .filter((tx): tx is TransactionWithId => tx !== undefined);

    // Metadata is handled separately - check if it needs to be sent
    const metadataTx = transactions.find((tx) => tx.type === "metadata");
    if (metadataTx) {
      // For now, always include metadata in toSend (caller should check separately)
      filteredToSend.unshift(metadataTx);
    }

    transactionsToSend = filteredToSend;
    transactionsSkipped = filteredSkipped;
  } else {
    const filtered = await filterExistingTransactions({
      storageClient,
      transactions,
      operatorAddress,
      expectedContent: fileContent,
    });
    transactionsToSend = filtered.toSend;
    transactionsSkipped = filtered.skipped;
  }

  // Calculate statistics
  if (useXmlStorage) {
    // XML storage: separate chunks from metadata
    const chunkTransactions = transactions.filter(
      (tx) => tx.type === "chunked"
    );
    const metadataTransaction = transactions.find(
      (tx) => tx.type === "metadata"
    );

    const totalChunks = chunkTransactions.length;
    const alreadyStoredChunks = transactionsSkipped.filter(
      (tx) => tx.type === "chunked"
    ).length;
    const needToStoreChunks = transactionsToSend.filter(
      (tx) => tx.type === "chunked"
    ).length;
    const metadataNeedsStorage = metadataTransaction
      ? transactionsToSend.some((tx) => tx.type === "metadata")
      : false;

    return {
      storageType: "xml",
      totalChunks,
      alreadyStoredChunks,
      needToStoreChunks,
      metadataNeedsStorage,
      operatorAddress,
      storageKey: options.storageKey,
      totalTransactions: transactions.length,
      transactionsToSend: transactionsToSend.length,
      transactionsSkipped: transactionsSkipped.length,
    };
  } else {
    // Normal storage: single transaction counts as 1 chunk
    const totalChunks = 1;
    const alreadyStoredChunks = transactionsSkipped.length;
    const needToStoreChunks = transactionsToSend.length;

    return {
      storageType: "normal",
      totalChunks,
      alreadyStoredChunks,
      needToStoreChunks,
      operatorAddress,
      storageKey: options.storageKey,
      totalTransactions: transactions.length,
      transactionsToSend: transactionsToSend.length,
      transactionsSkipped: transactionsSkipped.length,
    };
  }
}
