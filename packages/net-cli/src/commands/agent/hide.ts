import chalk from "chalk";
import { Command } from "commander";
import { resolveAuth } from "./shared";
import { exitWithError } from "../../shared/output";

interface HideOptions {
  privateKey?: string;
  sessionToken?: string;
  operator?: string;
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
}

async function executeHide(agentId: string, options: HideOptions): Promise<void> {
  try {
    const auth = await resolveAuth(options);

    console.log(chalk.blue(`Hiding agent ${agentId}...`));
    const result = await auth.client.hideAgent(auth.sessionToken, agentId);

    if (!result.success) {
      exitWithError(result.error || "Failed to hide agent");
    }

    console.log(chalk.green("Agent hidden successfully."));
  } catch (error) {
    exitWithError(
      `Failed to hide agent: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function executeUnhide(agentId: string, options: HideOptions): Promise<void> {
  try {
    const auth = await resolveAuth(options);

    console.log(chalk.blue(`Unhiding agent ${agentId}...`));
    const result = await auth.client.unhideAgent(auth.sessionToken, agentId);

    if (!result.success) {
      exitWithError(result.error || "Failed to unhide agent");
    }

    console.log(chalk.green("Agent unhidden successfully."));
  } catch (error) {
    exitWithError(
      `Failed to unhide agent: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function addAuthOptions(cmd: Command): Command {
  return cmd
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
    .option("--api-url <url>", "Net Protocol API URL");
}

export function registerAgentHideCommand(parent: Command): void {
  const cmd = parent.command("hide <agentId>").description("Hide an agent (soft-delete)");
  addAuthOptions(cmd).action(async (agentId, options) => {
    await executeHide(agentId, options);
  });
}

export function registerAgentUnhideCommand(parent: Command): void {
  const cmd = parent
    .command("unhide <agentId>")
    .description("Unhide a previously hidden agent");
  addAuthOptions(cmd).action(async (agentId, options) => {
    await executeUnhide(agentId, options);
  });
}
