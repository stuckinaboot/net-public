/**
 * Constants for Net Onchain Agents SDK
 */

import type { Address } from "viem";

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
 * This is NOT a secret — security comes from the server-side master key.
 * Same value used by the frontend and backend.
 */
export const RELAY_ACCESS_KEY = "net-relay-public-access-key-v1";

// ============================================
// CONTRACT ADDRESSES
// ============================================

/** WillieNet messaging contract (same on all chains) */
export const NET_CONTRACT_ADDRESS =
  "0x00000000B24D62781dB359b07880a105cD0b64e6" as Address;

/** Bulk helper contract for efficient conversation listing */
export const NET_MESSAGE_COUNT_BULK_HELPER_ADDRESS =
  "0x00000005CEB10AE2b2784AA2a0D3c98B1fa60b15" as Address;

/** AI Chat contract addresses (per chain) */
export const AI_CHAT_CONTRACT: Record<number, Address> = {
  8453: "0x0000000e8d76d7a8deaa8a32fbed80b5354670e7",
  84532: "0x0000000e8d76d7a8deaa8a32fbed80b5354670e7",
};

// ============================================
// EIP-712 CONVERSATION AUTH
// ============================================

/** EIP-712 domain for conversation authorization signatures */
export const CONVERSATION_AUTH_DOMAIN = {
  name: "Net AI Chat",
  version: "1",
} as const;

/** EIP-712 types for conversation authorization */
export const CONVERSATION_AUTH_TYPES = {
  ConversationAuth: [{ name: "topic", type: "string" }],
} as const;

// ============================================
// MESSAGE TYPE MARKERS
// ============================================

/** Message version byte */
export const MESSAGE_VERSION = 0x01;

/** Message type markers for the on-chain data field */
export const MESSAGE_TYPES = {
  HUMAN: 0x00,
  AI: 0x01,
  ENCRYPTED_HUMAN: 0x02,
  ENCRYPTED_AI: 0x03,
} as const;

// ============================================
// CONVERSATION INDEX
// ============================================

/** Topic used for efficient conversation discovery via bulk helper */
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
