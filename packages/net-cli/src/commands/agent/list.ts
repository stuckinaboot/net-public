import chalk from "chalk";
import { Command } from "commander";
import { resolveAuth, jsonStringify } from "./shared";
import { exitWithError } from "../../shared/output";

interface ListOptions {
  privateKey?: string;
  sessionToken?: string;
  operator?: string;
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
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
    const visible = options.showHidden
      ? agents
      : agents.filter((a) => !a.config.hidden);

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

      console.log(`  ${chalk.cyan(config.name)}${hidden}`);
      console.log(`    ID:       ${config.id}`);
      console.log(`    Wallet:   ${walletAddress}`);
      console.log(`    Schedule: ${schedule}`);
      console.log(`    Prompt:   ${config.systemPrompt.slice(0, 80)}${config.systemPrompt.length > 80 ? "..." : ""}`);
      console.log();
    }
  } catch (error) {
    exitWithError(
      `Failed to list agents: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentListCommand(parent: Command): void {
  parent
    .command("list")
    .description("List your onchain agents")
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
    .option("--json", "Output as JSON")
    .option("--show-hidden", "Include hidden agents")
    .action(async (options) => {
      await executeList(options);
    });
}
