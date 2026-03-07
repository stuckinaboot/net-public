import chalk from "chalk";
import { Command } from "commander";
import type { NetMessage } from "@net-protocol/chats";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { createChatClient } from "../../shared/client";
import { exitWithError } from "../../shared/output";
import { normalizeChatName } from "./types";

interface ReadOptions {
  limit?: number;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
  sender?: string;
}

function formatMessage(msg: NetMessage, index: number): string {
  const time = new Date(Number(msg.timestamp) * 1000).toLocaleString();
  const sender = msg.sender.slice(0, 6) + "..." + msg.sender.slice(-4);
  return `  ${chalk.gray(`[${index + 1}]`)} ${chalk.cyan(sender)} ${chalk.gray(time)}\n  ${msg.text}`;
}

function messageToJson(msg: NetMessage, index: number) {
  return {
    index,
    sender: msg.sender,
    text: msg.text,
    timestamp: Number(msg.timestamp),
    data: msg.data,
  };
}

function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Execute the chat read command
 */
async function executeChatRead(chat: string, options: ReadOptions): Promise<void> {
  const normalizedChat = normalizeChatName(chat);
  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = createChatClient(readOnlyOptions);
  const limit = options.limit ?? 20;

  try {
    const count = await client.getChatMessageCount(normalizedChat);

    if (count === 0) {
      if (options.json) {
        printJson([]);
      } else {
        console.log(chalk.yellow(`No messages found in chat "${normalizedChat}"`));
      }
      return;
    }

    const fetchLimit = options.sender ? Math.max(limit * 5, 100) : limit;

    let messages = await client.getChatMessages({
      topic: normalizedChat,
      maxMessages: fetchLimit,
    });

    // Filter by sender if specified
    if (options.sender) {
      const senderLower = options.sender.toLowerCase();
      messages = messages.filter(
        (msg: NetMessage) => msg.sender.toLowerCase() === senderLower
      );
      messages = messages.slice(0, limit);
    }

    if (options.json) {
      printJson(
        messages.map((msg: NetMessage, i: number) => messageToJson(msg, i))
      );
    } else {
      if (messages.length === 0) {
        const senderNote = options.sender ? ` by ${options.sender}` : "";
        console.log(chalk.yellow(`No messages found in chat "${normalizedChat}"${senderNote}`));
        return;
      }

      const senderNote = options.sender ? ` by ${options.sender}` : "";
      console.log(
        chalk.white(`Found ${messages.length} message(s) in chat "${normalizedChat}"${senderNote}:\n`)
      );
      messages.forEach((msg: NetMessage, i: number) => {
        console.log(formatMessage(msg, i));
        if (i < messages.length - 1) {
          console.log(); // Empty line between messages
        }
      });
    }
  } catch (error) {
    exitWithError(
      `Failed to read chat: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register the chat read subcommand
 */
export function registerChatReadCommand(parent: Command): void {
  parent
    .command("read <chat>")
    .description("Read messages from a group chat (NOT 'read' — that's for feeds)")
    .option(
      "--limit <n>",
      "Maximum number of messages to display",
      (value) => parseInt(value, 10)
    )
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453 for Base)",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--sender <address>", "Filter messages by sender address")
    .option("--json", "Output in JSON format")
    .action(async (chat, options) => {
      await executeChatRead(chat, options);
    });
}
