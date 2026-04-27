/**
 * Constants for Net Onchain Agents SDK
 */

import type { Address } from "viem";
import { NET_CONTRACT_ADDRESS as CORE_NET_CONTRACT_ADDRESS } from "@net-protocol/core";

// ============================================
// API URLs
// ============================================

/** Production API URL for Net Protocol */
export const NET_API_URL = "https://netprotocol.app";

/** Testnet API URL for Net Protocol */
export const NET_TESTNET_API_URL = "https://testnets.netprotocol.app";

// ============================================
// RELAY ACCESS KEY
// ============================================

/**
 * Public access key used for relay wallet derivation.
 * Not actually secret — security comes from the server-side master key.
 */
export const RELAY_ACCESS_KEY = "net-relay-public-access-key-v1";

// ============================================
// CONTRACT ADDRESSES
// ============================================

/** Re-exported from @net-protocol/core for convenience. */
export const NET_CONTRACT_ADDRESS = CORE_NET_CONTRACT_ADDRESS;

/** Bulk helper contract for efficient conversation listing */
export const NET_MESSAGE_COUNT_BULK_HELPER_ADDRESS =
  "0x00000005CEB10AE2B2784AA2A0D3c98B1fa60b15" as Address;

/** AI Chat contract addresses (per chain) */
export const AI_CHAT_CONTRACT: Record<number, Address> = {
  8453: "0x0000000e8d76d7a8deaa8a32fbed80b5354670e7",
  84532: "0x0000000e8d76d7a8deaa8a32fbed80b5354670e7",
};

// ============================================
// EIP-712 CONVERSATION AUTH
// ============================================

export const CONVERSATION_AUTH_DOMAIN = {
  name: "Net AI Chat",
  version: "1",
} as const;

export const CONVERSATION_AUTH_TYPES = {
  ConversationAuth: [{ name: "topic", type: "string" }],
} as const;

// ============================================
// MESSAGE TYPE MARKERS
// ============================================

export const MESSAGE_VERSION = 0x01;

export const MESSAGE_TYPES = {
  HUMAN: 0x00,
  AI: 0x01,
  ENCRYPTED_HUMAN: 0x02,
  ENCRYPTED_AI: 0x03,
} as const;

// ============================================
// CONVERSATION INDEX
// ============================================

/** Topic used by the bulk helper to enumerate a user's conversations. */
export const CONVERSATION_INDEX_TOPIC = "_";

// ============================================
// AGENT LIMITS (mirrors backend limits)
// ============================================

export const AGENT_LIMITS = {
  maxAgentsPerUser: 10,
  maxNameLength: 50,
  minNameLength: 1,
  maxSystemPromptLength: 4000,
  minSystemPromptLength: 10,
  maxFeedPatterns: 20,
  maxChatTopics: 10,
  maxProfileDisplayNameLength: 32,
  maxProfileBioLength: 280,
  maxProfilePictureUrlLength: 500,
  minRunIntervalMinutes: 1,
  maxRunIntervalMinutes: 1440,
} as const;

// ============================================
// DEFAULTS
// ============================================

/** Max conversations returned by listConversations when caller omits `limit`. */
export const DEFAULT_MAX_CONVERSATIONS = 100;

/** Max messages returned by getConversationHistory when caller omits `limit`. */
export const DEFAULT_MAX_HISTORY_MESSAGES = 50;

// ============================================
// AGENT OPERATION COSTS (USD)
// ============================================

/**
 * Approximate per-operation Net credit cost floor in USD. Used by SDK
 * consumers to predict whether a balance is sufficient for the next call
 * (the relay's `relay balance` `sufficientBalance` flag only checks the
 * gas-floor threshold, not per-op cost).
 *
 * Treat as a *floor*, not an exact cost. Live costs may be higher
 * depending on LLM usage.
 */
export const AGENT_OP_COST_USD = 0.1;
