import chalk from "chalk";
import { Command } from "commander";
import {
  addAuthOptions,
  jsonStringify,
  resolveAuth,
  type AgentAuthOptions,
} from "./shared";
import { exitWithError } from "../../shared/output";

interface InfoOptions extends AgentAuthOptions {
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

    console.log(
      chalk.bold(config.name) + (config.hidden ? chalk.gray(" [hidden]") : ""),
    );
    console.log();
    console.log(`  ID:           ${config.id}`);
    console.log(`  Wallet:       ${walletAddress}`);
    console.log(`  Owner:        ${config.ownerAddress}`);
    console.log(`  Schedule:     ${schedule}`);
    console.log(`  Created:      ${new Date(config.createdAt).toLocaleString()}`);
    console.log(`  Updated:      ${new Date(config.updatedAt).toLocaleString()}`);
    console.log();
    console.log("  System Prompt:");
    console.log(`    ${config.systemPrompt}`);

    if (config.filters) {
      console.log();
      console.log("  Filters:");
      if (config.filters.includeFeedPatterns?.length) {
        console.log(`    Include feeds: ${config.filters.includeFeedPatterns.join(", ")}`);
      }
      if (config.filters.excludeFeedPatterns?.length) {
        console.log(`    Exclude feeds: ${config.filters.excludeFeedPatterns.join(", ")}`);
      }
      if (config.filters.preferredFeedPatterns?.length) {
        console.log(
          `    Preferred feeds: ${config.filters.preferredFeedPatterns.join(", ")}`,
        );
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
  const cmd = parent
    .command("info <agentId>")
    .description("Show detailed agent information")
    .option("--json", "Output as JSON");
  addAuthOptions(cmd).action(async (agentId, options) => {
    await executeInfo(agentId, options);
  });
}
