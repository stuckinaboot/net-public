import chalk from "chalk";
import { Command } from "commander";
import { parseReadOnlyOptionsWithDefault, parseCommonOptionsWithDefault } from "../../cli/shared";
import { createFeedClient, createNetClient } from "../../shared/client";
import { createWallet, executeTransaction } from "../../shared/wallet";
import { encodeTransaction } from "../../shared/encode";
import { exitWithError } from "../../shared/output";
import { parsePostId } from "../../shared/postId";
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

interface CommentWriteOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  encodeOnly?: boolean;
  json?: boolean;
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

  // Fetch the target post to get its full data (needed to generate comment
  // topic hash) and its absolute topic-stream index (needed for the parent
  // post permalink we return alongside the comment).
  const fetched = await client.getFeedPostsWithIndex({
    topic: normalizedFeed,
    maxPosts: 100,
  });

  const matchOffset = fetched.messages.findIndex(
    (p) =>
      p.sender.toLowerCase() === parsedId.sender.toLowerCase() &&
      p.timestamp === parsedId.timestamp
  );
  const targetPost = matchOffset >= 0 ? fetched.messages[matchOffset] : undefined;
  if (!targetPost) {
    exitWithError(
      `Post not found with ID ${postId} in feed "${normalizedFeed}". Make sure the sender and timestamp are correct.`
    );
  }
  const parentTopicIndex = fetched.startIndex + matchOffset;

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

  if (!options.json) {
    console.log(chalk.blue(`Commenting on post ${postId}...`));
  }

  try {
    const hash = await executeTransaction(walletClient, txConfig);
    const senderAddress = walletClient.account.address;

    let globalIndex: number | undefined;
    try {
      const indices = await getMessageIndicesFromTx({
        chainId: commonOptions.chainId,
        rpcUrl: commonOptions.rpcUrl,
        txHash: hash,
      });
      globalIndex = indices[0];
    } catch {
      // Non-fatal.
    }

    // Fetch the just-posted comment from chain to get its real on-chain
    // timestamp. We need that exact timestamp to build the deep-link
    // commentId param (`{sender}-{timestamp}`); using local clock time
    // would silently produce a broken URL.
    let commentTimestamp: number | undefined;
    if (globalIndex !== undefined) {
      try {
        const netClient = createNetClient(commonOptions);
        const fetchedComment = await netClient.getMessageAtIndex({
          messageIndex: globalIndex,
        });
        if (fetchedComment) {
          commentTimestamp = Number(fetchedComment.timestamp);
        }
      } catch {
        // Non-fatal — we'll fall back to a permalink without the highlight.
      }
    }

    addHistoryEntry({
      type: "comment",
      txHash: hash,
      chainId: commonOptions.chainId,
      feed: normalizedFeed,
      sender: senderAddress,
      text: message,
      postId: postId,
    });

    // Build permalinks. The parent post URL uses the absolute topic index
    // we recovered from getFeedPostsWithIndex above. The primary `permalink`
    // for the comment is the parent's URL with `&commentId=...` so the
    // deep-link highlights the new comment in context. If we couldn't
    // recover the on-chain timestamp, fall back to `?index={globalIndex}`
    // (which renders the comment as a post — still useful, just no
    // surrounding context).
    const parentPostUrl = postPermalink(commonOptions.chainId, {
      topic: normalizedFeed,
      topicIndex: parentTopicIndex,
    });
    const commentPermalink =
      commentTimestamp !== undefined
        ? postPermalink(commonOptions.chainId, {
            topic: normalizedFeed,
            topicIndex: parentTopicIndex,
            commentId: `${senderAddress}-${commentTimestamp}`,
          })
        : postPermalink(commonOptions.chainId, { globalIndex });

    if (options.json) {
      printJson({
        success: true,
        txHash: hash,
        explorerTxUrl: explorerTxUrl(commonOptions.chainId, hash),
        globalIndex,
        permalink: commentPermalink,
        parentPostId: postId,
        parentPostUrl,
        feed: normalizedFeed,
        feedUrl: buildFeedUrl(commonOptions.chainId, normalizedFeed),
        sender: senderAddress,
        senderProfileUrl: buildProfileUrl(commonOptions.chainId, senderAddress),
        text: message,
        ...(commentTimestamp !== undefined && {
          commentId: `${senderAddress}:${commentTimestamp}`,
        }),
      });
      return;
    }

    const lines = [
      `Comment posted successfully!`,
      `  Transaction: ${hash}`,
      `  Post: ${postId}`,
    ];
    if (commentPermalink) lines.push(`  Permalink: ${commentPermalink}`);
    lines.push(`  Comment: ${message}`);

    console.log(chalk.green(lines.join("\n")));
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
    .option(
      "--json",
      "Output structured JSON (includes permalink and other URLs) after submission"
    )
    .action(async (feed, postId, message, options) => {
      await executeFeedCommentWrite(feed, postId, message, options);
    });
}
