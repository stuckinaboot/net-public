import chalk from "chalk";
import { Command } from "commander";
import { resolveAuth, jsonStringify } from "./shared";
import { exitWithError } from "../../shared/output";

interface InfoOptions {
  privateKey?: string;
  sessionToken?: string;
  operator?: string;
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
  json?: boolean;
}

async function executeInfo(agentId: string, options: InfoOptions): Promise<void> {
  try {
    const auth = await resolveAuth(options);

    const agent = await auth.client.getAgent(auth.sessionToken, agentId);

    if (!agent) {
      exitWithError(`Agent not found: ${agentId}`);
      return;
    }

    if (options.json) {
      console.log(jsonStringify(agent));
      return;
    }

    const { config, walletAddress } = agent;
    const schedule = config.runIntervalMinutes
      ? `every ${config.runIntervalMinutes} minutes`
      : "manual only";

    console.log(chalk.bold(config.name) + (config.hidden ? chalk.gray(" [hidden]") : ""));
    console.log();
    console.log(`  ID:           ${config.id}`);
    console.log(`  Wallet:       ${walletAddress}`);
    console.log(`  Owner:        ${config.ownerAddress}`);
    console.log(`  Schedule:     ${schedule}`);
    console.log(`  Created:      ${new Date(config.createdAt).toLocaleString()}`);
    console.log(`  Updated:      ${new Date(config.updatedAt).toLocaleString()}`);
    console.log();
    console.log(`  System Prompt:`);
    console.log(`    ${config.systemPrompt}`);

    if (config.filters) {
      console.log();
      console.log(`  Filters:`);
      if (config.filters.includeFeedPatterns?.length) {
        console.log(`    Include feeds: ${config.filters.includeFeedPatterns.join(", ")}`);
      }
      if (config.filters.excludeFeedPatterns?.length) {
        console.log(`    Exclude feeds: ${config.filters.excludeFeedPatterns.join(", ")}`);
      }
      if (config.filters.preferredFeedPatterns?.length) {
        console.log(`    Preferred feeds: ${config.filters.preferredFeedPatterns.join(", ")}`);
      }
      if (config.filters.preferredChatTopics?.length) {
        console.log(`    Chat topics: ${config.filters.preferredChatTopics.join(", ")}`);
      }
    }
  } catch (error) {
    exitWithError(
      `Failed to get agent info: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentInfoCommand(parent: Command): void {
  parent
    .command("info <agentId>")
    .description("Show detailed agent information")
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option(
      "--session-token <token>",
      "Pre-existing session token (alternative to --private-key)",
    )
    .option(
      "--operator <address>",
      "Operator address (required with --session-token)",
    )
    .option("--api-url <url>", "Net Protocol API URL")
    .option("--json", "Output as JSON")
    .action(async (agentId, options) => {
      await executeInfo(agentId, options);
    });
}
