import chalk from "chalk";
import { Command } from "commander";
import { createAuthenticatedClient } from "./shared";
import { exitWithError } from "../../shared/output";

interface HideOptions {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  apiUrl?: string;
}

async function executeHide(agentId: string, options: HideOptions): Promise<void> {
  try {
    const { client, sessionToken } = await createAuthenticatedClient(options);

    console.log(chalk.blue(`Hiding agent ${agentId}...`));
    const result = await client.hideAgent(sessionToken, agentId);

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
    const { client, sessionToken } = await createAuthenticatedClient(options);

    console.log(chalk.blue(`Unhiding agent ${agentId}...`));
    const result = await client.unhideAgent(sessionToken, agentId);

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

export function registerAgentHideCommand(parent: Command): void {
  parent
    .command("hide <agentId>")
    .description("Hide an agent (soft-delete)")
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option("--api-url <url>", "Net Protocol API URL")
    .action(async (agentId, options) => {
      await executeHide(agentId, options);
    });
}

export function registerAgentUnhideCommand(parent: Command): void {
  parent
    .command("unhide <agentId>")
    .description("Unhide a previously hidden agent")
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option("--api-url <url>", "Net Protocol API URL")
    .action(async (agentId, options) => {
      await executeUnhide(agentId, options);
    });
}
