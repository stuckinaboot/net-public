import chalk from "chalk";
import type { CommonOptions } from "../shared/types";

/**
 * Parse and validate common options shared across all commands
 * Extracts private key, chain ID, and RPC URL from command options or environment variables
 */
export function parseCommonOptions(options: {
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
}): CommonOptions {
  // Get private key from option or environment variable
  const privateKey =
    options.privateKey ||
    process.env.NET_PRIVATE_KEY ||
    process.env.PRIVATE_KEY;

  if (!privateKey) {
    console.error(
      chalk.red(
        "Error: Private key is required. Provide via --private-key flag or NET_PRIVATE_KEY/PRIVATE_KEY environment variable"
      )
    );
    process.exit(1);
  }

  // Validate private key format
  if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    console.error(
      chalk.red(
        "Error: Invalid private key format (must be 0x-prefixed, 66 characters)"
      )
    );
    process.exit(1);
  }

  // Warn about private key security if provided via command line
  if (options.privateKey) {
    console.warn(
      chalk.yellow(
        "⚠️  Warning: Private key provided via command line. Consider using NET_PRIVATE_KEY environment variable instead."
      )
    );
  }

  // Get chain ID from option or environment variable
  const chainId =
    options.chainId ||
    (process.env.NET_CHAIN_ID
      ? parseInt(process.env.NET_CHAIN_ID, 10)
      : undefined);

  if (!chainId) {
    console.error(
      chalk.red(
        "Error: Chain ID is required. Provide via --chain-id flag or NET_CHAIN_ID environment variable"
      )
    );
    process.exit(1);
  }

  // Get RPC URL from option or environment variable
  const rpcUrl = options.rpcUrl || process.env.NET_RPC_URL;

  return {
    privateKey: privateKey as `0x${string}`,
    chainId,
    rpcUrl,
  };
}

