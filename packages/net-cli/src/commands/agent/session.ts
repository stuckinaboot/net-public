/**
 * Session management commands for the external-signer flow (e.g., Bankr).
 *
 * The classic private-key flow handles session creation transparently.
 * These commands expose the underlying two-step flow so external signers
 * can plug in:
 *
 *   1. `session-encode --operator 0x...` → emits EIP-712 typed data + expiresAt
 *   2. sign the typed data externally (e.g., via Bankr /agent/sign)
 *   3. `session-create --operator 0x... --signature 0x... --expires-at N` →
 *      emits the sessionToken to use with subsequent commands
 */

import { Command } from "commander";
import { isAddress, type Hex } from "viem";
import {
  buildSessionTypedData,
  exchangeSessionSignature,
  NET_API_URL,
} from "@net-protocol/agents";
import { exitWithError } from "../../shared/output";
import { jsonStringify } from "./shared";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";

interface SessionEncodeOptions {
  operator: string;
  chainId?: number;
  expiresIn?: number;
}

async function executeSessionEncode(options: SessionEncodeOptions): Promise<void> {
  try {
    if (!isAddress(options.operator)) {
      exitWithError(`Invalid operator address: ${options.operator}`);
    }

    const { chainId } = parseReadOnlyOptionsWithDefault({
      chainId: options.chainId,
    });

    const typedData = buildSessionTypedData({
      operatorAddress: options.operator as `0x${string}`,
      chainId,
      expiresIn: options.expiresIn,
    });

    // Output is fully JSON-safe (bigints pre-stringified in builder).
    console.log(jsonStringify(typedData));
  } catch (error) {
    exitWithError(
      `session-encode failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentSessionEncodeCommand(parent: Command): void {
  parent
    .command("session-encode")
    .description(
      "Emit the RelaySession EIP-712 typed data to sign externally " +
        "(e.g., via Bankr). Pair with `agent session-create`.",
    )
    .requiredOption(
      "--operator <address>",
      "Address that will sign the session (must match signer)",
    )
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option(
      "--expires-in <seconds>",
      "Session lifetime in seconds (default: 3600, max: 86400)",
      (v) => parseInt(v, 10),
    )
    .action(async (options) => {
      await executeSessionEncode(options);
    });
}

// ============================================================
// session-create
// ============================================================

interface SessionCreateOptions {
  operator: string;
  signature: string;
  expiresAt: number;
  chainId?: number;
  apiUrl?: string;
}

async function executeSessionCreate(options: SessionCreateOptions): Promise<void> {
  try {
    if (!isAddress(options.operator)) {
      exitWithError(`Invalid operator address: ${options.operator}`);
    }
    if (!options.signature.startsWith("0x")) {
      exitWithError("--signature must be a 0x-prefixed hex string");
    }
    if (!options.expiresAt || !Number.isFinite(options.expiresAt)) {
      exitWithError("--expires-at must be a unix timestamp (seconds)");
    }

    const { chainId } = parseReadOnlyOptionsWithDefault({
      chainId: options.chainId,
    });
    const apiUrl = options.apiUrl || process.env.NET_API_URL || NET_API_URL;

    const result = await exchangeSessionSignature({
      apiUrl,
      chainId,
      operatorAddress: options.operator as `0x${string}`,
      signature: options.signature as Hex,
      expiresAt: options.expiresAt,
    });

    console.log(jsonStringify(result));
  } catch (error) {
    exitWithError(
      `session-create failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function registerAgentSessionCreateCommand(parent: Command): void {
  parent
    .command("session-create")
    .description(
      "Exchange an externally-produced signature for a session token. " +
        "Pair with `agent session-encode`.",
    )
    .requiredOption(
      "--operator <address>",
      "Address that produced the signature (must match the ecrecover result)",
    )
    .requiredOption("--signature <hex>", "EIP-712 signature over the session typed data")
    .requiredOption(
      "--expires-at <timestamp>",
      "expiresAt value from session-encode (unix seconds)",
      (v) => parseInt(v, 10),
    )
    .option("--chain-id <id>", "Chain ID (default: 8453)", (v) => parseInt(v, 10))
    .option("--api-url <url>", "Net Protocol API URL")
    .action(async (options) => {
      await executeSessionCreate(options);
    });
}
