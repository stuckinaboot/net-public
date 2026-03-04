import chalk from "chalk";
import { Command } from "commander";
import { formatEther } from "viem";
import {
  parseReadOnlyOptionsWithDefault,
  parseCommonOptionsWithDefault,
} from "../../cli/shared";
import { createWallet } from "../../shared/wallet";
import { encodeTransaction } from "../../shared/encode";
import { exitWithError } from "../../shared/output";
import {
  UserUpvoteClient,
  USER_UPVOTE_CONTRACT,
  NULL_ADDRESS,
  calculateUpvoteCost,
} from "@net-protocol/score";
import type { UpvoteUserOptions } from "./types";

export async function executeUpvoteUser(
  options: UpvoteUserOptions
): Promise<void> {
  const count = parseInt(options.count, 10);
  if (isNaN(count) || count <= 0) {
    exitWithError("Count must be a positive integer");
    return;
  }

  const userAddress = options.address;
  if (!userAddress.startsWith("0x") || userAddress.length !== 42) {
    exitWithError(
      "Invalid address format (must be 0x-prefixed, 42 characters)"
    );
    return;
  }

  const token = (options.token ?? NULL_ADDRESS) as `0x${string}`;
  const feeTier = options.feeTier ? parseInt(options.feeTier, 10) : 0;

  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = new UserUpvoteClient({
    chainId: readOnlyOptions.chainId,
    overrides: readOnlyOptions.rpcUrl
      ? { rpcUrls: [readOnlyOptions.rpcUrl] }
      : undefined,
  });

  // Fetch current upvote price from contract
  let upvotePrice: bigint;
  try {
    upvotePrice = await client.getUpvotePrice();
  } catch (error) {
    exitWithError(
      `Failed to fetch upvote price: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }

  const totalCost = calculateUpvoteCost(count, upvotePrice);

  if (options.encodeOnly) {
    const txConfig = {
      to: USER_UPVOTE_CONTRACT.address,
      abi: USER_UPVOTE_CONTRACT.abi,
      functionName: "upvoteUser" as const,
      args: [userAddress as `0x${string}`, token, BigInt(count), BigInt(feeTier)],
      value: totalCost,
    };
    const encoded = encodeTransaction(txConfig, readOnlyOptions.chainId);
    console.log(JSON.stringify(encoded, null, 2));
    return;
  }

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
    chalk.blue(`Submitting ${count} profile upvote(s) for ${userAddress}...`)
  );

  try {
    const hash = await client.upvoteUser({
      walletClient,
      userToUpvote: userAddress as `0x${string}`,
      token,
      numUpvotes: count,
      feeTier,
      value: totalCost,
    });

    console.log(chalk.green("Profile upvote submitted successfully!"));
    console.log(chalk.white(`  Transaction: ${hash}`));
    console.log(chalk.white(`  User: ${userAddress}`));
    console.log(chalk.white(`  Count: ${count}`));
    console.log(chalk.white(`  Value: ${formatEther(totalCost)} ETH`));
    if (token !== NULL_ADDRESS) {
      console.log(chalk.white(`  Token: ${token}`));
    }
  } catch (error) {
    exitWithError(
      `Failed to submit profile upvote: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function registerUpvoteUserCommand(
  parent: Command,
  commandName = "user"
): void {
  parent
    .command(commandName)
    .description("Upvote a user's profile on Net Protocol")
    .requiredOption("--address <address>", "User address to upvote")
    .requiredOption("--count <n>", "Number of upvotes")
    .option("--token <address>", "Token address (default: null address)")
    .option("--fee-tier <tier>", "Fee tier (default: 0)")
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
      await executeUpvoteUser(options);
    });
}
