import chalk from "chalk";
import { Command } from "commander";
import {
  addAuthOptions,
  jsonStringify,
  resolveAuth,
  type AgentAuthOptions,
} from "./shared";
import { exitWithError } from "../../shared/output";

interface ListOptions extends AgentAuthOptions {
  json?: boolean;
  showHidden?: boolean;
}

async function executeList(options: ListOptions): Promise<void> {
  try {
    const auth = await resolveAuth(options);
    const result = await auth.client.listAgents({ sessionToken: auth.sessionToken });

    if (!result.success) {
      exitWithError(result.error || "Failed to list agents");
    }

    const agents = result.agents || [];
    const visible = options.showHidden ? agents : agents.filter((a) => !a.config.hidden);

    if (options.json) {
      console.log(jsonStringify(visible));
      return;
    }

    if (visible.length === 0) {
      console.log(chalk.yellow("No agents found."));
      return;
    }

    console.log(chalk.bold(`Agents (${visible.length}):\n`));

    for (const agent of visible) {
      const { config, walletAddress } = agent;
      const schedule = config.runIntervalMinutes
        ? `every ${config.runIntervalMinutes}m`
        : "manual";
      const hidden = config.hidden ? chalk.gray(" [hidden]") : "";
      const promptPreview =
        config.systemPrompt.length > 80
          ? `${config.systemPrompt.slice(0, 80)}...`
          : config.systemPrompt;

      console.log(`  ${chalk.cyan(config.name)}${hidden}`);
      console.log(`    ID:       ${config.id}`);
      console.log(`    Wallet:   ${walletAddress}`);
      console.log(`    Schedule: ${schedule}`);
      console.log(`    Prompt:   ${promptPreview}`);
      console.log();
    }
  } catch (error) {
    exitWithError(
      `Failed to list agents: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentListCommand(parent: Command): void {
  const cmd = parent
    .command("list")
    .description("List your onchain agents")
    .option("--json", "Output as JSON")
    .option("--show-hidden", "Include hidden agents");
  addAuthOptions(cmd);
  cmd.action(async (options) => {
    await executeList(options);
  });
}
