import chalk from "chalk";
import { Command } from "commander";
import { createPublicClient, http, parseEther } from "viem";
import {
  parseReadOnlyOptionsWithDefault,
  parseCommonOptionsWithDefault,
} from "../../cli/shared";
import { createWallet, executeTransaction } from "../../shared/wallet";
import { encodeTransaction } from "../../shared/encode";
import { exitWithError } from "../../shared/output";
import { getChainRpcUrls } from "@net-protocol/core";
import {
  discoverTokenPool,
  getTokenScoreKey,
  encodePoolKey,
  UPVOTE_APP,
  PURE_ALPHA_STRATEGY,
  DYNAMIC_SPLIT_STRATEGY,
  UNIV234_POOLS_STRATEGY,
  UPVOTE_PRICE_ETH,
} from "@net-protocol/score";
import type { UpvoteTokenOptions } from "./types";

async function executeUpvoteToken(options: UpvoteTokenOptions): Promise<void> {
  const count = parseInt(options.count, 10);
  if (isNaN(count) || count <= 0) {
    exitWithError("Count must be a positive integer");
    return;
  }

  const tokenAddress = options.tokenAddress;
  if (!tokenAddress.startsWith("0x") || tokenAddress.length !== 42) {
    exitWithError(
      "Invalid token address format (must be 0x-prefixed, 42 characters)"
    );
    return;
  }

  // Read-only options for pool discovery (always needed)
  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  // Create public client for pool discovery
  const rpcUrls = getChainRpcUrls({
    chainId: readOnlyOptions.chainId,
    rpcUrl: readOnlyOptions.rpcUrl,
  });
  const publicClient = createPublicClient({
    transport: http(rpcUrls[0]),
  });

  console.log(chalk.blue("Discovering Uniswap pool for token..."));

  let poolResult;
  try {
    poolResult = await discoverTokenPool({
      publicClient,
      tokenAddress,
    });
  } catch (error) {
    exitWithError(
      `Failed to discover token pool: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }

  // Determine strategy
  let strategyAddress: `0x${string}`;
  let storedContext: `0x${string}`;

  if (!poolResult || !poolResult.poolKey) {
    // No pool found → pure alpha
    strategyAddress = PURE_ALPHA_STRATEGY.address;
    storedContext = "0x";
    console.log(chalk.yellow("No pool found — using Pure Alpha strategy"));
  } else if (options.splitType === "50/50") {
    // Pool found + 50/50 override → UNIV234_POOLS_STRATEGY
    strategyAddress = UNIV234_POOLS_STRATEGY.address;
    storedContext = encodePoolKey(poolResult.poolKey);
    console.log(
      chalk.green(
        `Pool found (fee: ${poolResult.fee}) — using 50/50 Pools strategy`
      )
    );
  } else {
    // Pool found + default/dynamic → DYNAMIC_SPLIT_STRATEGY
    strategyAddress = DYNAMIC_SPLIT_STRATEGY.address;
    storedContext = encodePoolKey(poolResult.poolKey);
    console.log(
      chalk.green(
        `Pool found (fee: ${poolResult.fee}) — using Dynamic Split strategy`
      )
    );
  }

  // Build transaction config
  const scoreKey = getTokenScoreKey(tokenAddress);
  const value = parseEther((count * UPVOTE_PRICE_ETH).toString());

  const txConfig = {
    to: UPVOTE_APP.address,
    abi: UPVOTE_APP.abi,
    functionName: "upvote" as const,
    args: [strategyAddress, scoreKey, count, storedContext, "0x"],
    value,
  };

  if (options.encodeOnly) {
    const encoded = encodeTransaction(txConfig, readOnlyOptions.chainId);
    console.log(JSON.stringify(encoded, null, 2));
    return;
  }

  // Execute transaction
  const commonOptions = parseCommonOptionsWithDefault(
    {
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    },
    true
  );

  const walletClient = createWallet(
    commonOptions.privateKey,
    commonOptions.chainId,
    commonOptions.rpcUrl
  );

  console.log(
    chalk.blue(`Submitting ${count} upvote(s) for ${tokenAddress}...`)
  );

  try {
    const hash = await executeTransaction(walletClient, txConfig);

    console.log(chalk.green(`Upvote submitted successfully!`));
    console.log(chalk.white(`  Transaction: ${hash}`));
    console.log(chalk.white(`  Token: ${tokenAddress}`));
    console.log(chalk.white(`  Count: ${count}`));
    console.log(
      chalk.white(`  Value: ${(count * UPVOTE_PRICE_ETH).toFixed(6)} ETH`)
    );
  } catch (error) {
    exitWithError(
      `Failed to submit upvote: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function registerUpvoteTokenCommand(
  parent: Command,
  commandName = "token"
): void {
  parent
    .command(commandName)
    .description("Upvote a token on Net Protocol")
    .requiredOption(
      "--token-address <address>",
      "Token contract address to upvote"
    )
    .requiredOption("--count <n>", "Number of upvotes")
    .option(
      "--split-type <type>",
      'Strategy split type: "dynamic" (default) or "50/50"'
    )
    .option("--chain-id <id>", "Chain ID (default: 8453 for Base)", (value) =>
      parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option(
      "--encode-only",
      "Output transaction data as JSON instead of executing"
    )
    .action(async (options) => {
      await executeUpvoteToken(options);
    });
}
