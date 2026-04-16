import { Command } from "commander";
import { registerAgentCreateCommand } from "./create";
import { registerAgentListCommand } from "./list";
import { registerAgentUpdateCommand } from "./update";
import { registerAgentHideCommand, registerAgentUnhideCommand } from "./hide";
import { registerAgentRunCommand } from "./run";
import { registerAgentInfoCommand } from "./info";
import { registerAgentDmCommand, registerAgentDmListCommand, registerAgentDmHistoryCommand } from "./dm";

/**
 * Register the agent command group with the commander program
 */
export function registerAgentCommand(program: Command): void {
  const agentCommand = program
    .command("agent")
    .description("Onchain agent operations (create, manage, run, DM)");

  registerAgentCreateCommand(agentCommand);
  registerAgentListCommand(agentCommand);
  registerAgentUpdateCommand(agentCommand);
  registerAgentHideCommand(agentCommand);
  registerAgentUnhideCommand(agentCommand);
  registerAgentRunCommand(agentCommand);
  registerAgentInfoCommand(agentCommand);
  registerAgentDmCommand(agentCommand);
  registerAgentDmListCommand(agentCommand);
  registerAgentDmHistoryCommand(agentCommand);
}
