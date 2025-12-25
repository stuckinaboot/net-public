import { createWalletClient, http, WalletClient, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  getPublicClient,
  getChainRpcUrls,
  PublicClient,
} from "@net-protocol/core";
import { StorageClient } from "@net-protocol/storage";
import {
  checkNormalStorageExists,
  checkChunkedStorageExists,
} from "./storage-check";
import type { TransactionWithId, UploadResult } from "./types";

/**
 * Create wallet client from private key
 */
export function createWalletClientFromPrivateKey(
  privateKey: `0x${string}`,
  chainId: number,
  rpcUrl?: string
): {
  walletClient: WalletClient;
  publicClient: PublicClient;
  operatorAddress: `0x${string}`;
} {
  const account = privateKeyToAccount(privateKey);
  const publicClient = getPublicClient({ chainId, rpcUrl });

  // Get RPC URLs for the chain
  const rpcUrls = getChainRpcUrls({ chainId, rpcUrl });

  // Create wallet client with the same chain configuration
  const walletClient = createWalletClient({
    account,
    chain: defineChain({
      id: chainId,
      name: publicClient.chain.name,
      nativeCurrency: publicClient.chain.nativeCurrency,
      rpcUrls: {
        default: { http: rpcUrls },
        public: { http: rpcUrls },
      },
      blockExplorers: publicClient.chain.blockExplorers,
    }),
    transport: http(),
  });

  return {
    walletClient,
    publicClient,
    operatorAddress: account.address,
  };
}

/**
 * Send transactions sequentially with idempotency checks
 * Checks existence before each transaction (handles partial retries)
 */
export async function sendTransactionsWithIdempotency(
  storageClient: StorageClient,
  walletClient: WalletClient,
  publicClient: PublicClient,
  transactions: TransactionWithId[],
  operatorAddress: string
): Promise<UploadResult> {
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let finalHash: string | undefined;

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    try {
      // Check if this transaction's data already exists (idempotency)
      let exists = false;
      if (tx.type === "normal") {
        const check = await checkNormalStorageExists(
          storageClient,
          tx.id,
          operatorAddress,
          "" // Content comparison handled in filter step
        );
        exists = check.exists;
      } else if (tx.type === "chunked") {
        exists = await checkChunkedStorageExists(
          storageClient,
          tx.id,
          operatorAddress
        );
      } else if (tx.type === "metadata") {
        // For metadata, check if it exists (content comparison handled in filter)
        const check = await checkNormalStorageExists(
          storageClient,
          tx.id,
          operatorAddress,
          ""
        );
        exists = check.exists;
      }

      if (exists) {
        console.log(
          `⏭️  Transaction ${i + 1}/${
            transactions.length
          } skipped (already stored): ${tx.id}`
        );
        skipped++;
        continue;
      }

      // Send transaction
      console.log(
        `📤 Sending transaction ${i + 1}/${transactions.length}: ${tx.id}`
      );
      const hash = await walletClient.writeContract(tx.transaction);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(
        `✓ Transaction ${i + 1} confirmed in block ${
          receipt.blockNumber
        } (hash: ${hash})`
      );

      sent++;
      finalHash = hash;
    } catch (error) {
      console.error(
        `✗ Transaction ${i + 1} failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      failed++;
      // Continue with remaining transactions (don't fail entire upload)
    }
  }

  return {
    success: failed === 0,
    skipped: skipped > 0,
    transactionsSent: sent,
    transactionsSkipped: skipped,
    transactionsFailed: failed,
    finalHash,
  };
}
