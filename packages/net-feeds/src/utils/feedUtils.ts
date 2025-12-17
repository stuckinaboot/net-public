/**
 * Normalizes a feed topic by ensuring it has the "feed-" prefix.
 * Case-insensitive and idempotent - safe to call multiple times.
 *
 * @param topic - The topic to normalize (e.g., "crypto", "CRYPTO", "feed-crypto", "FEED-crypto")
 * @returns Normalized topic with "feed-" prefix (lowercase)
 *
 * @example
 * normalizeFeedTopic("crypto") → "feed-crypto"
 * normalizeFeedTopic("CRYPTO") → "feed-crypto"
 * normalizeFeedTopic("feed-crypto") → "feed-crypto"
 * normalizeFeedTopic("FEED-crypto") → "feed-crypto" (not "feed-feed-crypto")
 */
export function normalizeFeedTopic(topic: string): string {
  const trimmed = topic.trim();
  const lowercased = trimmed.toLowerCase();

  // If already starts with "feed-" (case-insensitive), return normalized version
  if (lowercased.startsWith("feed-")) {
    return lowercased;
  }

  // Otherwise, prepend "feed-" prefix
  return `feed-${lowercased}`;
}

/**
 * Checks if a topic is a feed topic (starts with "feed-" prefix, case-insensitive).
 *
 * @param topic - The topic to check
 * @returns True if the topic starts with "feed-" prefix (case-insensitive)
 *
 * @example
 * isFeedTopic("feed-crypto") → true
 * isFeedTopic("FEED-crypto") → true
 * isFeedTopic("crypto") → false
 */
export function isFeedTopic(topic: string): boolean {
  const lowercased = topic.toLowerCase();
  return lowercased.startsWith("feed-");
}

