/**
 * Shared utilities for agent CLI commands.
 *
 * Two auth modes are supported:
 * - Private key (--private-key or NET_PRIVATE_KEY) — CLI creates session
 * - Pre-existing session token (--session-token or NET_SESSION_TOKEN) —
 *   typically obtained via `agent session-encode` + external signer
 *   (e.g. Bankr) + `agent session-create`
 */

import chalk from "chalk";
import { Command } from "commander";
import { privateKeyToAccount, type LocalAccount } from "viem/accounts";
import { isAddress } from "viem";
import type { Address } from "viem";
import { createRelaySession } from "@net-protocol/relay";
import {
  AgentClient,
  NET_API_URL,
  RELAY_ACCESS_KEY,
  type AgentFilters,
  type AgentProfileInput,
  type AgentRunMode,
} from "@net-protocol/agents";
import {
  parseCommonOptionsWithDefault,
  parseReadOnlyOptionsWithDefault,
} from "../../cli/shared";
import { exitWithError } from "../../shared/output";

// ============================================
// OPTION INTERFACES
// ============================================

/** Chain/API options shared by every agent command. */
export interface AgentCommonOptions {
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
}

/** Options for read-only commands that only need a wallet address. */
export interface AgentReadOnlyOptions extends AgentCommonOptions {
  operator?: string;
}

/** Options shared by all agent write commands (CRUD, run, DM). */
export interface AgentAuthOptions extends AgentCommonOptions {
  privateKey?: string;
  sessionToken?: string;
  operator?: string;
}

/** Options for commands that accept filter flags (create, update). */
export interface AgentFilterOptions {
  includeFeed?: string[];
  excludeFeed?: string[];
  preferredFeed?: string[];
  chatTopic?: string[];
}

/** Options for commands that accept profile flags (create, update). */
export interface AgentProfileOptions {
  displayName?: string;
  bio?: string;
}

export interface AuthResolution {
  client: AgentClient;
  sessionToken: string;
  /** Only set on the --private-key path; session-token callers don't expose it. */
  account?: LocalAccount;
  operatorAddress: Address;
  chainId: number;
  apiUrl: string;
}

// ============================================
// CONSTANTS
// ============================================

export const VALID_RUN_MODES = ["auto", "feeds", "chats"] as const;

// ============================================
// COMMAND OPTION HELPERS
// ============================================

/**
 * Attach the standard auth + common options to a write command.
 * Every write command (create, update, run, etc.) needs the same set.
 */
export function addAuthOptions(cmd: Command): Command {
  return addCommonOptions(cmd)
    .option("--private-key <key>", "Private key (0x-prefixed)")
    .option(
      "--session-token <token>",
      "Pre-existing session token (alternative to --private-key)",
    )
    .option(
      "--operator <address>",
      "Operator address (required with --session-token)",
    );
}

/** Attach chain/API options (no auth). Used by read-only commands. */
export function addCommonOptions(cmd: Command): Command {
  return cmd
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--api-url <url>", "Net Protocol API URL");
}

/**
 * Attach filter options (create and update both accept these).
 */
export function addFilterOptions(cmd: Command): Command {
  return cmd
    .option("--include-feed <pattern...>", "Only engage with matching feeds")
    .option("--exclude-feed <pattern...>", "Never engage with matching feeds")
    .option("--preferred-feed <pattern...>", "Prioritize matching feeds")
    .option("--chat-topic <topic...>", "Chat topics to participate in");
}

/** Attach display-name / bio options (create and update both accept these). */
export function addProfileOptions(cmd: Command): Command {
  return cmd
    .option("--display-name <name>", "Agent display name")
    .option("--bio <text>", "Agent bio");
}

// ============================================
// INPUT BUILDERS
// ============================================

/** Build an AgentFilters object from CLI options, or undefined when no flags are set. */
export function buildFilters(options: AgentFilterOptions): AgentFilters | undefined {
  const filters: AgentFilters = {};
  if (options.includeFeed?.length) filters.includeFeedPatterns = options.includeFeed;
  if (options.excludeFeed?.length) filters.excludeFeedPatterns = options.excludeFeed;
  if (options.preferredFeed?.length) filters.preferredFeedPatterns = options.preferredFeed;
  if (options.chatTopic?.length) filters.preferredChatTopics = options.chatTopic;
  return Object.keys(filters).length > 0 ? filters : undefined;
}

/** Build an AgentProfileInput from CLI options, or undefined when no flags are set. */
export function buildProfile(options: AgentProfileOptions): AgentProfileInput | undefined {
  const profile: AgentProfileInput = {};
  if (options.displayName) profile.displayName = options.displayName;
  if (options.bio) profile.bio = options.bio;
  return Object.keys(profile).length > 0 ? profile : undefined;
}

/** Parse and validate a run-mode flag. Exits the process on invalid input. */
export function parseRunMode(raw: string | undefined): AgentRunMode {
  const mode = (raw ?? "auto") as AgentRunMode;
  if (!VALID_RUN_MODES.includes(mode as (typeof VALID_RUN_MODES)[number])) {
    exitWithError(`Invalid mode "${mode}". Must be one of: ${VALID_RUN_MODES.join(", ")}`);
  }
  return mode;
}

// ============================================
// AUTH RESOLUTION
// ============================================

/** Resolve chain ID, API URL, and validate operator for a read-only command. */
export function resolveReadOnly(options: AgentReadOnlyOptions): {
  chainId: number;
  apiUrl: string;
  operator?: Address;
} {
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
 * Resolve auth for a write command using either --private-key or --session-token.
 */
export async function resolveAuth(options: AgentAuthOptions): Promise<AuthResolution> {
  const sessionToken = options.sessionToken || process.env.NET_SESSION_TOKEN;
  const privateKey =
    options.privateKey || process.env.NET_PRIVATE_KEY || process.env.PRIVATE_KEY;

  if (sessionToken && options.privateKey) {
    exitWithError("Cannot use both --session-token and --private-key. Pick one.");
  }

  const apiUrl = options.apiUrl || process.env.NET_API_URL || NET_API_URL;

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
    const client = new AgentClient({ apiUrl, chainId: readOnly.chainId });

    return {
      client,
      sessionToken,
      operatorAddress: options.operator as Address,
      chainId: readOnly.chainId,
      apiUrl,
    };
  }

  if (!privateKey) {
    exitWithError(
      "No auth provided. Use one of:\n" +
        "  --private-key <key> (or NET_PRIVATE_KEY env var)\n" +
        "  --session-token <token> + --operator <address> (for Bankr or other external signers)",
    );
  }

  // Pass the original CLI flag value (not the env-resolved key) so the
  // "Private key provided via command line" warning inside
  // parseCommonOptionsWithDefault only fires when --private-key was actually
  // used. parseCommonOptionsWithDefault re-resolves env vars internally.
  const commonOptions = parseCommonOptionsWithDefault({
    privateKey: options.privateKey,
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });
  const account = privateKeyToAccount(commonOptions.privateKey);

  // Route status to stderr so --json consumers reading stdout get clean JSON.
  console.error(chalk.blue("Creating session..."));
  const { sessionToken: token } = await createRelaySession({
    apiUrl,
    chainId: commonOptions.chainId,
    operatorAddress: account.address,
    secretKey: RELAY_ACCESS_KEY,
    account,
  });

  const client = new AgentClient({ apiUrl, chainId: commonOptions.chainId });

  return {
    client,
    sessionToken: token,
    account,
    operatorAddress: account.address,
    chainId: commonOptions.chainId,
    apiUrl,
  };
}

// ============================================
// OUTPUT HELPERS
// ============================================

/** JSON.stringify replacer converting bigints to decimal strings. */
export function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

/** JSON.stringify wrapper that handles bigints. */
export function jsonStringify(obj: unknown, indent = 2): string {
  return JSON.stringify(obj, bigintReplacer, indent);
}
