import chalk from "chalk";
import { Command } from "commander";
import { addAuthOptions, resolveAuth, type AgentAuthOptions } from "./shared";
import { exitWithError } from "../../shared/output";

async function executeToggleHidden(
  agentId: string,
  options: AgentAuthOptions,
  hide: boolean,
): Promise<void> {
  const verb = hide ? "Hiding" : "Unhiding";
  const past = hide ? "hidden" : "unhidden";
  try {
    const auth = await resolveAuth(options);
    console.log(chalk.blue(`${verb} agent ${agentId}...`));
    const result = hide
      ? await auth.client.hideAgent(auth.sessionToken, agentId)
      : await auth.client.unhideAgent(auth.sessionToken, agentId);

    if (!result.success) {
      exitWithError(result.error || `Failed to ${hide ? "hide" : "unhide"} agent`);
    }
    console.log(chalk.green(`Agent ${past} successfully.`));
  } catch (error) {
    exitWithError(
      `Failed to ${hide ? "hide" : "unhide"} agent: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentHideCommand(parent: Command): void {
  const cmd = parent.command("hide <agentId>").description("Hide an agent (soft-delete)");
  addAuthOptions(cmd).action(async (agentId, options) => {
    await executeToggleHidden(agentId, options, true);
  });
}

export function registerAgentUnhideCommand(parent: Command): void {
  const cmd = parent
    .command("unhide <agentId>")
    .description("Unhide a previously hidden agent");
  addAuthOptions(cmd).action(async (agentId, options) => {
    await executeToggleHidden(agentId, options, false);
  });
}
