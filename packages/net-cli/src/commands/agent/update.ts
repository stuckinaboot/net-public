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
import type { UpdateAgentInput } from "@net-protocol/agents";

interface UpdateOptions extends AgentAuthOptions, AgentFilterOptions, AgentProfileOptions {
  name?: string;
  systemPrompt?: string;
  schedule?: number;
  disableSchedule?: boolean;
  json?: boolean;
}

async function executeUpdate(agentId: string, options: UpdateOptions): Promise<void> {
  try {
    const auth = await resolveAuth(options);

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

    const filters = buildFilters(options);
    if (filters) {
      config.filters = filters;
      hasConfigChanges = true;
    }

    const profile = buildProfile(options);

    if (!hasConfigChanges && !profile) {
      exitWithError(
        "No changes specified. Use --name, --system-prompt, --schedule, --display-name, --bio, or filter options.",
      );
    }

    if (!options.json) {
      console.log(chalk.blue(`Updating agent ${agentId}...`));
    }
    const result = await auth.client.updateAgent({
      sessionToken: auth.sessionToken,
      agentId,
      config: hasConfigChanges ? config : undefined,
      profile,
    });

    if (options.json) {
      console.log(jsonStringify(result));
      if (!result.success) process.exit(1);
      return;
    }

    if (!result.success) {
      exitWithError(result.error || "Failed to update agent");
    }

    console.log(chalk.green("Agent updated successfully!"));
    if (result.profileError) {
      console.log(chalk.yellow(`  Profile warning: ${result.profileError}`));
    }
  } catch (error) {
    exitWithError(
      `Failed to update agent: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentUpdateCommand(parent: Command): void {
  const cmd = parent
    .command("update <agentId>")
    .description("Update an existing agent")
    .option("--name <name>", "New agent name")
    .option("--system-prompt <prompt>", "New system prompt")
    .option("--schedule <minutes>", "Auto-run interval in minutes", (v) => parseInt(v, 10))
    .option("--disable-schedule", "Disable automatic scheduling")
    .option("--json", "Output as JSON");
  addAuthOptions(cmd);
  addFilterOptions(cmd);
  addProfileOptions(cmd);
  cmd.action(async (agentId, options) => {
    await executeUpdate(agentId, options);
  });
}
