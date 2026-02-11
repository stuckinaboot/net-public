import chalk from "chalk";
import { Command } from "commander";
import type { NetMessage } from "@net-protocol/feeds";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { createFeedClient } from "../../shared/client";
import { exitWithError } from "../../shared/output";
import { parsePostId, findPostByParsedId } from "../../shared/postId";
import { formatComment, commentToJson, printJson } from "./format";
import { normalizeFeedName } from "./types";

interface CommentReadOptions {
  limit?: number;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

/**
 * Execute the feed comment-read command
 */
async function executeFeedCommentRead(
  feed: string,
  postId: string,
  options: CommentReadOptions
): Promise<void> {
  const normalizedFeed = normalizeFeedName(feed);
  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = createFeedClient(readOnlyOptions);

  // Parse post ID
  let parsedId: { sender: `0x${string}`; timestamp: bigint };
  try {
    parsedId = parsePostId(postId);
  } catch (error) {
    exitWithError(
      error instanceof Error ? error.message : "Invalid post ID format"
    );
  }

  try {
    // First check if the feed has any posts
    const count = await client.getFeedPostCount(normalizedFeed);

    if (count === 0) {
      exitWithError(
        `Feed "${normalizedFeed}" has no posts. Cannot find post ${postId}.`
      );
    }

    // Fetch posts to find the target post
    const posts = await client.getFeedPosts({
      topic: normalizedFeed,
      maxPosts: 100, // Fetch enough to find the post
    });

    const targetPost = findPostByParsedId(posts, parsedId);
    if (!targetPost) {
      exitWithError(
        `Post not found with ID ${postId} in feed "${normalizedFeed}". Make sure the sender and timestamp are correct.`
      );
    }

    // Check comment count first
    const commentCount = await client.getCommentCount(targetPost);

    if (commentCount === 0) {
      if (options.json) {
        printJson([]);
      } else {
        console.log(chalk.yellow(`No comments found for post ${postId}`));
      }
      return;
    }

    // Fetch comments for the post
    const comments = await client.getComments({
      post: targetPost,
      maxComments: options.limit ?? 50,
    });

    // Build a tree structure for nested comments (simplified - flat with depth)
    // For now, we'll display comments flat with depth 0 (top-level)
    const commentsWithDepth = comments.map((comment: NetMessage) => ({
      comment,
      depth: 0,
    }));

    if (options.json) {
      printJson(
        commentsWithDepth.map(({ comment, depth }) =>
          commentToJson(comment, depth)
        )
      );
    } else {
      if (comments.length === 0) {
        console.log(chalk.yellow(`No comments found for post ${postId}`));
        return;
      }

      console.log(
        chalk.white(`Found ${comments.length} comment(s) for post ${postId}:\n`)
      );
      commentsWithDepth.forEach(({ comment, depth }, i) => {
        console.log(formatComment(comment, depth));
        if (i < commentsWithDepth.length - 1) {
          console.log(); // Empty line between comments
        }
      });
    }
  } catch (error) {
    if ((error as Error).message?.includes("Post not found")) {
      throw error;
    }
    exitWithError(
      `Failed to fetch comments: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register the feed comments subcommand
 */
export function registerFeedCommentReadCommand(parent: Command): void {
  parent
    .command("comments <feed> <post-id>")
    .description(
      "Read comments on a post. Post ID format: {sender}:{timestamp}"
    )
    .option(
      "--limit <n>",
      "Maximum number of comments to display",
      (value) => parseInt(value, 10)
    )
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453 for Base)",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--json", "Output in JSON format")
    .action(async (feed, postId, options) => {
      await executeFeedCommentRead(feed, postId, options);
    });
}
