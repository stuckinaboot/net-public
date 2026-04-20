import { Command } from "commander";
import chalk from "chalk";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { getChainRpcUrls } from "@net-protocol/core";
import {
  fundBackendWallet,
  checkBackendWalletBalance,
} from "@net-protocol/relay";
import { RELAY_ACCESS_KEY } from "@net-protocol/agents";
import { parseCommonOptionsWithDefault } from "../../cli/shared";
import { exitWithError } from "../../shared/output";

const CHAINS: Record<number, typeof base> = {
  8453: base,
  84532: baseSepolia,
};

/**
 * Register the relay command group with the commander program
 */
export function registerRelayCommand(program: Command): void {
  const relayCommand = program
    .command("relay")
    .description("Relay operations (fund credits, check balance)");

  // Fund
  relayCommand
    .command("fund")
    .description("Add Net credits via x402 USDC payment")
    .option("--amount <usd>", "Amount in USD to fund (default: 0.10)", "0.10")
    .option("--chain-id <id>", "Chain ID (default: 8453)")
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const { privateKey, chainId, rpcUrl } = parseCommonOptionsWithDefault({
        privateKey: options.privateKey,
        chainId: options.chainId ? parseInt(options.chainId, 10) : undefined,
        rpcUrl: options.rpcUrl,
      });

      const amount = parseFloat(options.amount);
      if (isNaN(amount) || amount <= 0) {
        exitWithError("Invalid amount. Must be a positive number.");
      }

      const chain = CHAINS[chainId];
      if (!chain) {
        exitWithError(
          `Chain ${chainId} not supported for relay funding. Use Base (8453) or Base Sepolia (84532).`,
        );
      }

      const account = privateKeyToAccount(privateKey);
      const rpcUrls = getChainRpcUrls({ chainId, rpcUrl });

      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrls[0]),
      });

      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrls[0]),
      });

      // Build signer with correct shape for x402
      const signer = {
        address: account.address,
        signTypedData: (msg: Parameters<typeof walletClient.signTypedData>[0]) =>
          walletClient.signTypedData(msg),
        readContract: (args: Parameters<typeof publicClient.readContract>[0]) =>
          publicClient.readContract(args),
        sendTransaction: (
          args: Parameters<typeof walletClient.sendTransaction>[0],
        ) => walletClient.sendTransaction(args),
      };

      // Dynamic import x402 (ESM-only packages)
      const { x402Client, wrapFetchWithPayment, x402HTTPClient } =
        await import("@x402/fetch");
      const { registerExactEvmScheme } = await import(
        "@x402/evm/exact/client"
      );

      const client = new x402Client();
      registerExactEvmScheme(client, { signer });
      const fetchWithPayment = wrapFetchWithPayment(fetch, client);
      const httpClient = new x402HTTPClient(client);

      const apiUrl =
        chainId === 84532
          ? "https://testnets.netprotocol.app"
          : "https://netprotocol.app";

      if (!options.json) {
        console.log(
          `Funding $${amount.toFixed(2)} USDC to relay on chain ${chainId}...`,
        );
      }

      try {
        const result = await fundBackendWallet({
          apiUrl,
          chainId,
          operatorAddress: account.address,
          secretKey: RELAY_ACCESS_KEY,
          fetchWithPayment,
          httpClient,
          amount,
        });

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                success: true,
                paymentTxHash: result.paymentTxHash,
                backendWalletAddress: result.backendWalletAddress,
                amountUsd: amount,
              },
              null,
              2,
            ),
          );
        } else {
          console.log(chalk.green(`\n✓ Funded $${amount.toFixed(2)} successfully`));
          console.log(`  Payment tx: ${result.paymentTxHash}`);
          console.log(
            `  Backend wallet: ${result.backendWalletAddress}`,
          );
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : String(error);
        if (options.json) {
          console.log(JSON.stringify({ success: false, error: msg }, null, 2));
          process.exit(1);
        }
        exitWithError(`Funding failed: ${msg}`);
      }
    });

  // Balance
  relayCommand
    .command("balance")
    .description("Check relay backend wallet balance")
    .option("--chain-id <id>", "Chain ID (default: 8453)")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const { privateKey, chainId } = parseCommonOptionsWithDefault({
        privateKey: options.privateKey,
        chainId: options.chainId ? parseInt(options.chainId, 10) : undefined,
      });

      const account = privateKeyToAccount(privateKey);
      const apiUrl =
        chainId === 84532
          ? "https://testnets.netprotocol.app"
          : "https://netprotocol.app";

      try {
        const result = await checkBackendWalletBalance({
          apiUrl,
          chainId,
          operatorAddress: account.address,
          secretKey: RELAY_ACCESS_KEY,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`Relay Balance`);
          console.log(`  Backend wallet: ${result.backendWalletAddress}`);
          console.log(`  Balance: ${result.balanceEth} ETH`);
          console.log(
            `  Sufficient: ${result.sufficientBalance ? chalk.green("Yes") : chalk.red("No")} (min: ${result.minRequiredEth} ETH)`,
          );
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : String(error);
        if (options.json) {
          console.log(JSON.stringify({ success: false, error: msg }, null, 2));
          process.exit(1);
        }
        exitWithError(`Balance check failed: ${msg}`);
      }
    });
}
