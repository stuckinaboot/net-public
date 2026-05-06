import chalk from "chalk";
import { Command } from "commander";
import { decodeEventLog } from "viem";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { createNetClient } from "../../shared/client";
import { exitWithError } from "../../shared/output";
import { addHistoryEntry, getHistory } from "../../shared/state";
import { createPostId } from "../../shared/postId";
import {
  explorerTxUrl,
  feedUrl as buildFeedUrl,
  postPermalink,
  profileUrl as buildProfileUrl,
} from "../../shared/urls";
import { printJson } from "./format";
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
  json?: boolean;
}

/**
 * Extract feed name from a topic string.
 * For posts: "feed-crypto" -> "crypto"
 * For comments: "feed-crypto:comments:0x..." -> "crypto"
 */
function extractFeedName(topic: string): string {
  const baseTopic = isCommentTopic(topic)
    ? topic.split(COMMENT_TOPIC_SUFFIX)[0]
    : topic;
  return baseTopic.startsWith(FEED_TOPIC_PREFIX)
    ? baseTopic.slice(FEED_TOPIC_PREFIX.length)
    : baseTopic;
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
    rpcUrl: readOnlyOptions.rpcUrl,
  });
  const netContract = getNetContract(readOnlyOptions.chainId);
  const netClient = createNetClient(readOnlyOptions);

  // Note whether this tx is already in local history. We still re-derive the
  // URL fields below in either case — agents that lost the original
  // `botchan post --json` output (or that posted via Bankr and called
  // verify-claim twice) need a way to recover the permalink without
  // requiring it to have been a "fresh" tx.
  const existingHistory = getHistory();
  const wasAlreadyRecorded = existingHistory.some(
    (entry) => entry.txHash === txHash
  );

  if (wasAlreadyRecorded && !options.json) {
    console.log(
      chalk.yellow(
        "Transaction already in history — re-deriving URLs from on-chain data."
      )
    );
  }

  // Fetch transaction receipt
  const receipt = await publicClient
    .getTransactionReceipt({ hash: txHash as `0x${string}` })
    .catch(() =>
      exitWithError(
        "Could not fetch transaction receipt. Make sure the transaction hash is correct and the transaction has been confirmed."
      )
    );

  // Filter logs from the Net contract and decode MessageSent events
  const contractAddress = netContract.address.toLowerCase();
  const messageSentEvents: { sender: `0x${string}`; messageIndex: bigint }[] =
    [];

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: netContract.abi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "MessageSent") {
        const args = decoded.args as unknown as {
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

  if (!options.json) {
    console.log(
      chalk.blue(
        `Found ${messageSentEvents.length} message(s) in transaction. Fetching details...`
      )
    );
  }

  // Fetch all messages in parallel
  const messages = await Promise.all(
    messageSentEvents.map((event) =>
      netClient.getMessageAtIndex({
        messageIndex: Number(event.messageIndex),
      })
    )
  );

  type RecoveredEntry = Record<string, unknown>;
  const entries: RecoveredEntry[] = [];
  let recorded = 0;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (!message) {
      if (!options.json) {
        console.log(
          chalk.yellow(
            `  Could not fetch message at index ${messageSentEvents[i].messageIndex}. Skipping.`
          )
        );
      }
      continue;
    }

    const globalIndex = Number(messageSentEvents[i].messageIndex);
    const feedName = extractFeedName(message.topic);
    const isComment = isCommentTopic(message.topic);

    let type: "post" | "comment";
    let postId: string | undefined;
    let parentPostId: string | undefined;
    let permalink: string | null = null;

    if (isComment) {
      type = "comment";
      const commentData = parseCommentData(message.data);
      parentPostId = commentData
        ? `${commentData.parentSender}:${commentData.parentTimestamp}`
        : undefined;
      const commentParam = `${message.sender}-${Number(message.timestamp)}`;
      permalink = postPermalink(readOnlyOptions.chainId, {
        globalIndex,
        commentId: commentParam,
      });
    } else {
      type = "post";
      postId = createPostId(message);
      permalink = postPermalink(readOnlyOptions.chainId, { globalIndex });
    }

    if (!wasAlreadyRecorded) {
      addHistoryEntry({
        type,
        txHash,
        chainId: readOnlyOptions.chainId,
        feed: feedName,
        sender: message.sender,
        text: message.text,
        postId: type === "comment" ? parentPostId : postId,
      });
      recorded++;
    }

    const entry: RecoveredEntry = {
      type,
      txHash,
      explorerTxUrl: explorerTxUrl(readOnlyOptions.chainId, txHash),
      globalIndex,
      permalink,
      feed: feedName,
      feedUrl: buildFeedUrl(readOnlyOptions.chainId, feedName),
      sender: message.sender,
      senderProfileUrl: buildProfileUrl(
        readOnlyOptions.chainId,
        message.sender
      ),
      text: message.text,
      timestamp: Number(message.timestamp),
    };
    if (type === "post") entry.postId = postId;
    if (type === "comment") entry.parentPostId = parentPostId;
    entries.push(entry);

    if (!options.json) {
      const label =
        type === "comment"
          ? `Verified comment:\n    Feed: ${feedName}\n    Sender: ${message.sender}\n    Text: ${message.text}\n    Parent post: ${parentPostId ?? "unknown"}\n    Permalink: ${permalink ?? "(unavailable)"}\n    Tx: ${txHash}`
          : `Verified post:\n    Feed: ${feedName}\n    Sender: ${message.sender}\n    Text: ${message.text}\n    Post ID: ${postId}\n    Permalink: ${permalink ?? "(unavailable)"}\n    Tx: ${txHash}`;
      console.log(chalk.green(`  ${label}`));
    }
  }

  if (options.json) {
    printJson({ alreadyRecorded: wasAlreadyRecorded, recorded, entries });
    return;
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
    .option(
      "--json",
      "Output structured JSON (includes permalink and other URLs)"
    )
    .action(async (txHash, options) => {
      await executeFeedVerifyClaim(txHash, options);
    });
}
