/**
 * Topic utilities for agent DM conversations.
 *
 * Topic format: "agent-chat-{0xAgentAddress}-{nanoid}"
 * Shared between SDK and CLI.
 */

import { nanoid } from "nanoid";
import type { Address } from "viem";

/**
 * Generate a new agent-chat topic for a DM conversation.
 *
 * @param agentAddress - The agent's wallet address
 * @returns A unique topic string like "agent-chat-0xAbc...123-xK9mQ3nR"
 */
export function generateAgentChatTopic(agentAddress: Address): string {
  return `agent-chat-${agentAddress}-${nanoid(8)}`;
}

/**
 * Parse the agent wallet address from an agent-chat topic.
 *
 * @param topic - Topic string to parse
 * @returns The agent address, or null if not an agent-chat topic
 */
export function parseAgentAddressFromTopic(topic: string): string | null {
  const match = topic.match(/^agent-chat-(0x[a-fA-F0-9]{40})-/);
  return match ? match[1] : null;
}

/**
 * Check if a topic is an agent-chat topic.
 */
export function isAgentChatTopic(topic: string): boolean {
  return parseAgentAddressFromTopic(topic) !== null;
}
