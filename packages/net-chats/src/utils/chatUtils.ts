import { CHAT_TOPIC_PREFIX } from "../constants";

/**
 * Normalizes a chat topic by ensuring it has the "chat-" prefix.
 * Case-insensitive and idempotent - safe to call multiple times.
 *
 * @param topic - The topic to normalize (e.g., "general", "GENERAL", "chat-general")
 * @returns Normalized topic with "chat-" prefix (lowercase)
 *
 * @example
 * normalizeChatTopic("general") → "chat-general"
 * normalizeChatTopic("GENERAL") → "chat-general"
 * normalizeChatTopic("chat-general") → "chat-general"
 * normalizeChatTopic("CHAT-general") → "chat-general" (not "chat-chat-general")
 */
export function normalizeChatTopic(topic: string): string {
  const trimmed = topic.trim();
  const lowercased = trimmed.toLowerCase();

  // If already starts with "chat-" (case-insensitive), return normalized version
  if (lowercased.startsWith(CHAT_TOPIC_PREFIX)) {
    return lowercased;
  }

  // Otherwise, prepend "chat-" prefix
  return `${CHAT_TOPIC_PREFIX}${lowercased}`;
}

/**
 * Checks if a topic is a chat topic (starts with "chat-" prefix, case-insensitive).
 *
 * @param topic - The topic to check
 * @returns True if the topic starts with "chat-" prefix (case-insensitive)
 *
 * @example
 * isChatTopic("chat-general") → true
 * isChatTopic("CHAT-general") → true
 * isChatTopic("general") → false
 */
export function isChatTopic(topic: string): boolean {
  const lowercased = topic.toLowerCase();
  return lowercased.startsWith(CHAT_TOPIC_PREFIX);
}
