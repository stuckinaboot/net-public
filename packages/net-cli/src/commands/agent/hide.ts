import chalk from "chalk";
import { Command } from "commander";
import { addAuthOptions, resolveAuth, type AgentAuthOptions } from "./shared";
import { exitWithError } from "../../shared/output";

async function executeHide(agentId: string, options: AgentAuthOptions): Promise<void> {
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

async function executeUnhide(agentId: string, options: AgentAuthOptions): Promise<void> {
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
