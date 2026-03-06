import chalk from "chalk";
import { Command } from "commander";
import { parseReadOnlyOptionsWithDefault, parseCommonOptionsWithDefault } from "../../cli/shared";
import { createChatClient } from "../../shared/client";
import { createWallet, executeTransaction } from "../../shared/wallet";
import { encodeTransaction } from "../../shared/encode";
import { exitWithError } from "../../shared/output";
import { normalizeChatName } from "./types";

interface SendOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  encodeOnly?: boolean;
  data?: string;
}

const MAX_MESSAGE_LENGTH = 4000;

/**
 * Execute the chat send command
 */
async function executeChatSend(
  chat: string,
  message: string,
  options: SendOptions
): Promise<void> {
  const normalizedChat = normalizeChatName(chat);

  if (message.length === 0) {
    exitWithError("Message cannot be empty");
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    exitWithError(
      `Message too long (${message.length} chars). Maximum is ${MAX_MESSAGE_LENGTH} characters.`
    );
  }

  // For encode-only mode, we don't need a private key
  if (options.encodeOnly) {
    const readOnlyOptions = parseReadOnlyOptionsWithDefault({
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });

    const client = createChatClient(readOnlyOptions);
    const txConfig = client.prepareSendChatMessage({
      topic: normalizedChat,
      text: message,
      data: options.data,
    });
    const encoded = encodeTransaction(txConfig, readOnlyOptions.chainId);

    console.log(JSON.stringify(encoded, null, 2));
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

  const client = createChatClient(commonOptions);
  const txConfig = client.prepareSendChatMessage({
    topic: normalizedChat,
    text: message,
    data: options.data,
  });

  const walletClient = createWallet(
    commonOptions.privateKey,
    commonOptions.chainId,
    commonOptions.rpcUrl
  );

  console.log(chalk.blue(`Sending message to chat "${normalizedChat}"...`));

  try {
    const hash = await executeTransaction(walletClient, txConfig);

    console.log(
      chalk.green(
        `Message sent successfully!\n  Transaction: ${hash}\n  Chat: ${normalizedChat}\n  Text: ${message}`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to send message: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register the chat send subcommand
 */
export function registerChatSendCommand(parent: Command): void {
  parent
    .command("send <chat> <message>")
    .description("Send a message to a group chat")
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
    .option("--data <data>", "Optional data to attach to the message")
    .action(async (chat, message, options) => {
      await executeChatSend(chat, message, options);
    });
}
