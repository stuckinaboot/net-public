import chalk from "chalk";
import { Command } from "commander";
import { formatEther } from "viem";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { UserUpvoteClient } from "@net-protocol/score";
import type { GetUserUpvotesOptions } from "./types";

export async function executeGetUserUpvotes(
  options: GetUserUpvotesOptions
): Promise<void> {
  const userAddress = options.address;
  if (!userAddress.startsWith("0x") || userAddress.length !== 42) {
    exitWithError(
      "Invalid address format (must be 0x-prefixed, 42 characters)"
    );
    return;
  }

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

  try {
    const [given, received, upvotePrice] = await Promise.all([
      client.getUserUpvotesGiven({
        user: userAddress as `0x${string}`,
      }),
      client.getUserUpvotesReceived({
        user: userAddress as `0x${string}`,
      }),
      client.getUpvotePrice(),
    ]);

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            address: userAddress,
            chainId: readOnlyOptions.chainId,
            upvotesGiven: Number(given),
            upvotesReceived: Number(received),
            upvotePriceWei: upvotePrice.toString(),
            upvotePriceEth: formatEther(upvotePrice),
          },
          null,
          2
        )
      );
    } else {
      console.log(chalk.white(`Profile upvotes for ${userAddress}:`));
      console.log(chalk.cyan(`  Upvotes Given:    ${given}`));
      console.log(chalk.cyan(`  Upvotes Received: ${received}`));
      console.log(
        chalk.white(`  Upvote Price:     ${formatEther(upvotePrice)} ETH`)
      );
    }
  } catch (error) {
    exitWithError(
      `Failed to fetch user upvotes: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function registerGetUserUpvotesCommand(
  parent: Command,
  commandName = "user-info"
): void {
  parent
    .command(commandName)
    .description("Get profile upvote stats for a user")
    .requiredOption("--address <address>", "User address to look up")
    .option("--chain-id <id>", "Chain ID (default: 8453 for Base)", (value) =>
      parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeGetUserUpvotes(options);
    });
}
