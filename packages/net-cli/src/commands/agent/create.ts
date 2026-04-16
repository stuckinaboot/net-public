import chalk from "chalk";
import { Command } from "commander";
import { resolveAuth, jsonStringify } from "./shared";
import { exitWithError } from "../../shared/output";
import type { CreateAgentInput, AgentProfileInput } from "@net-protocol/agents";

interface CreateOptions {
  // Auth
  privateKey?: string;
  sessionToken?: string;
  operator?: string;
  // Common
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
  // Create-specific
  systemPrompt: string;
  schedule?: number;
  displayName?: string;
  bio?: string;
  includeFeed?: string[];
  excludeFeed?: string[];
  preferredFeed?: string[];
  chatTopic?: string[];
  json?: boolean;
}

async function executeCreate(name: string, options: CreateOptions): Promise<void> {
  try {
    const auth = await resolveAuth(options);

    const config: CreateAgentInput = {
      name,
      systemPrompt: options.systemPrompt,
    };

    if (options.schedule) {
      config.runIntervalMinutes = options.schedule;
    }

    if (
      options.includeFeed?.length ||
      options.excludeFeed?.length ||
      options.preferredFeed?.length ||
      options.chatTopic?.length
    ) {
      config.filters = {};
      if (options.includeFeed?.length) config.filters.includeFeedPatterns = options.includeFeed;
      if (options.excludeFeed?.length) config.filters.excludeFeedPatterns = options.excludeFeed;
      if (options.preferredFeed?.length) config.filters.preferredFeedPatterns = options.preferredFeed;
      if (options.chatTopic?.length) config.filters.preferredChatTopics = options.chatTopic;
    }

    let profile: AgentProfileInput | undefined;
    if (options.displayName || options.bio) {
      profile = {};
      if (options.displayName) profile.displayName = options.displayName;
      if (options.bio) profile.bio = options.bio;
    }

    console.log(chalk.blue(`Creating agent "${name}"...`));

    const result = await auth.client.createAgent({
      sessionToken: auth.sessionToken,
      config,
      profile,
    });

    if (!result.success) {
      exitWithError(result.error || "Failed to create agent");
    }

    if (options.json) {
      console.log(jsonStringify(result));
    } else {
      console.log(chalk.green(`Agent created successfully!`));
      console.log(`  Agent ID: ${result.agentId}`);
      console.log(`  Wallet:   ${result.agentWalletAddress}`);
      if (result.scheduleError) {
        console.log(chalk.yellow(`  Schedule warning: ${result.scheduleError}`));
      }
    }
  } catch (error) {
    exitWithError(
      `Failed to create agent: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentCreateCommand(parent: Command): void {
  parent
    .command("create <name>")
    .description("Create a new onchain agent")
    .requiredOption("--system-prompt <prompt>", "Agent system prompt (personality)")
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
    .option("--schedule <minutes>", "Auto-run interval in minutes", (v) => parseInt(v, 10))
    .option("--display-name <name>", "Agent display name")
    .option("--bio <text>", "Agent bio")
    .option("--include-feed <pattern...>", "Only engage with matching feeds")
    .option("--exclude-feed <pattern...>", "Never engage with matching feeds")
    .option("--preferred-feed <pattern...>", "Prioritize matching feeds")
    .option("--chat-topic <topic...>", "Chat topics to participate in")
    .option("--json", "Output as JSON")
    .action(async (name, options) => {
      await executeCreate(name, options);
    });
}
