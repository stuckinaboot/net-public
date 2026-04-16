import chalk from "chalk";
import { Command } from "commander";
import type { Address } from "viem";
import { isAddress } from "viem";
import { createAuthenticatedClient } from "./shared";
import { exitWithError } from "../../shared/output";
import {
  generateAgentChatTopic,
  parseAgentAddressFromTopic,
  isAgentChatTopic,
} from "@net-protocol/agents";

interface DmOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  apiUrl?: string;
  topic?: string;
  json?: boolean;
}

interface DmListOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  apiUrl?: string;
  json?: boolean;
}

interface DmHistoryOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  apiUrl?: string;
  json?: boolean;
  limit?: number;
}

/**
 * Send a DM to an agent
 */
async function executeDm(
  agentAddress: string,
  message: string,
  options: DmOptions,
): Promise<void> {
  try {
    if (!isAddress(agentAddress)) {
      exitWithError(`Invalid agent address: ${agentAddress}`);
    }

    const { client, sessionToken, account } = await createAuthenticatedClient(options);

    // Use provided topic or generate a new one
    const topic = options.topic ?? generateAgentChatTopic(agentAddress as Address);
    const isNewConversation = !options.topic;

    console.log(
      chalk.blue(
        isNewConversation
          ? `Starting new conversation with ${agentAddress}...`
          : `Continuing conversation ${topic}...`,
      ),
    );

    const result = await client.sendMessage(
      {
        sessionToken,
        agentAddress: agentAddress as Address,
        topic,
        message,
      },
      account,
    );

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log();
    console.log(chalk.cyan("You: ") + message);
    console.log(chalk.green("Agent: ") + result.aiMessage);
    console.log();
    console.log(chalk.gray(`  Topic: ${result.topic}`));
    console.log(chalk.gray(`  TX: ${result.transactionHash}`));
    if (isNewConversation) {
      console.log(chalk.gray(`  (Use --topic ${result.topic} to continue this conversation)`));
    }
  } catch (error) {
    exitWithError(
      `Failed to send DM: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * List DM conversations
 */
async function executeDmList(options: DmListOptions): Promise<void> {
  try {
    const { client, operatorAddress } = await createAuthenticatedClient(options);

    console.log(chalk.blue("Loading conversations..."));
    const conversations = await client.listConversations(operatorAddress);

    // Filter to agent-chat conversations
    const agentConversations = conversations.filter((c) =>
      isAgentChatTopic(c.topic),
    );

    if (options.json) {
      console.log(JSON.stringify(agentConversations, null, 2));
      return;
    }

    if (agentConversations.length === 0) {
      console.log(chalk.yellow("No agent conversations found."));
      return;
    }

    console.log(chalk.bold(`Agent Conversations (${agentConversations.length}):\n`));

    for (const conv of agentConversations) {
      const agentAddr = parseAgentAddressFromTopic(conv.topic);
      const encrypted = conv.isEncrypted ? chalk.yellow(" [encrypted]") : "";
      const date = new Date(conv.lastMessageTimestamp * 1000).toLocaleString();

      console.log(`  ${chalk.cyan(agentAddr || "unknown")}${encrypted}`);
      console.log(`    Topic:    ${conv.topic}`);
      console.log(`    Messages: ${conv.messageCount}`);
      console.log(`    Last:     ${date}`);
      if (conv.lastMessage) {
        console.log(`    Preview:  ${conv.lastMessage.slice(0, 60)}${conv.lastMessage.length > 60 ? "..." : ""}`);
      }
      console.log();
    }
  } catch (error) {
    exitWithError(
      `Failed to list conversations: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Read DM conversation history
 */
async function executeDmHistory(topic: string, options: DmHistoryOptions): Promise<void> {
  try {
    const { client, operatorAddress } = await createAuthenticatedClient(options);

    console.log(chalk.blue(`Loading conversation history...`));
    const messages = await client.getConversationHistory(operatorAddress, topic);

    if (options.json) {
      console.log(JSON.stringify(messages, null, 2));
      return;
    }

    if (messages.length === 0) {
      console.log(chalk.yellow("No messages found."));
      return;
    }

    const limit = options.limit ?? messages.length;
    const displayMessages = messages.slice(-limit);

    const agentAddr = parseAgentAddressFromTopic(topic);
    console.log(chalk.bold(`Conversation with ${agentAddr || topic} (${displayMessages.length} messages):\n`));

    for (const msg of displayMessages) {
      const date = new Date(msg.timestamp * 1000).toLocaleString();
      const prefix = msg.sender === "user" ? chalk.cyan("You") : chalk.green("Agent");
      const encrypted = msg.encrypted ? chalk.yellow(" [encrypted]") : "";
      console.log(`  ${prefix}${encrypted} (${chalk.gray(date)}):`);
      console.log(`    ${msg.text}`);
      console.log();
    }
  } catch (error) {
    exitWithError(
      `Failed to load history: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentDmCommand(parent: Command): void {
  parent
    .command("dm <agentAddress> <message>")
    .description("Send a DM to an onchain agent")
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option("--api-url <url>", "Net Protocol API URL")
    .option("--topic <topic>", "Continue an existing conversation")
    .option("--json", "Output as JSON")
    .action(async (agentAddress, message, options) => {
      await executeDm(agentAddress, message, options);
    });
}

export function registerAgentDmListCommand(parent: Command): void {
  parent
    .command("dm-list")
    .description("List your DM conversations with agents")
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option("--api-url <url>", "Net Protocol API URL")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      await executeDmList(options);
    });
}

export function registerAgentDmHistoryCommand(parent: Command): void {
  parent
    .command("dm-history <topic>")
    .description("Read conversation history for a DM topic")
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option("--api-url <url>", "Net Protocol API URL")
    .option("--limit <n>", "Number of recent messages to show", (v) => parseInt(v, 10))
    .option("--json", "Output as JSON")
    .action(async (topic, options) => {
      await executeDmHistory(topic, options);
    });
}
