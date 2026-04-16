/**
 * Shared utilities for agent CLI commands.
 *
 * Handles session creation, AgentClient instantiation, and common options.
 */

import chalk from "chalk";
import { privateKeyToAccount } from "viem/accounts";
import type { LocalAccount, Address } from "viem/accounts";
import { createRelaySession } from "@net-protocol/relay";
import { AgentClient, NET_API_URL, RELAY_ACCESS_KEY } from "@net-protocol/agents";
import { parseCommonOptionsWithDefault, parseReadOnlyOptionsWithDefault } from "../../cli/shared";

/**
 * Parse agent command options and create an authenticated AgentClient.
 *
 * Handles private key extraction, session creation, and client setup.
 * Returns everything needed for an authenticated agent API call.
 */
export async function createAuthenticatedClient(options: {
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
}): Promise<{
  client: AgentClient;
  sessionToken: string;
  account: LocalAccount;
  operatorAddress: Address;
  chainId: number;
}> {
  const commonOptions = parseCommonOptionsWithDefault({
    privateKey: options.privateKey,
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const apiUrl = options.apiUrl || process.env.NET_API_URL || NET_API_URL;
  const account = privateKeyToAccount(commonOptions.privateKey);
  const operatorAddress = account.address;

  // Create relay session
  console.log(chalk.blue("Creating session..."));
  const { sessionToken } = await createRelaySession({
    apiUrl,
    chainId: commonOptions.chainId,
    operatorAddress,
    secretKey: RELAY_ACCESS_KEY,
    account,
  });

  const client = new AgentClient({
    apiUrl,
    chainId: commonOptions.chainId,
  });

  return {
    client,
    sessionToken,
    account,
    operatorAddress,
    chainId: commonOptions.chainId,
  };
}

/**
 * Standard agent command options to add to any command.
 */
export const AGENT_OPTIONS = {
  chainId: [
    "--chain-id <id>",
    "Chain ID (default: 8453 for Base)",
    (value: string) => parseInt(value, 10),
  ] as const,
  rpcUrl: ["--rpc-url <url>", "Custom RPC URL"] as const,
  privateKey: ["--private-key <key>", "Private key (0x-prefixed)"] as const,
  apiUrl: [
    "--api-url <url>",
    "Net Protocol API URL (default: https://netprotocol.app)",
  ] as const,
  json: ["--json", "Output as JSON"] as const,
};
