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

    if (!options.json) {
      console.log(chalk.blue(`Creating agent "${name}"...`));
    }
    const result = await auth.client.createAgent({
      sessionToken: auth.sessionToken,
      config,
      profile,
    });

    if (options.json) {
      console.log(jsonStringify(result));
      if (!result.success) process.exit(1);
      return;
    }

    if (!result.success) {
      exitWithError(result.error || "Failed to create agent");
    }

    console.log(chalk.green("Agent created successfully!"));
    console.log(`  Agent ID: ${result.agentId}`);
    console.log(`  Wallet:   ${result.agentWalletAddress}`);
    if (result.scheduleError) {
      // The on-chain follow-up (profile metadata write) commonly reverts
      // because the new agent's wallet starts with 0 ETH for gas. Detect
      // that specific case and prepend an actionable hint, but keep the
      // full underlying error visible so other reverts remain debuggable.
      const isGasOut = /gas required exceeds allowance \(0\)/i.test(
        result.scheduleError,
      );
      if (isGasOut) {
        console.log(
          chalk.yellow(
            `  Profile metadata write failed: the agent's wallet ` +
              `(${result.agentWalletAddress}) has 0 ETH for gas. It will ` +
              `be auto-funded on first \`agent run\`, or you can transfer ` +
              `a small amount of ETH to the wallet manually.`,
          ),
        );
        console.log(chalk.gray(`  Underlying revert:`));
      } else {
        console.log(chalk.yellow(`  On-chain follow-up failed:`));
      }
      console.log(
        chalk.gray(`    ${result.scheduleError.replace(/\n/g, "\n    ")}`),
      );
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
