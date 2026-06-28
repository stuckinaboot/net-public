import chalk from "chalk";
import { Command } from "commander";
import { parseReadOnlyOptionsWithDefault, parseCommonOptionsWithDefault } from "../../cli/shared";
import { createFeedClient } from "../../shared/client";
import { createWallet, executeTransaction } from "../../shared/wallet";
import { encodeTransaction } from "../../shared/encode";
import { exitWithError } from "../../shared/output";
import { addHistoryEntry } from "../../shared/state";
import { getMessageIndicesFromTx } from "../../shared/messageIndex";
import {
  explorerTxUrl,
  feedUrl as buildFeedUrl,
  postPermalink,
  profileUrl as buildProfileUrl,
} from "../../shared/urls";
import { printJson } from "./format";
import { normalizeFeedName } from "./types";

interface PostOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  encodeOnly?: boolean;
  data?: string;
  body?: string;
  json?: boolean;
}

const MAX_MESSAGE_LENGTH = 4000;

/**
 * Execute the feed post command
 */
async function executeFeedPost(
  feed: string,
  message: string,
  options: PostOptions
): Promise<void> {
  const normalizedFeed = normalizeFeedName(feed);

  if (message.length === 0) {
    exitWithError("Message cannot be empty");
  }

  // If --body is provided, format as title + body
  // The message argument becomes the title, --body becomes the body
  const fullMessage = options.body
    ? `${message}\n\n${options.body}`
    : message;

  if (fullMessage.length > MAX_MESSAGE_LENGTH) {
    exitWithError(
      `Message too long (${fullMessage.length} chars). Maximum is ${MAX_MESSAGE_LENGTH} characters.`
    );
  }

  // For encode-only mode, we don't need a private key
  if (options.encodeOnly) {
    const readOnlyOptions = parseReadOnlyOptionsWithDefault({
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });

    const client = createFeedClient(readOnlyOptions);
    const txConfig = client.preparePostToFeed({
      topic: normalizedFeed,
      text: fullMessage,
      data: options.data,
    });
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

  const client = createFeedClient(commonOptions);
  const txConfig = client.preparePostToFeed({
    topic: normalizedFeed,
    text: fullMessage,
    data: options.data,
  });

  const walletClient = createWallet(
    commonOptions.privateKey,
    commonOptions.chainId,
    commonOptions.rpcUrl
  );

  if (!options.json) {
    console.log(chalk.blue(`Posting to feed "${normalizedFeed}"...`));
  }

  try {
    const hash = await executeTransaction(walletClient, txConfig);
    const senderAddress = walletClient.account.address;

    // Recover the post ID and the global Net message index from the receipt.
    // The MessageSent event gives us the most reliable index for permalinks.
    let postId: string | undefined;
    let globalIndex: number | undefined;
    try {
      const indices = await getMessageIndicesFromTx({
        chainId: commonOptions.chainId,
        rpcUrl: commonOptions.rpcUrl,
        txHash: hash,
      });
      globalIndex = indices[0];
    } catch {
      // Non-fatal: we'll still try the legacy fallback below.
    }
    try {
      const posts = await client.getFeedPosts({
        topic: normalizedFeed,
        maxPosts: 10,
      });
      const ourPost = posts.find(
        (p) =>
          p.sender.toLowerCase() === senderAddress.toLowerCase() &&
          p.text === fullMessage
      );
      if (ourPost) {
        postId = `${ourPost.sender}:${ourPost.timestamp}`;
      }
    } catch {
      // Non-fatal.
    }

    addHistoryEntry({
      type: "post",
      txHash: hash,
      chainId: commonOptions.chainId,
      feed: normalizedFeed,
      sender: senderAddress,
      text: fullMessage,
      postId,
    });

    const permalink = postPermalink(commonOptions.chainId, {
      globalIndex,
    });

    if (options.json) {
      printJson({
        success: true,
        txHash: hash,
        explorerTxUrl: explorerTxUrl(commonOptions.chainId, hash),
        postId,
        globalIndex,
        permalink,
        feed: normalizedFeed,
        feedUrl: buildFeedUrl(commonOptions.chainId, normalizedFeed),
        sender: senderAddress,
        senderProfileUrl: buildProfileUrl(commonOptions.chainId, senderAddress),
        text: fullMessage,
      });
      return;
    }

    const displayText = options.body
      ? `${message} (+ body)`
      : message;

    const lines = [
      `Message posted successfully!`,
      `  Transaction: ${hash}`,
      `  Feed: ${normalizedFeed}`,
    ];
    if (postId) lines.push(`  Post ID: ${postId}`);
    if (permalink) lines.push(`  Permalink: ${permalink}`);
    lines.push(`  Text: ${displayText}`);

    console.log(chalk.green(lines.join("\n")));
  } catch (error) {
    exitWithError(
      `Failed to post message: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register the feed post subcommand
 */
export function registerFeedPostCommand(parent: Command): void {
  parent
    .command("post <feed> <message>")
    .description("Post a message to a feed (for group chats, use 'chat send' instead)")
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
    .option("--data <data>", "Optional data to attach to the post")
    .option("--body <text>", "Post body (message becomes the title)")
    .option(
      "--json",
      "Output structured JSON (includes permalink and other URLs) after submission"
    )
    .action(async (feed, message, options) => {
      await executeFeedPost(feed, message, options);
    });
}
