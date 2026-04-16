import chalk from "chalk";
import { Command } from "commander";
import type { Address, Hex } from "viem";
import { isAddress } from "viem";
import { resolveAuth, resolveReadOnly, jsonStringify } from "./shared";
import { exitWithError } from "../../shared/output";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import {
  generateAgentChatTopic,
  parseAgentAddressFromTopic,
  isAgentChatTopic,
  buildConversationAuthTypedData,
  AgentClient,
} from "@net-protocol/agents";

interface DmOptions {
  // Auth
  privateKey?: string;
  sessionToken?: string;
  operator?: string;
  // Common
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
  // DM-specific
  topic?: string;
  topicSignature?: string;
  json?: boolean;
}

interface DmListOptions {
  operator?: string;
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
  json?: boolean;
}

interface DmHistoryOptions {
  operator?: string;
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
  json?: boolean;
  limit?: number;
}

// ============================================================
// dm (send)
// ============================================================

async function executeDm(
  agentAddress: string,
  message: string,
  options: DmOptions,
): Promise<void> {
  try {
    if (!isAddress(agentAddress)) {
      exitWithError(`Invalid agent address: ${agentAddress}`);
    }

    // --topic-signature requires --topic (the topic the signature authorizes)
    if (options.topicSignature && !options.topic) {
      exitWithError(
        "--topic-signature requires --topic (the topic the signature authorizes)",
      );
    }

    // Session-token path can't sign topics locally, so it must bring its own
    // --topic and --topic-signature. Catch this up-front with a clear message
    // rather than falling through to a generic "signer required" error.
    const usingSessionToken = !!(
      options.sessionToken || process.env.NET_SESSION_TOKEN
    );
    if (usingSessionToken) {
      if (!options.topic || !options.topicSignature) {
        exitWithError(
          "When using --session-token, you must also provide --topic and --topic-signature.\n" +
            "  Obtain the signature with:\n" +
            "    netp agent dm-auth-encode --agent-address <addr>  → produces { typedData, topic }\n" +
            "    [sign .typedData with your external signer, e.g. Bankr /agent/sign]\n" +
            "  Then:\n" +
            "    netp agent dm <addr> <message> --session-token <token> --operator <addr> \\\n" +
            "      --topic <topic> --topic-signature <sig>",
        );
      }
    }

    const auth = await resolveAuth(options);

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

    // When --topic-signature is provided, pass it directly (external signer path).
    // Otherwise auth.account signs it (private key path).
    const result = await auth.client.sendMessage(
      {
        sessionToken: auth.sessionToken,
        agentAddress: agentAddress as Address,
        topic,
        message,
        userSignature: options.topicSignature as Hex | undefined,
      },
      auth.account,
    );

    if (options.json) {
      console.log(jsonStringify(result));
      return;
    }

    console.log();
    console.log(chalk.cyan("You: ") + message);
    console.log(chalk.green("Agent: ") + result.aiMessage);
    console.log();
    console.log(chalk.gray(`  Topic: ${result.topic}`));
    console.log(chalk.gray(`  TX: ${result.transactionHash}`));
    if (isNewConversation) {
      console.log(
        chalk.gray(`  (Use --topic ${result.topic} to continue this conversation)`),
      );
    }
  } catch (error) {
    exitWithError(
      `Failed to send DM: ${error instanceof Error ? error.message : String(error)}`,
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
    .option(
      "--session-token <token>",
      "Pre-existing session token (alternative to --private-key, e.g., for Bankr)",
    )
    .option(
      "--operator <address>",
      "Operator address (required with --session-token)",
    )
    .option("--api-url <url>", "Net Protocol API URL")
    .option("--topic <topic>", "Continue an existing conversation")
    .option(
      "--topic-signature <hex>",
      "Pre-signed ConversationAuth signature (requires --topic). " +
        "Obtain via `agent dm-auth-encode` + external signer.",
    )
    .option("--json", "Output as JSON")
    .action(async (agentAddress, message, options) => {
      await executeDm(agentAddress, message, options);
    });
}

// ============================================================
// dm-list
// ============================================================

async function executeDmList(options: DmListOptions): Promise<void> {
  try {
    const { chainId, apiUrl, operator } = resolveReadOnly(options);

    if (!operator) {
      exitWithError(
        "--operator <address> is required (user wallet address to list conversations for)",
      );
    }

    const client = new AgentClient({ apiUrl, chainId });

    console.log(chalk.blue("Loading conversations..."));
    const conversations = await client.listConversations(operator!);

    // Filter to agent-chat conversations
    const agentConversations = conversations.filter((c) => isAgentChatTopic(c.topic));

    if (options.json) {
      console.log(jsonStringify(agentConversations));
      return;
    }

    if (agentConversations.length === 0) {
      console.log(chalk.yellow("No agent conversations found."));
      return;
    }

    console.log(
      chalk.bold(`Agent Conversations (${agentConversations.length}):\n`),
    );

    for (const conv of agentConversations) {
      const agentAddr = parseAgentAddressFromTopic(conv.topic);
      const encrypted = conv.isEncrypted ? chalk.yellow(" [encrypted]") : "";
      const date = new Date(conv.lastMessageTimestamp * 1000).toLocaleString();

      console.log(`  ${chalk.cyan(agentAddr || "unknown")}${encrypted}`);
      console.log(`    Topic:    ${conv.topic}`);
      console.log(`    Messages: ${conv.messageCount}`);
      console.log(`    Last:     ${date}`);
      if (conv.lastMessage) {
        console.log(
          `    Preview:  ${conv.lastMessage.slice(0, 60)}${conv.lastMessage.length > 60 ? "..." : ""}`,
        );
      }
      console.log();
    }
  } catch (error) {
    exitWithError(
      `Failed to list conversations: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentDmListCommand(parent: Command): void {
  parent
    .command("dm-list")
    .description("List your DM conversations with agents (pure chain read)")
    .requiredOption("--operator <address>", "User wallet address")
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--api-url <url>", "Net Protocol API URL")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      await executeDmList(options);
    });
}

// ============================================================
// dm-history
// ============================================================

async function executeDmHistory(
  topic: string,
  options: DmHistoryOptions,
): Promise<void> {
  try {
    const { chainId, apiUrl, operator } = resolveReadOnly(options);

    if (!operator) {
      exitWithError(
        "--operator <address> is required (user wallet address for this conversation)",
      );
    }

    const client = new AgentClient({ apiUrl, chainId });

    console.log(chalk.blue(`Loading conversation history...`));
    const messages = await client.getConversationHistory(operator!, topic);

    if (options.json) {
      console.log(jsonStringify(messages));
      return;
    }

    if (messages.length === 0) {
      console.log(chalk.yellow("No messages found."));
      return;
    }

    const limit = options.limit ?? messages.length;
    const displayMessages = messages.slice(-limit);

    const agentAddr = parseAgentAddressFromTopic(topic);
    console.log(
      chalk.bold(
        `Conversation with ${agentAddr || topic} (${displayMessages.length} messages):\n`,
      ),
    );

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

export function registerAgentDmHistoryCommand(parent: Command): void {
  parent
    .command("dm-history <topic>")
    .description("Read DM conversation history (pure chain read)")
    .requiredOption("--operator <address>", "User wallet address for this conversation")
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--api-url <url>", "Net Protocol API URL")
    .option("--limit <n>", "Number of recent messages to show", (v) => parseInt(v, 10))
    .option("--json", "Output as JSON")
    .action(async (topic, options) => {
      await executeDmHistory(topic, options);
    });
}

// ============================================================
// dm-auth-encode
// ============================================================

interface DmAuthEncodeOptions {
  topic?: string;
  agentAddress?: string;
  chainId?: number;
}

async function executeDmAuthEncode(options: DmAuthEncodeOptions): Promise<void> {
  try {
    const { chainId } = parseReadOnlyOptionsWithDefault({
      chainId: options.chainId,
    });

    let topic = options.topic;
    if (!topic) {
      if (!options.agentAddress) {
        exitWithError(
          "Must provide either --topic or --agent-address to generate a topic",
        );
      }
      if (!isAddress(options.agentAddress!)) {
        exitWithError(`Invalid agent address: ${options.agentAddress}`);
      }
      topic = generateAgentChatTopic(options.agentAddress! as Address);
    }

    // Returns { typedData: {...}, topic }.
    // Pipe .typedData to Bankr /agent/sign; pass .topic + the resulting
    // signature to `agent dm --topic ... --topic-signature ...`.
    const result = buildConversationAuthTypedData({
      topic,
      chainId,
    });

    console.log(jsonStringify(result));
  } catch (error) {
    exitWithError(
      `dm-auth-encode failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentDmAuthEncodeCommand(parent: Command): void {
  parent
    .command("dm-auth-encode")
    .description(
      "Emit { typedData, topic } for external signing. " +
        "Pipe .typedData to your signer, pass .topic + the resulting " +
        "signature to `agent dm --topic ... --topic-signature ...`.",
    )
    .option(
      "--topic <topic>",
      "Existing topic to authorize (e.g. agent-chat-0x...-nanoid). " +
        "If omitted, a new topic is generated from --agent-address.",
    )
    .option(
      "--agent-address <address>",
      "Agent address — used to generate a new topic when --topic is omitted",
    )
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .action(async (options) => {
      await executeDmAuthEncode(options);
    });
}
