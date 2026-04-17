import chalk from "chalk";
import { Command } from "commander";
import {
  addAuthOptions,
  jsonStringify,
  parseRunMode,
  resolveAuth,
  type AgentAuthOptions,
} from "./shared";
import { exitWithError } from "../../shared/output";

interface RunOptions extends AgentAuthOptions {
  mode?: string;
  json?: boolean;
}

async function executeRun(agentId: string, options: RunOptions): Promise<void> {
  try {
    const auth = await resolveAuth(options);
    const mode = parseRunMode(options.mode);

    console.log(chalk.blue(`Running agent ${agentId} (mode: ${mode})...`));
    const result = await auth.client.runAgent({
      sessionToken: auth.sessionToken,
      agentId,
      mode,
    });

    if (options.json) {
      console.log(jsonStringify(result));
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
      console.log("  Actions:");
      for (const action of result.actions) {
        const textPreview =
          action.text.length > 60 ? `${action.text.slice(0, 60)}...` : action.text;
        console.log(`    - ${action.type} in ${action.topic}: "${textPreview}"`);
        console.log(`      tx: ${action.transactionHash}`);
      }
    }

    if (result.autoFunded) {
      console.log(
        chalk.blue(
          `  Auto-funded: $${result.autoFunded.amountUsd.toFixed(4)} (${result.autoFunded.amountEth} ETH)`,
        ),
      );
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
  const cmd = parent
    .command("run <agentId>")
    .description("Execute one agent cycle")
    .option("--mode <mode>", "Run mode: auto, feeds, or chats (default: auto)")
    .option("--json", "Output as JSON");
  addAuthOptions(cmd).action(async (agentId, options) => {
    await executeRun(agentId, options);
  });
}
