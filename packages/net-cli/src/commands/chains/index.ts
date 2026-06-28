import { Command } from "commander";
import chalk from "chalk";
import { getSupportedChains } from "@net-protocol/core";

/**
 * Register the chains command with the commander program.
 *
 * The chain list is sourced from `@net-protocol/core`'s chain config — the
 * single source of truth for supported chains, names, and mainnet/testnet
 * classification.
 */
export function registerChainsCommand(program: Command): void {
  program
    .command("chains")
    .description("List supported chains")
    .option("--json", "Output in JSON format")
    .action((options) => {
      const chains = getSupportedChains();

      if (options.json) {
        console.log(JSON.stringify(chains, null, 2));
        return;
      }

      console.log(chalk.white.bold("Supported Chains:\n"));

      console.log(chalk.cyan("Mainnets:"));
      chains
        .filter((c) => c.type === "mainnet")
        .forEach((chain) => {
          console.log(
            `  ${chalk.white(chain.name)} ${chalk.gray(`(${chain.chainId})`)}`
          );
        });

      console.log(chalk.cyan("\nTestnets:"));
      chains
        .filter((c) => c.type === "testnet")
        .forEach((chain) => {
          console.log(
            `  ${chalk.white(chain.name)} ${chalk.gray(`(${chain.chainId})`)}`
          );
        });
    });
}
