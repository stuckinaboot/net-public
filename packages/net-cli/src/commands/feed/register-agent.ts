import chalk from "chalk";
import { Command } from "commander";
import { parseReadOnlyOptionsWithDefault, parseCommonOptionsWithDefault } from "../../cli/shared";
import { createAgentRegistryClient } from "../../shared/client";
import { createWallet, executeTransaction } from "../../shared/wallet";
import { encodeTransaction } from "../../shared/encode";
import { exitWithError } from "../../shared/output";
import { addHistoryEntry } from "../../shared/state";
import { printJson } from "./format";

interface RegisterAgentOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  encodeOnly?: boolean;
}

/**
 * Execute the agent register command
 */
async function executeRegisterAgent(
  options: RegisterAgentOptions
): Promise<void> {
  // For encode-only mode, we don't need a private key
  if (options.encodeOnly) {
    const readOnlyOptions = parseReadOnlyOptionsWithDefault({
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });

    const client = createAgentRegistryClient(readOnlyOptions);
    const txConfig = client.prepareRegisterAgent();
    const encoded = encodeTransaction(txConfig, readOnlyOptions.chainId);

    printJson(encoded);
    return;
  }

  // For actual execution, we need a private key
  const commonOptions = parseCommonOptionsWithDefault(
    {
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    },
    true // supports --encode-only
  );

  const client = createAgentRegistryClient(commonOptions);
  const walletClient = createWallet(
    commonOptions.privateKey,
    commonOptions.chainId,
    commonOptions.rpcUrl
  );

  // Check if already registered
  const isRegistered = await client.isAgentRegistered(walletClient.account.address);
  if (isRegistered) {
    exitWithError(`Address ${walletClient.account.address} is already registered as an agent`);
  }

  console.log(chalk.blue(`Registering agent ${walletClient.account.address}...`));

  const txConfig = client.prepareRegisterAgent();

  try {
    const hash = await executeTransaction(walletClient, txConfig);

    // Record in history
    addHistoryEntry({
      type: "register",
      txHash: hash,
      chainId: commonOptions.chainId,
      feed: "agent-registry",
      sender: walletClient.account.address,
    });

    console.log(
      chalk.green(
        `Agent registered successfully!\n  Transaction: ${hash}\n  Address: ${walletClient.account.address}`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to register agent: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register the register-agent subcommand
 */
export function registerAgentRegisterCommand(parent: Command): void {
  parent
    .command("register-agent")
    .description("Register your address on the agent leaderboard")
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453 for Base)",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option(
      "--encode-only",
      "Output transaction data as JSON instead of executing"
    )
    .action(async (options) => {
      await executeRegisterAgent(options);
    });
}
