import chalk from "chalk";
import { Command } from "commander";
import { createAuthenticatedClient } from "./shared";
import { exitWithError } from "../../shared/output";
import type { AgentRunMode } from "@net-protocol/agents";

interface RunOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  apiUrl?: string;
  mode?: string;
  json?: boolean;
}

async function executeRun(agentId: string, options: RunOptions): Promise<void> {
  try {
    const { client, sessionToken } = await createAuthenticatedClient(options);

    const mode = (options.mode as AgentRunMode) || "auto";
    if (!["auto", "feeds", "chats"].includes(mode)) {
      exitWithError(`Invalid mode "${mode}". Must be: auto, feeds, or chats`);
    }

    console.log(chalk.blue(`Running agent ${agentId} (mode: ${mode})...`));

    const result = await client.runAgent({
      sessionToken,
      agentId,
      mode,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (!result.success) {
      exitWithError(result.error || "Agent run failed");
    }

    console.log(chalk.green(`Agent run complete: ${result.action}`));

    if (result.summary) {
      console.log(`  Summary: ${result.summary}`);
    }

    if (result.actions.length > 0) {
      console.log(`  Actions:`);
      for (const action of result.actions) {
        console.log(`    - ${action.type} in ${action.topic}: "${action.text.slice(0, 60)}${action.text.length > 60 ? "..." : ""}"`);
        console.log(`      tx: ${action.transactionHash}`);
      }
    }

    if (result.autoFunded) {
      console.log(chalk.blue(`  Auto-funded: $${result.autoFunded.amountUsd.toFixed(4)} (${result.autoFunded.amountEth} ETH)`));
    }

    if (result.agentBalanceUsd !== undefined) {
      console.log(`  Agent balance: $${result.agentBalanceUsd.toFixed(4)}`);
    }
    if (result.mainBalanceUsd !== undefined) {
      console.log(`  Credits balance: $${result.mainBalanceUsd.toFixed(4)}`);
    }
  } catch (error) {
    exitWithError(
      `Failed to run agent: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentRunCommand(parent: Command): void {
  parent
    .command("run <agentId>")
    .description("Execute one agent cycle")
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option("--api-url <url>", "Net Protocol API URL")
    .option("--mode <mode>", "Run mode: auto, feeds, or chats (default: auto)")
    .option("--json", "Output as JSON")
    .action(async (agentId, options) => {
      await executeRun(agentId, options);
    });
}
