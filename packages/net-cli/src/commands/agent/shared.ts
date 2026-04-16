/**
 * Shared utilities for agent CLI commands.
 *
 * Supports two auth modes:
 * - Private key: provides --private-key (or NET_PRIVATE_KEY env var) → CLI creates session
 * - Pre-existing session token: provides --session-token (or NET_SESSION_TOKEN env var)
 *
 * This mirrors net-storage's pattern: --private-key for the simple path,
 * --address / session-token for the external-signer path.
 */

import chalk from "chalk";
import { privateKeyToAccount, type LocalAccount } from "viem/accounts";
import { isAddress } from "viem";
import type { Address } from "viem";
import { createRelaySession } from "@net-protocol/relay";
import {
  AgentClient,
  NET_API_URL,
  RELAY_ACCESS_KEY,
} from "@net-protocol/agents";
import {
  parseCommonOptionsWithDefault,
  parseReadOnlyOptionsWithDefault,
} from "../../cli/shared";
import { exitWithError } from "../../shared/output";

/**
 * Options shared by all agent write commands.
 */
export interface AgentAuthOptions {
  privateKey?: string;
  sessionToken?: string;
  operator?: string;
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
}

/**
 * Result of resolving agent auth — caller gets either an authenticated
 * client ready to go, plus the operator address.
 */
export interface AuthResolution {
  client: AgentClient;
  sessionToken: string;
  /** Only set when --private-key was used. Bankr/session-token callers
   *  don't expose the underlying LocalAccount. */
  account?: LocalAccount;
  operatorAddress: Address;
  chainId: number;
  apiUrl: string;
}

/**
 * Resolve the chain ID and API URL for a read-only command (no auth).
 *
 * Used by listConversations, getConversationHistory, and other pure
 * chain reads — no session required.
 */
export function resolveReadOnly(options: {
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
  operator?: string;
}): { chainId: number; apiUrl: string; operator?: Address } {
  // Reuse the CLI's chain-id parsing (handles env var + default-to-Base)
  const readOnly = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const apiUrl = options.apiUrl || process.env.NET_API_URL || NET_API_URL;

  let operator: Address | undefined;
  if (options.operator) {
    if (!isAddress(options.operator)) {
      exitWithError(`Invalid operator address: ${options.operator}`);
    }
    operator = options.operator as Address;
  }

  return { chainId: readOnly.chainId, apiUrl, operator };
}

/**
 * Resolve auth for an agent write command.
 *
 * Accepts either:
 *  1. --private-key (or NET_PRIVATE_KEY env) — CLI creates a fresh session
 *  2. --session-token (or NET_SESSION_TOKEN env) — uses pre-existing session
 *     (typically obtained via `netp agent session-encode` + external signer
 *     + `netp agent session-create`)
 *
 * When using --session-token, --operator must also be provided so read-after
 * operations know which address to look up.
 */
export async function resolveAuth(options: AgentAuthOptions): Promise<AuthResolution> {
  const sessionToken = options.sessionToken || process.env.NET_SESSION_TOKEN;
  const privateKey = options.privateKey || process.env.NET_PRIVATE_KEY || process.env.PRIVATE_KEY;

  // Mutual exclusivity: if both are provided, we could silently prefer one,
  // but requiring the user to pick prevents confusing behavior.
  if (sessionToken && options.privateKey) {
    exitWithError(
      "Cannot use both --session-token and --private-key. Pick one.",
    );
  }

  const apiUrl = options.apiUrl || process.env.NET_API_URL || NET_API_URL;

  // ── Session token path (external signer / Bankr) ──
  if (sessionToken) {
    if (!options.operator) {
      exitWithError(
        "--operator <address> is required when using --session-token. " +
          "It must match the address that signed the session.",
      );
    }
    if (!isAddress(options.operator!)) {
      exitWithError(`Invalid operator address: ${options.operator}`);
    }

    const readOnly = parseReadOnlyOptionsWithDefault({
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });

    const client = new AgentClient({
      apiUrl,
      chainId: readOnly.chainId,
    });

    return {
      client,
      sessionToken,
      operatorAddress: options.operator as Address,
      chainId: readOnly.chainId,
      apiUrl,
    };
  }

  // ── Private key path (classic flow) ──
  if (!privateKey) {
    exitWithError(
      "No auth provided. Use one of:\n" +
        "  --private-key <key> (or NET_PRIVATE_KEY env var)\n" +
        "  --session-token <token> + --operator <address> (for Bankr or other external signers)",
    );
  }

  const commonOptions = parseCommonOptionsWithDefault({
    privateKey,
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const account = privateKeyToAccount(commonOptions.privateKey);

  console.log(chalk.blue("Creating session..."));
  const { sessionToken: token } = await createRelaySession({
    apiUrl,
    chainId: commonOptions.chainId,
    operatorAddress: account.address,
    secretKey: RELAY_ACCESS_KEY,
    account,
  });

  const client = new AgentClient({
    apiUrl,
    chainId: commonOptions.chainId,
  });

  return {
    client,
    sessionToken: token,
    account,
    operatorAddress: account.address,
    chainId: commonOptions.chainId,
    apiUrl,
  };
}

/**
 * JSON.stringify replacer that converts bigints to decimal strings.
 * Used for outputting typed data and any other payloads that may
 * contain bigints (gas limits, amounts, etc.).
 */
export function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

/**
 * Stringify an object with bigints safely.
 */
export function jsonStringify(obj: unknown, indent = 2): string {
  return JSON.stringify(obj, bigintReplacer, indent);
}
