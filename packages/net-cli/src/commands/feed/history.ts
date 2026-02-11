import chalk from "chalk";
import { Command } from "commander";
import {
  getHistory,
  getHistoryByType,
  clearHistory,
  getHistoryCount,
  type HistoryEntry,
  type HistoryEntryType,
} from "../../shared/state";
import { formatTimestamp, printJson, truncateAddress } from "./format";
import { confirm } from "./confirm";

interface HistoryOptions {
  limit?: number;
  type?: string;
  json?: boolean;
  clear?: boolean;
  force?: boolean;
}

/**
 * Format a history entry for human-readable output
 */
function formatHistoryEntry(entry: HistoryEntry, index: number): string {
  const timestamp = formatTimestamp(entry.timestamp);
  const typeColor =
    entry.type === "post"
      ? chalk.green
      : entry.type === "comment"
        ? chalk.blue
        : chalk.yellow;

  const lines = [
    chalk.cyan(`[${index}]`) +
      ` ${chalk.gray(timestamp)} ` +
      typeColor(entry.type.toUpperCase()),
    `  ${chalk.white("Feed:")} ${entry.feed}`,
    `  ${chalk.white("Tx:")} ${entry.txHash}`,
  ];

  if (entry.sender) {
    lines.push(`  ${chalk.white("Sender:")} ${truncateAddress(entry.sender)}`);
  }

  if (entry.text) {
    const truncatedText =
      entry.text.length > 80 ? entry.text.slice(0, 80) + "..." : entry.text;
    lines.push(`  ${chalk.white("Text:")} ${truncatedText}`);
  }

  // Show postId context based on entry type
  if (entry.type === "post" && entry.postId) {
    lines.push(`  ${chalk.white("Post ID:")} ${entry.postId}`);
  } else if (entry.type === "comment" && entry.postId) {
    lines.push(`  ${chalk.white("Reply to:")} ${entry.postId}`);
  }

  // Show follow-up hint
  if (entry.type === "post" && entry.postId) {
    lines.push(
      chalk.gray(`  → Check replies: netp feed comments ${entry.feed} ${entry.postId}`)
    );
  } else if (entry.type === "post" && entry.sender) {
    lines.push(
      chalk.gray(`  → Find post: netp feed read ${entry.feed} --sender ${entry.sender} --json`)
    );
  } else if (entry.type === "comment" && entry.postId) {
    lines.push(
      chalk.gray(`  → See thread: netp feed comments ${entry.feed} ${entry.postId}`)
    );
  }

  return lines.join("\n");
}

/**
 * Convert a history entry to JSON format
 */
function historyEntryToJson(
  entry: HistoryEntry,
  index: number
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    index,
    type: entry.type,
    timestamp: entry.timestamp,
    txHash: entry.txHash,
    chainId: entry.chainId,
    feed: entry.feed,
  };

  if (entry.sender) {
    result.sender = entry.sender;
  }

  if (entry.text) {
    result.text = entry.text;
  }

  if (entry.postId) {
    result.postId = entry.postId;
  }

  return result;
}

/**
 * Validate history type option
 */
function validateType(type: string): HistoryEntryType {
  const validTypes = ["post", "comment", "register"];
  if (!validTypes.includes(type)) {
    console.error(
      chalk.red(
        `Invalid type "${type}". Must be one of: ${validTypes.join(", ")}`
      )
    );
    process.exit(1);
  }
  return type as HistoryEntryType;
}

/**
 * Execute the feed history command
 */
async function executeFeedHistory(options: HistoryOptions): Promise<void> {
  // Handle --clear
  if (options.clear) {
    const count = getHistoryCount();
    if (count === 0) {
      console.log(chalk.gray("History is already empty."));
      return;
    }

    console.log(chalk.yellow(`This will delete ${count} history entries.`));

    if (!options.force) {
      const confirmed = await confirm(
        chalk.red("\nAre you sure you want to clear history?")
      );
      if (!confirmed) {
        console.log(chalk.gray("Cancelled."));
        return;
      }
    }

    clearHistory();
    console.log(chalk.green("History cleared."));
    return;
  }

  // Get history entries
  let entries: HistoryEntry[];
  if (options.type) {
    const validType = validateType(options.type);
    entries = getHistoryByType(validType, options.limit);
  } else {
    entries = getHistory(options.limit);
  }

  if (entries.length === 0) {
    if (options.json) {
      printJson([]);
    } else {
      console.log(chalk.gray("No history entries found."));
      console.log(
        chalk.gray(
          "History is recorded when you post, comment, or register feeds."
        )
      );
    }
    return;
  }

  // Output
  if (options.json) {
    const jsonEntries = entries.map((entry, idx) =>
      historyEntryToJson(entry, idx)
    );
    printJson(jsonEntries);
  } else {
    const totalCount = getHistoryCount();
    const typeFilter = options.type ? ` (type: ${options.type})` : "";
    console.log(
      chalk.cyan(`Feed History${typeFilter} (${entries.length} of ${totalCount})\n`)
    );

    for (let i = 0; i < entries.length; i++) {
      console.log(formatHistoryEntry(entries[i], i));
      if (i < entries.length - 1) {
        console.log("");
      }
    }
  }
}

/**
 * Register the feed history subcommand
 */
export function registerFeedHistoryCommand(parent: Command): void {
  parent
    .command("history")
    .description("View feed activity history (posts, comments, registrations)")
    .option("--limit <n>", "Limit number of entries", (value) =>
      parseInt(value, 10)
    )
    .option("--type <type>", "Filter by type: post, comment, or register")
    .option("--json", "Output as JSON")
    .option("--clear", "Clear all history")
    .option("--force", "Skip confirmation prompt for --clear")
    .action(async (options) => {
      await executeFeedHistory(options);
    });
}
