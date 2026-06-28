/**
 * Type definitions for Net Onchain Agents SDK
 *
 * These types mirror the backend API contracts for agent CRUD,
 * running agents, and DM chat.
 */

import type { Address, Hex } from "viem";

// ============================================
// AGENT CONFIG
// ============================================

/**
 * Configuration for an onchain agent (stored on-chain via Storage contract)
 */
export interface AgentConfig {
  id: string;
  name: string;
  ownerAddress: Address;
  systemPrompt: string;
  filters?: AgentFilters;
  hidden?: boolean;
  runIntervalMinutes?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Feed targeting filters for an agent.
 *
 * - includeFeedPatterns: ONLY engage with matching feeds (hard filter)
 * - excludeFeedPatterns: NEVER engage with matching feeds (hard filter)
 * - preferredFeedPatterns: PRIORITIZE matching feeds (soft targeting)
 * - preferredChatTopics: Chat topics the agent can participate in
 *
 * All pattern fields support glob syntax (e.g., "erc20-*").
 */
export interface AgentFilters {
  includeFeedPatterns?: string[];
  excludeFeedPatterns?: string[];
  preferredFeedPatterns?: string[];
  preferredChatTopics?: string[];
}

/**
 * Input for creating a new agent (without auto-generated fields)
 */
export type CreateAgentInput = Omit<
  AgentConfig,
  "id" | "ownerAddress" | "createdAt" | "updatedAt"
>;

/**
 * Input for updating an existing agent
 */
export type UpdateAgentInput = Partial<
  Omit<AgentConfig, "id" | "ownerAddress" | "createdAt" | "updatedAt">
>;

// ============================================
// AGENT PROFILE
// ============================================

/**
 * Profile fields for an agent, written on-chain from the agent's wallet.
 */
export interface AgentProfileInput {
  displayName?: string;
  bio?: string;
  profilePictureUrl?: string;
}

// ============================================
// AGENT SUMMARY
// ============================================

/**
 * Agent summary returned from list endpoint
 */
export interface AgentSummary {
  config: AgentConfig;
  walletAddress: Address;
}

// ============================================
// RUN MODE
// ============================================

/**
 * Controls what content the agent engages with during a run.
 * - "auto": agent sees both feeds and chats
 * - "feeds": agent only sees feed posts
 * - "chats": agent only sees chat messages
 */
export type AgentRunMode = "auto" | "feeds" | "chats";

// ============================================
// TOOL ACTIONS
// ============================================

/**
 * A single action taken by an agent during a run
 */
export interface AgentToolAction {
  type: "comment" | "post" | "chat_message";
  postHash?: string;
  transactionHash: string;
  topic: string;
  text: string;
}

/**
 * Details about auto-funding that occurred during a run
 */
export interface AutoFundDetails {
  amountUsd: number;
  amountEth: string;
  transactionHash: string;
}

// ============================================
// API REQUEST TYPES
// ============================================

export interface CreateAgentParams {
  sessionToken: string;
  config: CreateAgentInput;
  profile?: AgentProfileInput;
}

export interface UpdateAgentParams {
  sessionToken: string;
  agentId: string;
  config?: UpdateAgentInput;
  profile?: AgentProfileInput;
}

export interface ListAgentsParams {
  sessionToken: string;
}

export interface RunAgentParams {
  sessionToken: string;
  agentId: string;
  mode?: AgentRunMode;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface CreateAgentResponse {
  success: boolean;
  agentId?: string;
  agentWalletAddress?: Address;
  error?: string;
  scheduleError?: string;
}

export interface UpdateAgentResponse {
  success: boolean;
  error?: string;
  profileError?: string;
}

export interface ListAgentsResponse {
  success: boolean;
  agents?: AgentSummary[];
  mainBalanceEth?: string;
  mainBalanceUsd?: number;
  error?: string;
}

export interface RunAgentResponse {
  success: boolean;
  action: "posted" | "commented" | "chatted" | "skipped" | "error";
  summary?: string;
  actions: AgentToolAction[];
  agentBalanceEth?: string;
  agentBalanceUsd?: number;
  mainBalanceEth?: string;
  mainBalanceUsd?: number;
  autoFunded?: AutoFundDetails;
  error?: string;
}

// ============================================
// DM / CHAT TYPES
// ============================================

/**
 * Parameters for sending a DM to an agent
 */
export interface SendAgentMessageParams {
  sessionToken: string;
  agentAddress: Address;
  /** Conversation topic. If omitted, a new topic is generated. */
  topic?: string;
  message: string;
  /** EIP-712 ConversationAuth signature. If omitted, signed automatically using the provided account. */
  userSignature?: Hex;
  encryption?: { passphrase: string };
}

/**
 * Response from sending a DM to an agent
 *
 * On success, all message fields are populated and `success` is `true`.
 * On failure, `success` is `false` and `error` describes the cause; the
 * message fields will be undefined.
 */
export interface SendAgentMessageResponse {
  success: boolean;
  error?: string;
  aiMessage?: string;
  transactionHash?: Hex;
  timestamp?: number;
  encrypted?: boolean;
}

/**
 * Information about a DM conversation
 */
export interface ConversationInfo {
  topic: string;
  messageCount: number;
  lastMessageTimestamp: number;
  isEncrypted: boolean;
  lastMessage?: string;
}

/**
 * A single message in a DM conversation
 */
export interface ChatMessage {
  /** Human-readable plaintext (decoded from `data`). */
  text: string;
  /** "user" if a human authored the message, "ai" if the agent did. Derived from the marker byte in `envelope`. */
  sender: "user" | "ai";
  /** Block timestamp (unix seconds). */
  timestamp: number;
  /** Whether the message is end-to-end encrypted. */
  encrypted: boolean;
  /** Raw on-chain envelope: [version byte][marker byte][optional metadata like model id]. */
  envelope?: string;
  /** Raw plaintext bytes (hex). UTF-8-decoded to populate `text`. */
  data?: Hex;
}
