import { createWalletClient, http, WalletClient, defineChain, PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  getPublicClient,
  getChainRpcUrls,
} from "@net-protocol/core";
import { StorageClient } from "@net-protocol/storage";
import { checkTransactionExists } from "../utils";
import type { TransactionWithId, UploadResult } from "../types";

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
  const chain = publicClient.chain
    ? defineChain({
        id: chainId,
        name: publicClient.chain.name,
        nativeCurrency: publicClient.chain.nativeCurrency,
        rpcUrls: {
          default: { http: rpcUrls },
          public: { http: rpcUrls },
        },
        blockExplorers: publicClient.chain.blockExplorers,
      })
    : defineChain({
        id: chainId,
        name: `Chain ${chainId}`,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
          default: { http: rpcUrls },
          public: { http: rpcUrls },
        },
      });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  return {
    walletClient,
    publicClient: publicClient as PublicClient,
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
      // Always compare content, not just check existence
      const exists = await checkTransactionExists(
        storageClient,
        tx,
        operatorAddress
      );

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
      const hash = await walletClient.writeContract({
        address: tx.transaction.to as `0x${string}`,
        abi: tx.transaction.abi,
        functionName: tx.transaction.functionName as string,
        args: tx.transaction.args as readonly unknown[],
        value: tx.transaction.value,
        chain: undefined,
      });

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

