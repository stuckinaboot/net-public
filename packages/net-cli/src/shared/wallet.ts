import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChainRpcUrls } from "@net-protocol/core";
import type { WriteTransactionConfig } from "@net-protocol/core";

/**
 * Create a wallet client from a private key
 */
export function createWallet(
  privateKey: `0x${string}`,
  chainId: number,
  rpcUrl?: string
) {
  const account = privateKeyToAccount(privateKey);
  const rpcUrls = getChainRpcUrls({
    chainId,
    rpcUrl: rpcUrl,
  });

  return createWalletClient({
    account,
    transport: http(rpcUrls[0]),
  });
}

/**
 * Execute a transaction using a wallet client
 */
export async function executeTransaction(
  walletClient: ReturnType<typeof createWallet>,
  txConfig: WriteTransactionConfig
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: txConfig.to,
    abi: txConfig.abi,
    functionName: txConfig.functionName,
    args: txConfig.args,
    value: txConfig.value,
    chain: null,
  } as Parameters<typeof walletClient.writeContract>[0]);

  return hash;
}
