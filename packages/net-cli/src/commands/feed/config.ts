import chalk from "chalk";
import { Command } from "commander";
import {
  getMyAddress,
  setMyAddress,
  clearMyAddress,
  getFullState,
  resetState,
  getStateFilePath,
  getHistoryCount,
  getContacts,
  getActiveFeeds,
} from "../../shared/state";
import { formatTimestamp } from "./format";
import { confirm } from "./confirm";

interface ConfigOptions {
  myAddress?: string;
  clearAddress?: boolean;
  show?: boolean;
  reset?: boolean;
  force?: boolean;
}

/**
 * Execute the feed config command
 */
async function executeFeedConfig(options: ConfigOptions): Promise<void> {
  // Handle --reset
  if (options.reset) {
    const statePath = getStateFilePath();
    console.log(chalk.yellow(`This will delete all stored state at:`));
    console.log(chalk.white(`  ${statePath}`));
    console.log(chalk.yellow(`\nThis includes:`));
    console.log(chalk.white(`  - All "last seen" timestamps for feeds`));
    console.log(chalk.white(`  - Your configured address`));
    console.log(chalk.white(`  - Your activity history`));

    if (!options.force) {
      const confirmed = await confirm(chalk.red("\nAre you sure you want to reset?"));
      if (!confirmed) {
        console.log(chalk.gray("Cancelled."));
        return;
      }
    }

    resetState();
    console.log(chalk.green("State reset successfully."));
    return;
  }

  // Handle --my-address
  if (options.myAddress) {
    // Basic validation
    if (!options.myAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.error(chalk.red("Invalid address format. Expected 0x followed by 40 hex characters."));
      process.exit(1);
    }
    setMyAddress(options.myAddress);
    console.log(chalk.green(`Set my address to: ${options.myAddress}`));
    return;
  }

  // Handle --clear-address
  if (options.clearAddress) {
    clearMyAddress();
    console.log(chalk.green("Cleared my address."));
    return;
  }

  // Default: --show (or no options)
  const state = getFullState();
  const myAddress = getMyAddress();

  console.log(chalk.cyan("Feed Configuration\n"));
  console.log(chalk.white(`State file: ${getStateFilePath()}`));
  console.log(chalk.white(`My address: ${myAddress ?? chalk.gray("(not set)")}`));

  const feedCount = Object.keys(state.feeds).length;
  console.log(chalk.white(`Tracked feeds: ${feedCount}`));

  const historyCount = getHistoryCount();
  console.log(chalk.white(`History entries: ${historyCount}`));

  if (feedCount > 0 && feedCount <= 20) {
    console.log(chalk.gray("\nLast seen timestamps:"));
    for (const [feed, data] of Object.entries(state.feeds)) {
      const date = new Date(data.lastSeenTimestamp * 1000);
      console.log(chalk.gray(`  ${feed}: ${date.toLocaleString()}`));
    }
  } else if (feedCount > 20) {
    console.log(chalk.gray(`\n(${feedCount} feeds tracked, use --json for full list)`));
  }

  // Show active feeds (topics the agent has participated in)
  const activeFeeds = getActiveFeeds();
  if (activeFeeds.length > 0) {
    console.log(chalk.cyan("\nActive Feeds:"));
    const displayFeeds = activeFeeds.slice(0, 10);
    for (const feed of displayFeeds) {
      const activity = [];
      if (feed.postCount > 0) activity.push(`${feed.postCount} post${feed.postCount !== 1 ? "s" : ""}`);
      if (feed.commentCount > 0) activity.push(`${feed.commentCount} comment${feed.commentCount !== 1 ? "s" : ""}`);
      const lastActive = formatTimestamp(feed.lastActivity);
      console.log(chalk.white(`  ${feed.feed}`) + chalk.gray(` • ${activity.join(", ")} • ${lastActive}`));
    }
    if (activeFeeds.length > 10) {
      console.log(chalk.gray(`  ... and ${activeFeeds.length - 10} more`));
    }
  }

  // Show contacts (wallet addresses the agent has DM'd)
  const contacts = getContacts();
  if (contacts.length > 0) {
    console.log(chalk.cyan("\nRecent Contacts (DMs):"));
    const displayContacts = contacts.slice(0, 10);
    for (const contact of displayContacts) {
      const truncAddr = `${contact.address.slice(0, 6)}...${contact.address.slice(-4)}`;
      const msgCount = contact.interactionCount;
      const lastActive = formatTimestamp(contact.lastInteraction);
      console.log(
        chalk.white(`  ${truncAddr}`) +
        chalk.gray(` • ${msgCount} message${msgCount !== 1 ? "s" : ""} • ${lastActive}`)
      );
    }
    if (contacts.length > 10) {
      console.log(chalk.gray(`  ... and ${contacts.length - 10} more`));
    }
  }
}

/**
 * Register the feed config subcommand
 */
export function registerFeedConfigCommand(parent: Command): void {
  parent
    .command("config")
    .description("View or modify feed configuration")
    .option("--my-address <address>", "Set your address (to filter out own posts with --unseen)")
    .option("--clear-address", "Clear your configured address")
    .option("--show", "Show current configuration (default)")
    .option("--reset", "Reset all state (clears last-seen timestamps and address)")
    .option("--force", "Skip confirmation prompt for --reset")
    .action(async (options) => {
      await executeFeedConfig(options);
    });
}
