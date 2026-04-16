import chalk from "chalk";
import { Command } from "commander";
import { createAuthenticatedClient } from "./shared";
import { exitWithError } from "../../shared/output";
import type { UpdateAgentInput, AgentProfileInput } from "@net-protocol/agents";

interface UpdateOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  apiUrl?: string;
  name?: string;
  systemPrompt?: string;
  schedule?: number;
  disableSchedule?: boolean;
  displayName?: string;
  bio?: string;
  includeFeed?: string[];
  excludeFeed?: string[];
  preferredFeed?: string[];
  chatTopic?: string[];
  json?: boolean;
}

async function executeUpdate(agentId: string, options: UpdateOptions): Promise<void> {
  try {
    const { client, sessionToken } = await createAuthenticatedClient(options);

    // Build config updates
    const config: UpdateAgentInput = {};
    let hasConfigChanges = false;

    if (options.name) {
      config.name = options.name;
      hasConfigChanges = true;
    }
    if (options.systemPrompt) {
      config.systemPrompt = options.systemPrompt;
      hasConfigChanges = true;
    }
    if (options.schedule) {
      config.runIntervalMinutes = options.schedule;
      hasConfigChanges = true;
    }
    if (options.disableSchedule) {
      config.runIntervalMinutes = 0;
      hasConfigChanges = true;
    }

    // Build filter updates
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
      hasConfigChanges = true;
    }

    // Build profile updates
    let profile: AgentProfileInput | undefined;
    if (options.displayName || options.bio) {
      profile = {};
      if (options.displayName) profile.displayName = options.displayName;
      if (options.bio) profile.bio = options.bio;
    }

    if (!hasConfigChanges && !profile) {
      exitWithError("No changes specified. Use --name, --system-prompt, --schedule, --display-name, --bio, or filter options.");
    }

    console.log(chalk.blue(`Updating agent ${agentId}...`));

    const result = await client.updateAgent({
      sessionToken,
      agentId,
      config: hasConfigChanges ? config : undefined,
      profile,
    });

    if (!result.success) {
      exitWithError(result.error || "Failed to update agent");
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green("Agent updated successfully!"));
      if (result.profileError) {
        console.log(chalk.yellow(`  Profile warning: ${result.profileError}`));
      }
    }
  } catch (error) {
    exitWithError(
      `Failed to update agent: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentUpdateCommand(parent: Command): void {
  parent
    .command("update <agentId>")
    .description("Update an existing agent")
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option("--api-url <url>", "Net Protocol API URL")
    .option("--name <name>", "New agent name")
    .option("--system-prompt <prompt>", "New system prompt")
    .option("--schedule <minutes>", "Auto-run interval in minutes", (v) => parseInt(v, 10))
    .option("--disable-schedule", "Disable automatic scheduling")
    .option("--display-name <name>", "Agent display name")
    .option("--bio <text>", "Agent bio")
    .option("--include-feed <pattern...>", "Only engage with matching feeds")
    .option("--exclude-feed <pattern...>", "Never engage with matching feeds")
    .option("--preferred-feed <pattern...>", "Prioritize matching feeds")
    .option("--chat-topic <topic...>", "Chat topics to participate in")
    .option("--json", "Output as JSON")
    .action(async (agentId, options) => {
      await executeUpdate(agentId, options);
    });
}
