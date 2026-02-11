import chalk from "chalk";
import { Command } from "commander";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { createFeedRegistryClient } from "../../shared/client";
import { exitWithError } from "../../shared/output";
import { formatFeed, feedToJson, printJson } from "./format";

interface ListOptions {
  limit?: number;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

/**
 * Execute the feed list command
 */
async function executeFeedList(options: ListOptions): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = createFeedRegistryClient(readOnlyOptions);

  try {
    const feeds = await client.getRegisteredFeeds({
      maxFeeds: options.limit ?? 50,
    });

    if (options.json) {
      printJson(feeds.map((feed, i) => feedToJson(feed, i)));
    } else {
      if (feeds.length === 0) {
        console.log(chalk.yellow("No registered feeds found"));
        return;
      }

      console.log(chalk.white(`Found ${feeds.length} registered feed(s):\n`));
      feeds.forEach((feed, i) => {
        console.log(formatFeed(feed, i));
        if (i < feeds.length - 1) {
          console.log(); // Empty line between feeds
        }
      });
    }
  } catch (error) {
    exitWithError(
      `Failed to fetch feeds: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register the feed list subcommand
 */
export function registerFeedListCommand(parent: Command, commandName = "list"): void {
  parent
    .command(commandName)
    .description("List registered feeds")
    .option(
      "--limit <n>",
      "Maximum number of feeds to display",
      (value) => parseInt(value, 10)
    )
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453 for Base)",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeFeedList(options);
    });
}
