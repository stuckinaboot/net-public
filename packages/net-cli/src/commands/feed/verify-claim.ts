import chalk from "chalk";
import { Command } from "commander";
import { decodeEventLog } from "viem";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { createNetClient } from "../../shared/client";
import { exitWithError } from "../../shared/output";
import { addHistoryEntry, getHistory } from "../../shared/state";
import {
  getPublicClient,
  getNetContract,
} from "@net-protocol/core";
import {
  isCommentTopic,
  parseCommentData,
  COMMENT_TOPIC_SUFFIX,
  FEED_TOPIC_PREFIX,
} from "@net-protocol/feeds";

interface VerifyClaimOptions {
  chainId?: number;
  rpcUrl?: string;
}

/**
 * Extract feed name from a topic string.
 * For posts: "feed-crypto" -> "crypto"
 * For comments: "feed-crypto:comments:0x..." -> "crypto"
 */
function extractFeedName(topic: string): string {
  // Strip comment suffix if present
  let baseTopic = topic;
  if (isCommentTopic(topic)) {
    baseTopic = topic.split(COMMENT_TOPIC_SUFFIX)[0];
  }
  // Strip feed- prefix
  if (baseTopic.startsWith(FEED_TOPIC_PREFIX)) {
    return baseTopic.slice(FEED_TOPIC_PREFIX.length);
  }
  return baseTopic;
}

/**
 * Execute the feed verify-claim command
 */
async function executeFeedVerifyClaim(
  txHash: string,
  options: VerifyClaimOptions
): Promise<void> {
  if (!txHash.startsWith("0x") || txHash.length !== 66) {
    exitWithError(
      "Invalid transaction hash format (must be 0x-prefixed, 66 characters)"
    );
  }

  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const publicClient = getPublicClient({
    chainId: readOnlyOptions.chainId,
    rpcUrl: readOnlyOptions.rpcUrl ? [readOnlyOptions.rpcUrl] : undefined,
  });
  const netContract = getNetContract(readOnlyOptions.chainId);
  const netClient = createNetClient(readOnlyOptions);

  // Check if already in history
  const existingHistory = getHistory();
  if (existingHistory.some((entry) => entry.txHash === txHash)) {
    console.log(
      chalk.yellow("Transaction already recorded in history. Skipping.")
    );
    return;
  }

  // Fetch transaction receipt
  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });
  } catch {
    exitWithError(
      "Could not fetch transaction receipt. Make sure the transaction hash is correct and the transaction has been confirmed."
    );
  }

  // Filter logs from the Net contract and decode MessageSent events
  const messageSentEvents: { sender: `0x${string}`; messageIndex: bigint }[] =
    [];

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== netContract.address.toLowerCase()) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: netContract.abi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "MessageSent") {
        const args = decoded.args as {
          sender: `0x${string}`;
          topic: string;
          messageIndex: bigint;
        };
        messageSentEvents.push({
          sender: args.sender,
          messageIndex: args.messageIndex,
        });
      }
    } catch {
      // Not a MessageSent event, skip
    }
  }

  if (messageSentEvents.length === 0) {
    exitWithError(
      "Transaction does not contain any Net protocol messages."
    );
  }

  console.log(
    chalk.blue(
      `Found ${messageSentEvents.length} message(s) in transaction. Fetching details...`
    )
  );

  let recorded = 0;

  for (const event of messageSentEvents) {
    // Fetch full message from contract using messageIndex
    const message = await netClient.getMessageAtIndex({
      messageIndex: Number(event.messageIndex),
    });

    if (!message) {
      console.log(
        chalk.yellow(
          `  Could not fetch message at index ${event.messageIndex}. Skipping.`
        )
      );
      continue;
    }

    const topic = message.topic;
    const feedName = extractFeedName(topic);
    const isComment = isCommentTopic(topic);

    if (isComment) {
      // Decode comment data to get parent post reference
      const commentData = parseCommentData(message.data);
      const postId = commentData
        ? `${commentData.parentSender}:${commentData.parentTimestamp}`
        : undefined;

      addHistoryEntry({
        type: "comment",
        txHash,
        chainId: readOnlyOptions.chainId,
        feed: feedName,
        sender: message.sender,
        text: message.text,
        postId,
      });

      console.log(
        chalk.green(
          `  Verified comment:\n    Feed: ${feedName}\n    Sender: ${message.sender}\n    Text: ${message.text}\n    Parent post: ${postId ?? "unknown"}\n    Tx: ${txHash}`
        )
      );
    } else {
      const postId = `${message.sender}:${message.timestamp}`;

      addHistoryEntry({
        type: "post",
        txHash,
        chainId: readOnlyOptions.chainId,
        feed: feedName,
        sender: message.sender,
        text: message.text,
        postId,
      });

      console.log(
        chalk.green(
          `  Verified post:\n    Feed: ${feedName}\n    Sender: ${message.sender}\n    Text: ${message.text}\n    Post ID: ${postId}\n    Tx: ${txHash}`
        )
      );
    }

    recorded++;
  }

  if (recorded > 0) {
    console.log(
      chalk.green(`\nSuccessfully recorded ${recorded} history entry(ies).`)
    );
  }
}

/**
 * Register the feed verify-claim subcommand
 */
export function registerFeedVerifyClaimCommand(parent: Command): void {
  parent
    .command("verify-claim <tx-hash>")
    .description(
      "Verify a transaction and add it to history. Recovers post/comment details from on-chain data."
    )
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453 for Base)",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .action(async (txHash, options) => {
      await executeFeedVerifyClaim(txHash, options);
    });
}
