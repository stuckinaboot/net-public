/**
 * Default chain ID (Base mainnet)
 */
export const DEFAULT_CHAIN_ID = 8453;

/**
 * Normalize a feed name to lowercase for consistency.
 */
export function normalizeFeedName(feed: string): string {
  return feed.toLowerCase();
}
