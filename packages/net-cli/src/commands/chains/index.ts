import { Command } from "commander";
import chalk from "chalk";

/**
 * Supported chains configuration
 * Note: This mirrors the chainConfig in net-core but is kept here to avoid
 * exposing internal configuration details from the core package
 */
const SUPPORTED_CHAINS = [
  { id: 8453, name: "Base", type: "mainnet" },
  { id: 1, name: "Ethereum", type: "mainnet" },
  { id: 666666666, name: "Degen", type: "mainnet" },
  { id: 5112, name: "Ham", type: "mainnet" },
  { id: 57073, name: "Ink", type: "mainnet" },
  { id: 130, name: "Unichain", type: "mainnet" },
  { id: 999, name: "HyperEVM", type: "mainnet" },
  { id: 9745, name: "Plasma", type: "mainnet" },
  { id: 143, name: "Monad", type: "mainnet" },
  { id: 84532, name: "Base Sepolia", type: "testnet" },
  { id: 11155111, name: "Sepolia", type: "testnet" },
] as const;

/**
 * Register the chains command with the commander program
 */
export function registerChainsCommand(program: Command): void {
  program
    .command("chains")
    .description("List supported chains")
    .option("--json", "Output in JSON format")
    .action((options) => {
      if (options.json) {
        console.log(JSON.stringify(SUPPORTED_CHAINS, null, 2));
        return;
      }

      console.log(chalk.white.bold("Supported Chains:\n"));

      // Mainnets
      console.log(chalk.cyan("Mainnets:"));
      SUPPORTED_CHAINS.filter((c) => c.type === "mainnet").forEach((chain) => {
        console.log(`  ${chalk.white(chain.name)} ${chalk.gray(`(${chain.id})`)}`);
      });

      // Testnets
      console.log(chalk.cyan("\nTestnets:"));
      SUPPORTED_CHAINS.filter((c) => c.type === "testnet").forEach((chain) => {
        console.log(`  ${chalk.white(chain.name)} ${chalk.gray(`(${chain.id})`)}`);
      });
    });
}
