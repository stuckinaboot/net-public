import chalk from "chalk";
import { Command } from "commander";
import type { RegisteredAgent } from "@net-protocol/feeds";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { createAgentRegistryClient } from "../../shared/client";
import { exitWithError } from "../../shared/output";
import { formatAgent, agentToJson, printJson } from "./format";

interface ListAgentsOptions {
  limit?: number;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

/**
 * Execute the list-agents command
 */
async function executeListAgents(options: ListAgentsOptions): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = createAgentRegistryClient(readOnlyOptions);

  try {
    const limit = options.limit ?? 100;
    const [totalCount, agents] = await Promise.all([
      client.getRegisteredAgentCount(),
      client.getRegisteredAgents({ maxAgents: limit }),
    ]);

    if (options.json) {
      printJson({
        totalCount,
        agents: agents.map((agent: RegisteredAgent, i: number) => agentToJson(agent, i)),
      });
    } else {
      if (agents.length === 0) {
        console.log(chalk.yellow("No registered agents found"));
        return;
      }

      console.log(
        chalk.white(`Registered agents: ${totalCount} total, showing last ${agents.length}:\n`)
      );
      agents.forEach((agent: RegisteredAgent, i: number) => {
        console.log(formatAgent(agent, i));
        if (i < agents.length - 1) {
          console.log(); // Empty line between agents
        }
      });
    }
  } catch (error) {
    exitWithError(
      `Failed to fetch agents: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register the list-agents subcommand
 */
export function registerListAgentsCommand(parent: Command, commandName = "list-agents"): void {
  parent
    .command(commandName)
    .description("List registered agents from the agent registry")
    .option(
      "--limit <n>",
      "Maximum number of agents to display (default: 100)",
      (value) => parseInt(value, 10)
    )
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453 for Base)",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeListAgents(options);
    });
}
