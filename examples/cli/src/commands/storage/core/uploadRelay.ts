import { readFileSync } from "fs";
import {
  getStorageKeyBytes,
  detectFileTypeFromBase64,
  base64ToDataUri,
} from "@net-protocol/storage";
import { StorageClient } from "@net-protocol/storage";
import { hexToString } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { http, createWalletClient } from "viem";
import { getPublicClient, getChainRpcUrls } from "@net-protocol/core";
import type { Address, Hash } from "viem";
import { filterXmlStorageTransactions } from "../transactions/filter";
import { checkXmlMetadataExists } from "../storage/check";
import { extractTypedArgsFromTransaction } from "../utils";
import {
  createRelayX402Client,
  fundBackendWallet,
  checkBackendWalletBalance,
  submitTransactionsViaRelay,
  waitForConfirmations,
  createRelaySession,
  batchTransactions,
} from "@net-protocol/relay";
import { retryFailedTransactions } from "../relay/retry";
import type {
  UploadWithRelayOptions,
  UploadWithRelayResult,
} from "../relay/types";
import type { WriteTransactionConfig } from "@net-protocol/core";

/**
 * Main upload function with relay - orchestrates the entire relay upload process
 *
 * Flow:
 * 1. Read file
 * 2. Fund backend wallet (x402 payment)
 * 3. Prepare transactions with backendWalletAddress as operator
 * 4. Split transactions (metadata vs chunks)
 * 5. Filter existing transactions (idempotency)
 * 6. Submit chunks via relay (backend wallet pays gas)
 * 7. Retry failed chunks
 * 8. Submit metadata directly (user pays gas)
 * 9. Wait for confirmations
 * 10. Return result
 */
export async function uploadFileWithRelay(
  options: UploadWithRelayOptions
): Promise<UploadWithRelayResult> {
  const errors: Error[] = [];

  // 1. Read file
  const fileBuffer = readFileSync(options.filePath);

  // Detect if file is binary
  const isBinary = fileBuffer.some(
    (byte) =>
      byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)
  );

  // Convert based on file type
  let fileContent: string;
  if (isBinary) {
    const base64String = fileBuffer.toString("base64");
    const detectedType = detectFileTypeFromBase64(base64String);
    if (detectedType) {
      fileContent = base64ToDataUri(base64String);
    } else {
      fileContent = base64String;
    }
  } else {
    fileContent = fileBuffer.toString("utf-8");
  }

  // 2. Create StorageClient
  // Note: Relay upload always uses XML storage format, regardless of file size
  // prepareXmlStorage() handles small files by creating a single chunk with XML metadata
  const storageClient = new StorageClient({
    chainId: options.chainId,
    overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
  });

  // 4. Create user wallet client
  const userAccount = privateKeyToAccount(options.privateKey);
  const userAddress = userAccount.address;
  const publicClient = getPublicClient({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });
  const rpcUrls = getChainRpcUrls({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });
  const userWalletClient = createWalletClient({
    account: userAccount,
    chain: publicClient.chain!,
    transport: http(rpcUrls[0]), // Use first RPC URL
  });

  // 5. Setup x402 client
  const { fetchWithPayment, httpClient } = createRelayX402Client(
    userAccount,
    options.chainId
  );

  // 5.5. Create relay session token (sign once, reuse for all batches)
  // Session token is required for all submit requests
  const sessionResult = await createRelaySession({
    apiUrl: options.apiUrl,
    chainId: options.chainId,
    operatorAddress: userAddress,
    secretKey: options.secretKey,
    account: userAccount,
    expiresIn: 3600, // 1 hour - should be enough for most uploads
  });
  const sessionToken = sessionResult.sessionToken;
  console.log("✓ Session token created (valid for 1 hour)");

  // 6. Check backend wallet balance and fund if needed
  // Check balance first to avoid unnecessary payments
  let backendWalletAddress: Address | undefined;
  let shouldFund = true;

  try {
    const balanceResult = await checkBackendWalletBalance({
      apiUrl: options.apiUrl,
      chainId: options.chainId,
      operatorAddress: userAddress,
      secretKey: options.secretKey,
    });
    backendWalletAddress = balanceResult.backendWalletAddress;

    // Only fund if balance is insufficient
    shouldFund = !balanceResult.sufficientBalance;
  } catch (error) {
    // If balance check fails, fall back to funding (for backwards compatibility)
    // This handles cases where the balance endpoint might not be available
    shouldFund = true;
  }

  // Fund backend wallet only if balance is insufficient
  // This ensures backendWalletAddress is always set
  if (shouldFund) {
    const fundResult = await fundBackendWallet({
      apiUrl: options.apiUrl,
      chainId: options.chainId,
      operatorAddress: userAddress,
      secretKey: options.secretKey,
      fetchWithPayment,
      httpClient,
    });
    backendWalletAddress = fundResult.backendWalletAddress;
  }

  // TypeScript assertion: backendWalletAddress is guaranteed to be set at this point
  // (either from balance check or fund call)
  if (!backendWalletAddress) {
    throw new Error("Failed to determine backend wallet address");
  }

  // backendWalletAddress is now guaranteed to be set (either from balance check or fund call)

  // 7. Prepare chunks with backendWalletAddress as operator (chunks submitted via relay)
  // Use StorageClient.prepareXmlStorage() to get chunk transactions
  const chunkPrepareResult = storageClient.prepareXmlStorage({
    data: fileContent,
    operatorAddress: backendWalletAddress,
    storageKey: options.storageKey,
    filename: options.text,
    useChunkedStorageBackend: true,
  });

  const chunkTxs = chunkPrepareResult.transactionConfigs.slice(1); // Skip metadata, get chunks
  const topLevelHash = chunkPrepareResult.topLevelHash;
  const chunkMetadata = chunkPrepareResult.metadata; // XML metadata referencing backend wallet chunks

  // 8. Prepare metadata transaction separately with userAddress as operator
  // Metadata is submitted directly by user, so it should use userAddress
  // We use the same XML metadata string (which references chunks stored by backend wallet)
  const metadataTx = storageClient.preparePut({
    key: topLevelHash,
    text: options.text,
    value: chunkMetadata, // Use the XML metadata from chunk preparation
  });

  // 9. Filter existing chunks (idempotency check with backendWalletAddress)
  const filteredChunks = await filterXmlStorageTransactions({
    storageClient,
    transactions: chunkTxs,
    operatorAddress: backendWalletAddress,
  });

  const chunksToSend = filteredChunks.toSend;
  const chunksSkipped = filteredChunks.skipped.length;

  // 10. Check if metadata already exists (with userAddress as operator)
  // Extract metadata args from the prepared transaction
  const metadataStorageKey = metadataTx.args[0] as `0x${string}`;
  const expectedMetadata = hexToString(metadataTx.args[2] as `0x${string}`);
  let metadataNeedsSubmission = true;

  const metadataCheck = await checkXmlMetadataExists({
    storageClient,
    storageKey: metadataStorageKey,
    operatorAddress: userAddress, // User is operator for metadata
    expectedMetadata,
  });
  if (metadataCheck.exists && metadataCheck.matches) {
    metadataNeedsSubmission = false;
  }

  // 11. Batch and submit chunks via relay (if any)
  let chunkTransactionHashes: Hash[] = [];
  let chunksSent = 0;

  if (chunksToSend.length > 0) {
    try {
      // Batch chunks to respect server limits (100 transactions, 1MB per request)
      const batches = batchTransactions(chunksToSend);
      const totalBatches = batches.length;

      if (totalBatches > 1) {
        console.log(
          `📦 Splitting ${chunksToSend.length} chunks into ${totalBatches} batch(es)`
        );
      }

      // Submit batches sequentially
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        if (totalBatches > 1) {
          console.log(
            `📤 Sending batch ${batchIndex + 1}/${totalBatches} (${
              batch.length
            } transactions)...`
          );
        }

        const submitResult = await submitTransactionsViaRelay({
          apiUrl: options.apiUrl,
          chainId: options.chainId,
          operatorAddress: userAddress,
          secretKey: options.secretKey,
          transactions: batch,
          sessionToken,
        });

        chunkTransactionHashes.push(...submitResult.transactionHashes);
        chunksSent += submitResult.successfulIndexes.length;

        // Check if ALL transactions in this batch failed
        if (submitResult.failedIndexes.length === batch.length) {
          // All transactions failed - likely due to insufficient funds or network issues
          // Don't retry (would waste app fees) and stop processing subsequent batches
          const errorMessage =
            `Batch ${batchIndex + 1}: All ${
              batch.length
            } transactions failed. ` +
            `Likely due to insufficient backend wallet balance or network issues. ` +
            `Stopping batch processing to avoid wasting app fees.`;

          console.error(`❌ ${errorMessage}`);
          errors.push(new Error(errorMessage));

          // Stop processing subsequent batches
          break;
        }

        // 12. Retry failed chunks in this batch if any (only if some succeeded - partial failure)
        if (
          submitResult.failedIndexes.length > 0 &&
          submitResult.successfulIndexes.length > 0
        ) {
          // Map failed indexes to actual transactions from this batch
          const failedTxs = submitResult.failedIndexes.map((idx) => batch[idx]);

          try {
            const retryResult = await retryFailedTransactions({
              apiUrl: options.apiUrl,
              chainId: options.chainId,
              operatorAddress: userAddress,
              secretKey: options.secretKey,
              failedIndexes: submitResult.failedIndexes,
              originalTransactions: failedTxs,
              storageClient,
              backendWalletAddress,
              sessionToken,
            });

            // Merge retry results
            chunkTransactionHashes.push(...retryResult.transactionHashes);
            chunksSent += retryResult.successfulIndexes.length;

            if (retryResult.failedIndexes.length > 0) {
              errors.push(
                new Error(
                  `Batch ${batchIndex + 1}: ${
                    retryResult.failedIndexes.length
                  } transactions failed after retries`
                )
              );
            }
          } catch (retryError) {
            errors.push(
              retryError instanceof Error
                ? retryError
                : new Error(
                    `Batch ${batchIndex + 1} retry failed: ${String(
                      retryError
                    )}`
                  )
            );
          }
        }

        // Optional: Wait for batch confirmations before next batch
        // This ensures we don't overwhelm the network and provides progress feedback
        if (
          batchIndex < batches.length - 1 &&
          chunkTransactionHashes.length > 0
        ) {
          // Get the hashes from this batch
          const batchHashes = chunkTransactionHashes.slice(
            -submitResult.successfulIndexes.length
          );
          if (batchHashes.length > 0) {
            try {
              await waitForConfirmations({
                publicClient,
                transactionHashes: batchHashes,
                confirmations: 1, // Just 1 confirmation between batches
                timeout: 30000, // 30 second timeout per batch
              });
            } catch (confirmationError) {
              // Log but don't fail - we'll wait for all confirmations later
              console.warn(
                `⚠️  Batch ${
                  batchIndex + 1
                } confirmation timeout (continuing...)`
              );
            }
          }
        }
      }
    } catch (submitError) {
      errors.push(
        submitError instanceof Error
          ? submitError
          : new Error(`Chunk submission failed: ${String(submitError)}`)
      );
    }
  }

  // 13. Wait for chunk transaction confirmations
  if (chunkTransactionHashes.length > 0) {
    try {
      await waitForConfirmations({
        publicClient,
        transactionHashes: chunkTransactionHashes,
        confirmations: 1,
        timeout: 60000,
      });
    } catch (confirmationError) {
      errors.push(
        confirmationError instanceof Error
          ? confirmationError
          : new Error(`Chunk confirmation failed: ${String(confirmationError)}`)
      );
    }
  }

  // 14. Submit metadata directly (user pays gas)
  let metadataTransactionHash: Hash | undefined;
  if (metadataNeedsSubmission) {
    try {
      metadataTransactionHash = await userWalletClient.writeContract({
        address: metadataTx.to as Address,
        abi: metadataTx.abi,
        functionName: metadataTx.functionName,
        args: metadataTx.args,
        value:
          metadataTx.value !== undefined && metadataTx.value > BigInt(0)
            ? metadataTx.value
            : undefined,
      });

      // Wait for metadata confirmation
      await waitForConfirmations({
        publicClient,
        transactionHashes: [metadataTransactionHash],
        confirmations: 1,
        timeout: 60000,
      });
    } catch (metadataError) {
      errors.push(
        metadataError instanceof Error
          ? metadataError
          : new Error(`Metadata submission failed: ${String(metadataError)}`)
      );
    }
  }

  // 15. Return result
  return {
    success: errors.length === 0,
    topLevelHash,
    chunksSent,
    chunksSkipped,
    metadataSubmitted:
      metadataNeedsSubmission && metadataTransactionHash !== undefined,
    chunkTransactionHashes,
    metadataTransactionHash,
    backendWalletAddress,
    errors: errors.length > 0 ? errors : undefined,
  };
}
