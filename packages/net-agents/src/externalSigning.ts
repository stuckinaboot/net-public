/**
 * Helpers for building EIP-712 typed data that external signers (e.g., Bankr)
 * can consume.
 *
 * These helpers return a consistent shape:
 *
 *   { typedData: { domain, types, primaryType, message }, ...extras }
 *
 * where `typedData` is exactly what an EIP-712 signer expects (e.g., Bankr's
 * `typedData` field). The sibling fields carry values the caller needs
 * *alongside* the signature — e.g., `expiresAt` for session-create, or
 * `topic` for DMs.
 */

import { keccak256, toBytes } from "viem";
import type { Address, Hex } from "viem";
import {
  RELAY_DOMAIN_NAME,
  RELAY_DOMAIN_VERSION,
  RELAY_SESSION_TYPES,
} from "@net-protocol/relay";
import {
  CONVERSATION_AUTH_DOMAIN,
  CONVERSATION_AUTH_TYPES,
  RELAY_ACCESS_KEY,
} from "./constants";
import { getAIChatContractAddress } from "./dm/signature";

// EIP-712 spec allows omitting the EIP712Domain entry from `types` — most
// signers derive it from `domain` automatically. But strict signers (e.g.,
// some Bankr API versions) reject the payload without an explicit
// EIP712Domain definition. Include it to maximize compatibility.
const EIP712_DOMAIN_TYPE_NO_VERIFYING_CONTRACT = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
] as const;

const EIP712_DOMAIN_TYPE_WITH_VERIFYING_CONTRACT = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
] as const;

// ============================================
// RELAY SESSION EIP-712
// ============================================

/**
 * Just the EIP-712 typed data structure — exactly what an external signer
 * (e.g., Bankr /agent/sign) expects in its `typedData` field.
 *
 * BigInt values are pre-stringified so JSON.stringify works. Signers
 * normalize decimal strings back to the correct integer representation
 * when hashing uint256.
 */
export interface SessionTypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
  };
  types: {
    EIP712Domain: typeof EIP712_DOMAIN_TYPE_NO_VERIFYING_CONTRACT;
  } & typeof RELAY_SESSION_TYPES;
  primaryType: "RelaySession";
  message: {
    operatorAddress: Address;
    secretKeyHash: Hex;
    /** Decimal string for JSON-safety — a viem uint256 hash treats it as int. */
    expiresAt: string;
  };
}

/**
 * Output of buildSessionTypedData.
 *
 * - `typedData` is the payload to sign (pass directly as Bankr's typedData)
 * - `expiresAt` is the unix-seconds value the caller must pass to
 *   session-create alongside the signature
 */
export interface BuildSessionResult {
  typedData: SessionTypedData;
  expiresAt: number;
}

/**
 * Build EIP-712 typed data for a relay session signature.
 *
 * Usage:
 *   const { typedData, expiresAt } = buildSessionTypedData({...});
 *   const sig = await bankrSign({ signatureType: "eth_signTypedData_v4", typedData });
 *   const { sessionToken } = await exchangeSessionSignature({
 *     ...params,
 *     signature: sig,
 *     expiresAt,
 *   });
 *
 * @param params.operatorAddress - Address that will sign the session
 * @param params.chainId - Chain ID for the session (must match subsequent calls)
 * @param params.expiresIn - Seconds until expiry (default: 3600, max: 86400)
 * @param params.secretKey - Relay access key (defaults to RELAY_ACCESS_KEY)
 */
export function buildSessionTypedData(params: {
  operatorAddress: Address;
  chainId: number;
  expiresIn?: number;
  secretKey?: string;
}): BuildSessionResult {
  const secretKey = params.secretKey ?? RELAY_ACCESS_KEY;
  const expiresIn = params.expiresIn ?? 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const secretKeyHash = keccak256(toBytes(secretKey));

  return {
    typedData: {
      domain: {
        name: RELAY_DOMAIN_NAME,
        version: RELAY_DOMAIN_VERSION,
        chainId: params.chainId,
      },
      types: {
        EIP712Domain: EIP712_DOMAIN_TYPE_NO_VERIFYING_CONTRACT,
        ...RELAY_SESSION_TYPES,
      },
      primaryType: "RelaySession",
      message: {
        operatorAddress: params.operatorAddress,
        secretKeyHash,
        expiresAt: expiresAt.toString(),
      },
    },
    expiresAt,
  };
}

/**
 * Exchange an externally-produced session signature for a session token.
 *
 * Calls POST /api/relay/session directly. Use this after signing the
 * `typedData` returned by buildSessionTypedData.
 *
 * @param params.apiUrl - Net API URL (e.g., https://netprotocol.app)
 * @param params.chainId - Chain ID (must match buildSessionTypedData)
 * @param params.operatorAddress - The address that produced the signature
 * @param params.signature - Signature from the external signer
 * @param params.expiresAt - expiresAt from BuildSessionResult (unix seconds)
 * @param params.secretKey - Relay access key (defaults to RELAY_ACCESS_KEY)
 */
export async function exchangeSessionSignature(params: {
  apiUrl: string;
  chainId: number;
  operatorAddress: Address;
  signature: Hex;
  expiresAt: number;
  secretKey?: string;
}): Promise<{ sessionToken: string; expiresAt: number }> {
  const secretKey = params.secretKey ?? RELAY_ACCESS_KEY;

  const response = await fetch(`${params.apiUrl}/api/relay/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chainId: params.chainId,
      operatorAddress: params.operatorAddress,
      secretKey,
      signature: params.signature,
      expiresAt: params.expiresAt,
    }),
  });

  const data = (await response.json()) as {
    success?: boolean;
    sessionToken?: string;
    expiresAt?: number;
    error?: string;
  };

  if (!response.ok || !data.success || !data.sessionToken || !data.expiresAt) {
    throw new Error(
      `Session creation failed: ${data.error ?? response.statusText}`,
    );
  }

  return {
    sessionToken: data.sessionToken,
    expiresAt: data.expiresAt,
  };
}

// ============================================
// CONVERSATION AUTH EIP-712
// ============================================

/**
 * EIP-712 typed data for ConversationAuth. Fully JSON-safe.
 */
export interface ConversationAuthTypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: Address;
  };
  types: {
    EIP712Domain: typeof EIP712_DOMAIN_TYPE_WITH_VERIFYING_CONTRACT;
  } & typeof CONVERSATION_AUTH_TYPES;
  primaryType: "ConversationAuth";
  message: { topic: string };
}

/**
 * Output of buildConversationAuthTypedData.
 *
 * - `typedData` is the payload to sign (pass directly as Bankr's typedData)
 * - `topic` is the conversation topic — pass to the DM command alongside
 *   the signature so the backend can pair them
 */
export interface BuildConversationAuthResult {
  typedData: ConversationAuthTypedData;
  topic: string;
}

/**
 * Build EIP-712 typed data for authorizing a DM conversation topic.
 *
 * @param params.topic - Conversation topic (e.g., agent-chat-0x...-nanoid)
 * @param params.chainId - Chain ID (determines which AI Chat contract is used)
 */
export function buildConversationAuthTypedData(params: {
  topic: string;
  chainId: number;
}): BuildConversationAuthResult {
  return {
    typedData: {
      domain: {
        ...CONVERSATION_AUTH_DOMAIN,
        chainId: params.chainId,
        verifyingContract: getAIChatContractAddress(params.chainId),
      },
      types: {
        EIP712Domain: EIP712_DOMAIN_TYPE_WITH_VERIFYING_CONTRACT,
        ...CONVERSATION_AUTH_TYPES,
      },
      primaryType: "ConversationAuth",
      message: { topic: params.topic },
    },
    topic: params.topic,
  };
}
