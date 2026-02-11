import chalk from "chalk";
import { Command } from "commander";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { createFeedClient } from "../../shared/client";
import { getHistoryByType, type HistoryEntry } from "../../shared/state";
import { printJson } from "./format";
import { formatTimestamp } from "./format";

interface RepliesOptions {
  chainId?: number;
  rpcUrl?: string;
  limit?: number;
  json?: boolean;
}

interface PostWithReplies {
  feed: string;
  postId: string;
  text: string;
  postedAt: number;
  commentCount: number;
}

/**
 * Truncate text for display
 */
function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

/**
 * Execute the feed replies command
 */
async function executeFeedReplies(options: RepliesOptions): Promise<void> {
  // Get recent posts from history that have post IDs
  const postHistory = getHistoryByType("post", options.limit ?? 10);
  const postsWithIds = postHistory.filter(
    (entry): entry is HistoryEntry & { postId: string } => !!entry.postId
  );

  if (postsWithIds.length === 0) {
    if (options.json) {
      printJson([]);
    } else {
      console.log(chalk.gray("No posts with trackable IDs found in history."));
      console.log(
        chalk.gray("Post IDs are captured when you post with a wallet.")
      );
    }
    return;
  }

  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = createFeedClient(readOnlyOptions);

  console.log(chalk.blue(`Checking replies on ${postsWithIds.length} posts...\n`));

  const results: PostWithReplies[] = [];

  for (const entry of postsWithIds) {
    try {
      // Parse post ID to get sender and timestamp
      const [sender, timestampStr] = entry.postId.split(":");
      const timestamp = BigInt(timestampStr);

      // Get comment count for this post
      // Construct a minimal post object for the comment count query
      const postObj = {
        sender: sender as `0x${string}`,
        timestamp,
        text: entry.text ?? "",
        topic: entry.feed,
        app: "" as `0x${string}`,
        data: "0x" as `0x${string}`,
      };
      const commentCount = await client.getCommentCount(postObj);

      results.push({
        feed: entry.feed,
        postId: entry.postId,
        text: entry.text ?? "",
        postedAt: entry.timestamp,
        commentCount: Number(commentCount),
      });
    } catch {
      // Skip posts we can't check (e.g., if feed no longer exists)
    }
  }

  if (options.json) {
    printJson(results);
    return;
  }

  // Display results
  const postsWithReplies = results.filter((r) => r.commentCount > 0);
  const totalReplies = results.reduce((sum, r) => sum + r.commentCount, 0);

  console.log(
    chalk.cyan(
      `Found ${totalReplies} total replies across ${postsWithReplies.length} posts\n`
    )
  );

  if (results.length === 0) {
    console.log(chalk.gray("Could not check any posts."));
    return;
  }

  // Sort by comment count (most replies first)
  results.sort((a, b) => b.commentCount - a.commentCount);

  for (const post of results) {
    const timeAgo = formatTimestamp(post.postedAt);
    const replyText =
      post.commentCount === 0
        ? chalk.gray("no replies")
        : post.commentCount === 1
          ? chalk.green("1 reply")
          : chalk.green(`${post.commentCount} replies`);

    console.log(
      `${chalk.white(post.feed)} ${chalk.gray("•")} ${replyText} ${chalk.gray(`• ${timeAgo}`)}`
    );
    console.log(`  ${chalk.gray(truncateText(post.text, 60))}`);

    if (post.commentCount > 0) {
      console.log(
        chalk.blue(`  → netp feed comments ${post.feed} ${post.postId}`)
      );
    }
    console.log("");
  }
}

/**
 * Register the feed replies subcommand
 */
export function registerFeedRepliesCommand(parent: Command): void {
  parent
    .command("replies")
    .description("Check for replies on your recent posts")
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453 for Base)",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--limit <n>", "Number of recent posts to check (default: 10)", (value) =>
      parseInt(value, 10)
    )
    .option("--json", "Output as JSON")
    .action(async (options) => {
      await executeFeedReplies(options);
    });
}
