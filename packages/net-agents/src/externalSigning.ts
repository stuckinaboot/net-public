/**
 * Helpers for building EIP-712 typed data that external signers (e.g., Bankr)
 * can consume.
 *
 * These helpers return the exact typed data structures that the backend
 * expects to see in signatures. Consumers can output them as JSON, sign
 * externally, and pass the signatures back to the SDK/CLI.
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

// ============================================
// RELAY SESSION EIP-712
// ============================================

/**
 * Typed data returned by buildSessionTypedData.
 *
 * Output field shape: bigints are represented as decimal strings so the
 * result is safe to JSON.stringify. Consumers signing the data (e.g., via
 * Bankr's /agent/sign) must convert `expiresAt` back to a number/bigint
 * appropriate for their signer (viem accepts a decimal string).
 */
export interface SessionTypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
  };
  types: typeof RELAY_SESSION_TYPES;
  primaryType: "RelaySession";
  message: {
    operatorAddress: Address;
    secretKeyHash: Hex;
    /** Decimal string to keep the payload JSON-safe. */
    expiresAt: string;
  };
  /** Same value embedded in the message — returned separately for convenience. */
  expiresAt: number;
}

/**
 * Build EIP-712 typed data for a relay session signature.
 *
 * The returned payload can be JSON.stringified directly and handed to an
 * external signer (like Bankr's /agent/sign with signatureType
 * "eth_signTypedData_v4"). The resulting signature is then passed to
 * POST /api/relay/session along with the operator address and expiresAt.
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
}): SessionTypedData {
  const secretKey = params.secretKey ?? RELAY_ACCESS_KEY;
  const expiresIn = params.expiresIn ?? 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const secretKeyHash = keccak256(toBytes(secretKey));

  return {
    domain: {
      name: RELAY_DOMAIN_NAME,
      version: RELAY_DOMAIN_VERSION,
      chainId: params.chainId,
    },
    types: RELAY_SESSION_TYPES,
    primaryType: "RelaySession",
    message: {
      operatorAddress: params.operatorAddress,
      secretKeyHash,
      expiresAt: expiresAt.toString(),
    },
    expiresAt,
  };
}

/**
 * Exchange an externally-produced session signature for a session token.
 *
 * Calls POST /api/relay/session directly. Use this after signing the
 * output of buildSessionTypedData with an external signer.
 *
 * @param params.apiUrl - Net API URL (e.g., https://netprotocol.app)
 * @param params.chainId - Chain ID (must match the one used in buildSessionTypedData)
 * @param params.operatorAddress - The address that produced the signature
 * @param params.signature - Signature from the external signer
 * @param params.expiresAt - expiresAt from buildSessionTypedData (unix seconds)
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
 * Typed data for the ConversationAuth EIP-712 signature.
 *
 * All fields are JSON-safe (no bigints).
 */
export interface ConversationAuthTypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: Address;
  };
  types: typeof CONVERSATION_AUTH_TYPES;
  primaryType: "ConversationAuth";
  message: { topic: string };
}

/**
 * Build EIP-712 typed data for authorizing a DM conversation topic.
 *
 * The returned payload is fully JSON-safe. Hand it to an external signer
 * (Bankr /agent/sign with "eth_signTypedData_v4"); the resulting signature
 * is the `userSignature` / `topicSignature` for subsequent DM sends in
 * this conversation.
 *
 * @param params.topic - Conversation topic (e.g., agent-chat-0x...-nanoid)
 * @param params.chainId - Chain ID (determines which AI Chat contract is used)
 */
export function buildConversationAuthTypedData(params: {
  topic: string;
  chainId: number;
}): ConversationAuthTypedData {
  return {
    domain: {
      ...CONVERSATION_AUTH_DOMAIN,
      chainId: params.chainId,
      verifyingContract: getAIChatContractAddress(params.chainId),
    },
    types: CONVERSATION_AUTH_TYPES,
    primaryType: "ConversationAuth",
    message: { topic: params.topic },
  };
}
