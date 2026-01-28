import chalk from "chalk";
import type { NetMessageFilter } from "@net-protocol/core";

/**
 * Common filter options shared by read and count commands
 */
export interface FilterOptions {
  app?: string;
  topic?: string;
  sender?: string;
}

/**
 * Options for the message send command
 */
export interface MessageSendOptions {
  text: string;
  topic?: string;
  data?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

/**
 * Options for the message read command
 */
export interface MessageReadOptions extends FilterOptions {
  start?: number;
  end?: number;
  index?: number;
  limit?: number;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

/**
 * Options for the message count command
 */
export interface MessageCountOptions extends FilterOptions {
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

/**
 * Build a NetMessageFilter from command options.
 * Returns undefined if no app address is provided.
 */
export function buildFilter(options: FilterOptions): NetMessageFilter | undefined {
  if (!options.app) {
    return undefined;
  }

  return {
    appAddress: options.app as `0x${string}`,
    topic: options.topic,
    maker: options.sender as `0x${string}` | undefined,
  };
}

/**
 * Warn if topic/sender filters are provided without --app
 */
export function warnIgnoredFilters(options: FilterOptions): void {
  if (options.app || (!options.topic && !options.sender)) {
    return;
  }

  const ignored: string[] = [];
  if (options.topic) ignored.push("--topic");
  if (options.sender) ignored.push("--sender");

  console.warn(
    chalk.yellow(
      `Warning: ${ignored.join(" and ")} ignored because --app is required for filtering`
    )
  );
}
