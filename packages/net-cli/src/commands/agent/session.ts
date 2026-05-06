/**
 * Session management commands for the external-signer flow (e.g. Bankr).
 *
 * The private-key flow creates sessions transparently via resolveAuth.
 * These commands expose the two-step flow so external signers can plug in:
 *
 *   1. `session-encode --operator 0x...` → { typedData, expiresAt }
 *   2. sign typedData externally (Bankr /agent/sign)
 *   3. `session-create --signature 0x... --expires-at N` → { sessionToken }
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

interface SessionCreateOptions {
  operator: string;
  signature: string;
  expiresAt: number;
  chainId?: number;
  apiUrl?: string;
}

async function executeSessionEncode(options: SessionEncodeOptions): Promise<void> {
  try {
    if (!isAddress(options.operator)) {
      exitWithError(`Invalid operator address: ${options.operator}`);
    }

    const { chainId } = parseReadOnlyOptionsWithDefault({
      chainId: options.chainId,
    });

    const result = buildSessionTypedData({
      operatorAddress: options.operator as `0x${string}`,
      chainId,
      expiresIn: options.expiresIn,
    });

    console.log(jsonStringify(result));
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
      "Emit { typedData, expiresAt } for external signing (e.g., Bankr). " +
        "Pipe .typedData to your signer, pass .expiresAt + the resulting " +
        "signature to `agent session-create`.",
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
    .option(
      "--json",
      "Output as JSON (default behavior; included for consistency with peer commands)",
    )
    .action(async (options) => {
      await executeSessionCreate(options);
    });
}
