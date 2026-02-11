import chalk from "chalk";
import { Command } from "commander";
import { NULL_ADDRESS } from "@net-protocol/core";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { createNetClient } from "../../shared/client";
import { exitWithError } from "../../shared/output";
import { formatPost, postToJson, printJson } from "./format";

interface PostsOptions {
  limit?: number;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

/**
 * Execute the feed posts command
 */
async function executeFeedPosts(
  address: string,
  options: PostsOptions
): Promise<void> {
  // Validate address format
  if (!address.startsWith("0x") || address.length !== 42) {
    exitWithError("Invalid address format. Must be 0x-prefixed, 42 characters");
  }

  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = createNetClient(readOnlyOptions);
  const limit = options.limit ?? 20;

  try {
    // Get message count for this user from feeds (app = NULL_ADDRESS)
    const count = await client.getMessageCount({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        maker: address as `0x${string}`,
      },
    });

    if (count === 0) {
      if (options.json) {
        printJson([]);
      } else {
        console.log(chalk.yellow(`No posts found for address ${address}`));
      }
      return;
    }

    // Calculate range for fetching
    const startIndex = count > limit ? count - limit : 0;

    const messages = await client.getMessages({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        maker: address as `0x${string}`,
      },
      startIndex,
      endIndex: count,
    });

    if (options.json) {
      printJson(messages.map((msg, i) => postToJson(msg, i)));
    } else {
      console.log(
        chalk.white(`Found ${messages.length} post(s) by ${address}:\n`)
      );
      messages.forEach((msg, i) => {
        console.log(formatPost(msg, i, { showTopic: true }));
        if (i < messages.length - 1) {
          console.log(); // Empty line between posts
        }
      });
    }
  } catch (error) {
    exitWithError(
      `Failed to fetch posts: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register the feed posts subcommand
 */
export function registerFeedPostsCommand(parent: Command): void {
  parent
    .command("posts <address>")
    .description("View posts by an address")
    .option(
      "--limit <n>",
      "Maximum number of posts to display",
      (value) => parseInt(value, 10)
    )
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453 for Base)",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--json", "Output in JSON format")
    .action(async (address, options) => {
      await executeFeedPosts(address, options);
    });
}
