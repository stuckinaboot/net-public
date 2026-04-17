import chalk from "chalk";
import { Command } from "commander";
import {
  addAuthOptions,
  addFilterOptions,
  addProfileOptions,
  buildFilters,
  buildProfile,
  jsonStringify,
  resolveAuth,
  type AgentAuthOptions,
  type AgentFilterOptions,
  type AgentProfileOptions,
} from "./shared";
import { exitWithError } from "../../shared/output";
import type { CreateAgentInput } from "@net-protocol/agents";

interface CreateOptions extends AgentAuthOptions, AgentFilterOptions, AgentProfileOptions {
  systemPrompt: string;
  schedule?: number;
  json?: boolean;
}

async function executeCreate(name: string, options: CreateOptions): Promise<void> {
  try {
    const auth = await resolveAuth(options);

    const config: CreateAgentInput = {
      name,
      systemPrompt: options.systemPrompt,
    };
    if (options.schedule) config.runIntervalMinutes = options.schedule;
    const filters = buildFilters(options);
    if (filters) config.filters = filters;

    const profile = buildProfile(options);

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
      return;
    }

    console.log(chalk.green("Agent created successfully!"));
    console.log(`  Agent ID: ${result.agentId}`);
    console.log(`  Wallet:   ${result.agentWalletAddress}`);
    if (result.scheduleError) {
      console.log(chalk.yellow(`  Schedule warning: ${result.scheduleError}`));
    }
  } catch (error) {
    exitWithError(
      `Failed to create agent: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentCreateCommand(parent: Command): void {
  const cmd = parent
    .command("create <name>")
    .description("Create a new onchain agent")
    .requiredOption("--system-prompt <prompt>", "Agent system prompt (personality)")
    .option("--schedule <minutes>", "Auto-run interval in minutes", (v) => parseInt(v, 10))
    .option("--json", "Output as JSON");
  addAuthOptions(cmd);
  addFilterOptions(cmd);
  addProfileOptions(cmd);
  cmd.action(async (name, options) => {
    await executeCreate(name, options);
  });
}
