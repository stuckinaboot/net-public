/**
 * URL builders for Net Protocol web pages and external services.
 *
 * These helpers exist so callers (and AI agents reading CLI JSON output) never
 * need to construct URLs by hand. URL grammar quirks (chain ID -> slug, the
 * "feed-" topic prefix, hyphen-vs-colon separators in comment IDs, lowercased
 * addresses, etc.) all live here in one place.
 */

const WEBSITE_BASE = "https://netprotocol.app";
const STORAGE_BASE = "https://storedon.net";

/**
 * Chain ID -> URL slug used in netprotocol.app paths (matches OpenSea-style
 * slugs from website/src/app/constants.ts CHAIN_ID_TO_OPENSEA_CHAIN_MAP).
 */
const CHAIN_SLUG: Record<number, string> = {
  1: "ethereum",
  130: "unichain",
  143: "monad",
  999: "hyperliquid",
  4326: "megaeth",
  5112: "ham",
  8453: "base",
  9745: "plasma",
  57073: "ink",
  84532: "base_sepolia",
  666666666: "degen",
  11155111: "sepolia",
};

/**
 * Chain ID -> block explorer base URL (no trailing slash). Returns null for
 * chains where we don't have a confirmed canonical explorer.
 */
const EXPLORER_BASE: Record<number, string> = {
  1: "https://etherscan.io",
  130: "https://uniscan.xyz",
  143: "https://monadscan.com",
  999: "https://hyperliquid.cloud.blockscout.com",
  5112: "https://explorer.ham.fun",
  8453: "https://basescan.org",
  9745: "https://plasmascan.to",
  57073: "https://explorer.inkonchain.com",
  84532: "https://sepolia.basescan.org",
  11155111: "https://sepolia.etherscan.io",
};

export function chainSlug(chainId: number): string | null {
  return CHAIN_SLUG[chainId] ?? null;
}

/**
 * Strip the "feed-" prefix from a topic if present (case-insensitive).
 * Used when converting an on-chain topic to the URL path/query form.
 */
function stripFeedPrefix(topic: string): string {
  const lower = topic.toLowerCase();
  return lower.startsWith("feed-") ? lower.slice(5) : lower;
}

/**
 * URL of a feed page. `feedName` may be passed with or without the "feed-"
 * prefix; either way the URL form is stripped+lowercased.
 */
export function feedUrl(chainId: number, feedName: string): string | null {
  const slug = chainSlug(chainId);
  if (!slug) return null;
  return `${WEBSITE_BASE}/app/feed/${slug}/${stripFeedPrefix(feedName)}`;
}

/**
 * URL of an address's wall (their personal feed at `feed-{lower(address)}`).
 */
export function walletUrl(chainId: number, address: string): string | null {
  const slug = chainSlug(chainId);
  if (!slug) return null;
  return `${WEBSITE_BASE}/app/feed/${slug}/${address.toLowerCase()}`;
}

/**
 * URL of a user/agent profile page.
 */
export function profileUrl(chainId: number, address: string): string | null {
  const slug = chainSlug(chainId);
  if (!slug) return null;
  return `${WEBSITE_BASE}/app/profile/${slug}/${address.toLowerCase()}`;
}

/**
 * URL of a group chat page.
 */
export function chatUrl(chainId: number, chatName: string): string | null {
  const slug = chainSlug(chainId);
  if (!slug) return null;
  return `${WEBSITE_BASE}/app/chat/${slug}/${encodeURIComponent(
    chatName.toLowerCase()
  )}`;
}

/**
 * URL of a Netr token page.
 */
export function tokenUrl(
  chainId: number,
  tokenAddress: string
): string | null {
  const slug = chainSlug(chainId);
  if (!slug) return null;
  return `${WEBSITE_BASE}/app/token/${slug}/${tokenAddress.toLowerCase()}`;
}

/**
 * URL of a Bazaar NFT collection page.
 */
export function bazaarUrl(
  chainId: number,
  nftAddress: string
): string | null {
  const slug = chainSlug(chainId);
  if (!slug) return null;
  return `${WEBSITE_BASE}/app/bazaar/${slug}/${nftAddress.toLowerCase()}`;
}

/**
 * URL of an onchain agent detail page.
 */
export function agentUrl(chainId: number, agentId: string): string | null {
  const slug = chainSlug(chainId);
  if (!slug) return null;
  return `${WEBSITE_BASE}/app/agents/${slug}/${encodeURIComponent(agentId)}`;
}

/**
 * Public storage retrieval URL via storedon.net. Works on any chain with Net
 * Storage deployed (returns a URL even when chainSlug is unknown — storedon
 * uses numeric chain IDs).
 */
export function storageUrl(
  chainId: number,
  operatorAddress: string,
  key: string
): string {
  return `${STORAGE_BASE}/net/${chainId}/storage/load/${operatorAddress.toLowerCase()}/${encodeURIComponent(
    key
  )}`;
}

export function explorerTxUrl(
  chainId: number,
  txHash: string
): string | null {
  const base = EXPLORER_BASE[chainId];
  if (!base) return null;
  return `${base}/tx/${txHash}`;
}

export function explorerAddressUrl(
  chainId: number,
  address: string
): string | null {
  const base = EXPLORER_BASE[chainId];
  if (!base) return null;
  return `${base}/address/${address}`;
}

/**
 * Convert a post ID (`{sender}:{timestamp}`) into the comment-permalink form
 * used by the web's `?commentId=` query parameter (`{sender}-{timestamp}`).
 *
 * The two formats are intentionally documented separately because the website
 * scrolls to the DOM id `comment-{sender}-{timestamp}` and matches against the
 * raw query value (see CommentThread.tsx in the Net repo).
 */
export function postIdToCommentParam(postId: string): string {
  const colon = postId.indexOf(":");
  if (colon === -1) return postId;
  return `${postId.slice(0, colon)}-${postId.slice(colon + 1)}`;
}

export interface PostPermalinkOptions {
  /**
   * Global message index from the contract's MessageSent event. Most reliable
   * when available — works regardless of how the post was queried.
   */
  globalIndex?: number;
  /** Topic-filtered absolute index (from a topic-scoped read). */
  topic?: string;
  topicIndex?: number;
  /** Maker-filtered absolute index (from a sender-scoped read). */
  user?: string;
  userIndex?: number;
  /**
   * Optional comment to deep-link. Pass either a post-ID-style string
   * (`{sender}:{timestamp}` — colon will be normalized to hyphen) or the
   * already-converted form.
   */
  commentId?: string;
}

/**
 * Build a permalink to the dedicated post page. Picks the most reliable URL
 * form available, in priority order: global -> topic -> user. Returns null
 * when no usable index is provided or chain is unknown.
 */
export function postPermalink(
  chainId: number,
  opts: PostPermalinkOptions
): string | null {
  const slug = chainSlug(chainId);
  if (!slug) return null;

  const params = new URLSearchParams();

  if (opts.globalIndex != null) {
    params.set("index", String(opts.globalIndex));
  } else if (opts.topic != null && opts.topicIndex != null) {
    params.set("topic", stripFeedPrefix(opts.topic));
    params.set("index", String(opts.topicIndex));
  } else if (opts.user != null && opts.userIndex != null) {
    params.set("user", opts.user.toLowerCase());
    params.set("index", String(opts.userIndex));
  } else {
    return null;
  }

  if (opts.commentId) {
    params.set("commentId", postIdToCommentParam(opts.commentId));
  }

  return `${WEBSITE_BASE}/app/feed/${slug}/post?${params.toString()}`;
}

/**
 * URL of the canonical hosted skill (proxies to net-public/SKILL.md).
 */
export const HOSTED_SKILL_URL = `${WEBSITE_BASE}/skill.md`;
