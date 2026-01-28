import { Command } from "commander";
import chalk from "chalk";
import { getNetContract, getChainName } from "@net-protocol/core";
import { parseReadOnlyOptions } from "../../cli/shared";
import { createNetClient } from "../../shared/client";
import { exitWithError } from "../../shared/output";

interface InfoOptions {
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

/**
 * Register the info command with the commander program
 */
export function registerInfoCommand(program: Command): void {
  program
    .command("info")
    .description("Show contract info and stats")
    .option(
      "--chain-id <id>",
      "Chain ID. Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option(
      "--rpc-url <url>",
      "Custom RPC URL. Can also be set via NET_RPC_URL env var"
    )
    .option("--json", "Output in JSON format")
    .action(async (options: InfoOptions) => {
      const readOnlyOptions = parseReadOnlyOptions({
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
      });

      try {
        const client = createNetClient(readOnlyOptions);

        const contract = getNetContract(readOnlyOptions.chainId);
        const chainName = getChainName({ chainId: readOnlyOptions.chainId });
        const totalMessages = await client.getMessageCount({});

        const info = {
          chain: {
            id: readOnlyOptions.chainId,
            name: chainName || "Unknown",
          },
          contract: {
            address: contract.address,
          },
          stats: {
            totalMessages,
          },
        };

        if (options.json) {
          console.log(JSON.stringify(info, null, 2));
          return;
        }

        console.log(chalk.white.bold("Net Protocol Info\n"));
        console.log(chalk.cyan("Chain:"));
        console.log(`  Name: ${chalk.white(info.chain.name)}`);
        console.log(`  ID: ${chalk.white(info.chain.id)}`);
        console.log(chalk.cyan("\nContract:"));
        console.log(`  Address: ${chalk.white(info.contract.address)}`);
        console.log(chalk.cyan("\nStats:"));
        console.log(`  Total Messages: ${chalk.white(info.stats.totalMessages)}`);
      } catch (error) {
        exitWithError(
          `Failed to get info: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });
}
