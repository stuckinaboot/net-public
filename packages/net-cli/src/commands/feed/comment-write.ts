import chalk from "chalk";
import { Command } from "commander";
import { parseReadOnlyOptionsWithDefault, parseCommonOptionsWithDefault } from "../../cli/shared";
import { createFeedClient } from "../../shared/client";
import { createWallet, executeTransaction } from "../../shared/wallet";
import { encodeTransaction } from "../../shared/encode";
import { exitWithError } from "../../shared/output";
import { parsePostId, findPostByParsedId } from "../../shared/postId";
import { addHistoryEntry } from "../../shared/state";
import { printJson } from "./format";
import { normalizeFeedName } from "./types";

interface CommentWriteOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  encodeOnly?: boolean;
}

const MAX_MESSAGE_LENGTH = 4000;

/**
 * Execute the feed comment-write command
 */
async function executeFeedCommentWrite(
  feed: string,
  postId: string,
  message: string,
  options: CommentWriteOptions
): Promise<void> {
  const normalizedFeed = normalizeFeedName(feed);

  if (message.length === 0) {
    exitWithError("Comment cannot be empty");
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    exitWithError(
      `Comment too long (${message.length} chars). Maximum is ${MAX_MESSAGE_LENGTH} characters.`
    );
  }

  // Parse post ID
  let parsedId: { sender: `0x${string}`; timestamp: bigint };
  try {
    parsedId = parsePostId(postId);
  } catch (error) {
    exitWithError(
      error instanceof Error ? error.message : "Invalid post ID format"
    );
  }

  // Determine options based on encode-only mode
  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = createFeedClient(readOnlyOptions);

  // First check if the feed has any posts
  const count = await client.getFeedPostCount(normalizedFeed);

  if (count === 0) {
    exitWithError(
      `Feed "${normalizedFeed}" has no posts. Cannot find post ${postId}.`
    );
  }

  // Fetch the target post to get its full data (needed to generate comment topic hash)
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

  const txConfig = client.prepareComment({
    post: targetPost,
    text: message,
  });

  // For encode-only mode, just output the transaction data
  if (options.encodeOnly) {
    const encoded = encodeTransaction(txConfig, readOnlyOptions.chainId);
    printJson(encoded);
    return;
  }

  // For actual execution, we need a private key
  const commonOptions = parseCommonOptionsWithDefault(
    {
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    },
    true // supports --encode-only
  );

  const walletClient = createWallet(
    commonOptions.privateKey,
    commonOptions.chainId,
    commonOptions.rpcUrl
  );

  console.log(chalk.blue(`Commenting on post ${postId}...`));

  try {
    const hash = await executeTransaction(walletClient, txConfig);

    // Record in history
    addHistoryEntry({
      type: "comment",
      txHash: hash,
      chainId: commonOptions.chainId,
      feed: normalizedFeed,
      sender: walletClient.account.address,
      text: message,
      postId: postId,
    });

    console.log(
      chalk.green(
        `Comment posted successfully!\n  Transaction: ${hash}\n  Post: ${postId}\n  Comment: ${message}`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to post comment: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register the feed comment-write subcommand
 */
export function registerFeedCommentWriteCommand(parent: Command): void {
  parent
    .command("comment <feed> <post-id> <message>")
    .description(
      "Comment on a post. Post ID format: {sender}:{timestamp}"
    )
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453 for Base)",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option(
      "--encode-only",
      "Output transaction data as JSON instead of executing"
    )
    .action(async (feed, postId, message, options) => {
      await executeFeedCommentWrite(feed, postId, message, options);
    });
}
