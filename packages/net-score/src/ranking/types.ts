import type { Address } from "viem";

/**
 * How to rank tokens by upvote activity.
 *
 * - `hot` (alias: `trending`): time-decayed score, recent upvotes weighted higher
 * - `recent`: latest upvote timestamp
 * - `top`: aggregate upvote count (via UpvoteApp.getUpvotesWithLegacy)
 */
export type RankingSort = "hot" | "trending" | "recent" | "top";

export interface RankedToken {
  address: Address;
  name?: string;
  symbol?: string;
  decimals?: number;
  /** Fully Diluted Valuation in USDC, when price + supply are available */
  fdv?: number;
  /** Token price in USDC, derived from the best token/WETH pool and WETH/USDC */
  priceInUsdc?: number;
  /** Aggregate upvote count from UpvoteApp.getUpvotesWithLegacy across all strategies */
  upvotes: number;
  /** Unix timestamp (seconds) of the most recent upvote event seen in the scan window */
  latestUpvoteTimestamp: number;
}

export interface GetTokenRankingsOptions {
  chainId: number;
  /**
   * Maximum number of tokens to return. The function fetches and ranks more
   * tokens than this internally to account for filtering. Default: 50 (matches
   * the website's /token/<chain>/trending page).
   */
  maxTokens?: number;
  /** Default: "hot" */
  sort?: RankingSort;
  /**
   * Number of recent messages to scan per contract (legacy + 3 strategies).
   * Larger = more historical coverage, more RPC cost. Default: 150.
   */
  messageScanWindow?: number;
  /**
   * Two-tier filtering thresholds, copied from the website defaults. Tokens
   * that meet at least one of these qualify for the top slots; others fill
   * remaining slots up to `maxTokens`.
   */
  thresholds?: {
    /** Minimum aggregate upvotes to qualify for the top slots. Default: 500 */
    minUpvotes?: number;
    /** Minimum FDV (USDC) to qualify for the top slots. Default: 40_000 */
    minMarketCap?: number;
    /**
     * Tokens below `minMarketCap` are dropped entirely if they have no
     * upvotes within this many hours. Default: 48
     */
    recencyHours?: number;
  };
  /** Optional RPC URL override. If omitted, uses the package's defaults for the chain. */
  rpcUrl?: string | string[];
}
