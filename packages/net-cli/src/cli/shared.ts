import chalk from "chalk";
import type { CommonOptions, ReadOnlyOptions } from "../shared/types";

/**
 * Get chain ID from option or environment variable, exit if not found
 */
function getRequiredChainId(optionValue?: number): number {
  const chainId =
    optionValue ||
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

  return chainId;
}

/**
 * Get RPC URL from option or environment variable
 */
function getRpcUrl(optionValue?: string): string | undefined {
  return optionValue || process.env.NET_RPC_URL;
}

/**
 * Parse and validate common options shared across all commands.
 * Extracts private key, chain ID, and RPC URL from command options or environment variables.
 * @param options - Command options
 * @param supportsEncodeOnly - If true, mention --encode-only in error messages as an alternative
 */
export function parseCommonOptions(
  options: {
    privateKey?: string;
    chainId?: number;
    rpcUrl?: string;
  },
  supportsEncodeOnly = false
): CommonOptions {
  const privateKey =
    options.privateKey ||
    process.env.NET_PRIVATE_KEY ||
    process.env.PRIVATE_KEY;

  if (!privateKey) {
    const encodeOnlyHint = supportsEncodeOnly
      ? ", or use --encode-only to output transaction data without submitting"
      : "";
    console.error(
      chalk.red(
        `Error: Private key is required. Provide via --private-key flag or NET_PRIVATE_KEY/PRIVATE_KEY environment variable${encodeOnlyHint}`
      )
    );
    process.exit(1);
  }

  if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    console.error(
      chalk.red(
        "Error: Invalid private key format (must be 0x-prefixed, 66 characters)"
      )
    );
    process.exit(1);
  }

  if (options.privateKey) {
    console.warn(
      chalk.yellow(
        "Warning: Private key provided via command line. Consider using NET_PRIVATE_KEY environment variable instead."
      )
    );
  }

  return {
    privateKey: privateKey as `0x${string}`,
    chainId: getRequiredChainId(options.chainId),
    rpcUrl: getRpcUrl(options.rpcUrl),
  };
}

/**
 * Parse and validate read-only options for commands that don't need a private key.
 * Extracts chain ID and RPC URL from command options or environment variables.
 */
export function parseReadOnlyOptions(options: {
  chainId?: number;
  rpcUrl?: string;
}): ReadOnlyOptions {
  return {
    chainId: getRequiredChainId(options.chainId),
    rpcUrl: getRpcUrl(options.rpcUrl),
  };
}
