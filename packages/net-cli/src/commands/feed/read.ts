import chalk from "chalk";
import { Command } from "commander";
import type { NetMessage } from "@net-protocol/feeds";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { createFeedClient } from "../../shared/client";
import { exitWithError } from "../../shared/output";
import { getLastSeenTimestamp, markFeedSeen, getMyAddress } from "../../shared/state";
import { formatPost, postToJson, printJson } from "./format";
import { normalizeFeedName } from "./types";

interface ReadOptions {
  limit?: number;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
  sender?: string;
  unseen?: boolean;
  markSeen?: boolean;
}

/**
 * Execute the feed read command
 */
async function executeFeedRead(feed: string, options: ReadOptions): Promise<void> {
  const normalizedFeed = normalizeFeedName(feed);
  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = createFeedClient(readOnlyOptions);
  const limit = options.limit ?? 20;

  try {
    // First check if the feed has any posts
    const count = await client.getFeedPostCount(normalizedFeed);

    if (count === 0) {
      if (options.json) {
        printJson([]);
      } else {
        console.log(chalk.yellow(`No posts found in feed "${normalizedFeed}"`));
      }
      return;
    }

    // Fetch more posts if filtering by sender (we need to find enough matches)
    const fetchLimit = options.sender ? Math.max(limit * 5, 100) : limit;

    let posts = await client.getFeedPosts({
      topic: normalizedFeed,
      maxPosts: fetchLimit,
    });

    // Filter by sender if specified
    if (options.sender) {
      const senderLower = options.sender.toLowerCase();
      posts = posts.filter(
        (post: NetMessage) => post.sender.toLowerCase() === senderLower
      );
      // Apply limit after filtering
      posts = posts.slice(0, limit);
    }

    // Filter to unseen posts if --unseen flag is set
    if (options.unseen) {
      const lastSeen = getLastSeenTimestamp(normalizedFeed);
      const myAddress = getMyAddress();

      posts = posts.filter((post: NetMessage) => {
        // Must be newer than last seen (or no last seen = all are unseen)
        const isNew = lastSeen === null || Number(post.timestamp) > lastSeen;
        // Exclude own posts if myAddress is configured
        const isFromOther = !myAddress || post.sender.toLowerCase() !== myAddress;
        return isNew && isFromOther;
      });
    }

    // Mark feed as seen if --mark-seen flag is set
    // Use the original unfiltered posts to get the true latest timestamp
    if (options.markSeen) {
      const allPosts = await client.getFeedPosts({
        topic: normalizedFeed,
        maxPosts: 1, // Just need the latest
      });
      if (allPosts.length > 0) {
        markFeedSeen(normalizedFeed, allPosts);
      }
    }

    // Fetch comment counts for each post
    const commentCounts = await Promise.all(
      posts.map((post: NetMessage) => client.getCommentCount(post))
    );

    if (options.json) {
      printJson(
        posts.map((post: NetMessage, i: number) => postToJson(post, i, commentCounts[i]))
      );
    } else {
      if (posts.length === 0) {
        const senderNote = options.sender ? ` by ${options.sender}` : "";
        console.log(chalk.yellow(`No posts found in feed "${normalizedFeed}"${senderNote}`));
        return;
      }

      const senderNote = options.sender ? ` by ${options.sender}` : "";
      console.log(
        chalk.white(`Found ${posts.length} post(s) in feed "${normalizedFeed}"${senderNote}:\n`)
      );
      posts.forEach((post: NetMessage, i: number) => {
        console.log(formatPost(post, i, { commentCount: commentCounts[i] }));
        if (i < posts.length - 1) {
          console.log(); // Empty line between posts
        }
      });
    }
  } catch (error) {
    exitWithError(
      `Failed to read feed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register the feed read subcommand
 */
export function registerFeedReadCommand(parent: Command): void {
  parent
    .command("read <feed>")
    .description("Read posts from a feed")
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
    .option("--sender <address>", "Filter posts by sender address")
    .option("--unseen", "Only show posts not yet seen (newer than last --mark-seen)")
    .option("--mark-seen", "Mark the feed as seen up to the latest post")
    .option("--json", "Output in JSON format")
    .action(async (feed, options) => {
      await executeFeedRead(feed, options);
    });
}
