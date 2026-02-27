import { createWalletClient, http, WalletClient, defineChain, PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  getPublicClient,
  getChainRpcUrls,
  getBaseDataSuffix,
} from "@net-protocol/core";
import { StorageClient } from "@net-protocol/storage";
import { checkTransactionExists, typedArgsToArray } from "../utils";
import type {
  TransactionWithId,
  UploadResult,
  CreateWalletClientParams,
  SendTransactionsParams,
} from "../types";

/**
 * Create wallet client from private key
 * Accepts JSON object as parameter
 */
export function createWalletClientFromPrivateKey(
  params: CreateWalletClientParams
): {
  walletClient: WalletClient;
  publicClient: PublicClient;
  operatorAddress: `0x${string}`;
} {
  const { privateKey, chainId, rpcUrl } = params;
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
    dataSuffix: getBaseDataSuffix(chainId),
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
 * Accepts JSON object as parameter
 */
export async function sendTransactionsWithIdempotency(
  params: SendTransactionsParams
): Promise<UploadResult> {
  const { storageClient, walletClient, publicClient, transactions, operatorAddress } = params;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let finalHash: string | undefined;
  const errorMessages: string[] = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    try {
      // Check if this transaction's data already exists (idempotency)
      // Always compare content, not just check existence
      const exists = await checkTransactionExists({
        storageClient,
        tx,
        operatorAddress,
      });

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
      // Convert typed args to array for viem compatibility
      const args = typedArgsToArray(tx.typedArgs);
      if (!walletClient.account) {
        throw new Error("Wallet client must have an account");
      }
      const hash = await walletClient.writeContract({
        account: walletClient.account,
        address: tx.transaction.to as `0x${string}`,
        abi: tx.transaction.abi,
        functionName: tx.transaction.functionName as string,
        args,
        value: tx.transaction.value,
        chain: null,
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
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      console.error(`✗ Transaction ${i + 1} failed: ${errorMsg}`);
      errorMessages.push(errorMsg);
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
    error: errorMessages.length > 0 ? errorMessages.join("; ") : undefined,
  };
}

