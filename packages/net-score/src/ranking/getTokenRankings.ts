import { decodeAbiParameters, type Address, type PublicClient } from "viem";
import { readContract } from "viem/actions";
import { NetClient, getPublicClient } from "@net-protocol/core";
import { STORAGE_CONTRACT } from "@net-protocol/storage";
import {
  SCORE_CONTRACT,
  UPVOTE_APP,
  LEGACY_UPVOTE_V1_ADDRESS,
  ALL_STRATEGY_ADDRESSES,
  PURE_ALPHA_STRATEGY,
  UNIV234_POOLS_STRATEGY,
  DYNAMIC_SPLIT_STRATEGY,
  ERC20_BULK_INFO_HELPER_CONTRACT,
  SUPPORTED_SCORE_CHAINS,
  NULL_ADDRESS,
  getWethAddress,
} from "../constants";
import {
  encodeUpvoteKey,
  decodeUpvoteStorageBlob,
} from "../utils/strategyUtils";
import { extractTokenAddressFromScoreKey } from "../utils/scoreKeyUtils";
import { discoverPools } from "../utils/poolDiscovery";
import type {
  GetTokenRankingsOptions,
  RankedToken,
  RankingSort,
} from "./types";

const DEFAULT_MESSAGE_SCAN_WINDOW = 150;
const DEFAULT_MAX_TOKENS = 50;
const DEFAULT_MIN_UPVOTES = 500;
const DEFAULT_MIN_MARKET_CAP = 40_000;
const DEFAULT_RECENCY_HOURS = 48;
const USDC_ADDRESS_BY_CHAIN: Record<number, Address> = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  burnedTokens: bigint;
}

interface UpvoteEvent {
  timestamp: number;
  count: number;
}

/**
 * Compute a token leaderboard ranked by upvote activity, mirroring the
 * /token/<chain>/trending page on netprotocol.app.
 *
 * Reads recent Net Protocol upvote messages for the legacy upvote contract
 * and the three strategy contracts, aggregates them into per-token events,
 * scores them by the chosen sort, then enriches the top results with ERC20
 * metadata, Uniswap pool pricing, and aggregate upvote counts.
 *
 * All reads are live from chain — no off-chain index. Callers should cache
 * results (e.g. HTTP `Cache-Control`) since each call performs ~8 RPC reads.
 *
 * Currently supports only chains in SUPPORTED_SCORE_CHAINS (Base mainnet).
 * Throws synchronously for any other chain.
 */
export async function getTokenRankings(
  options: GetTokenRankingsOptions
): Promise<RankedToken[]> {
  const {
    chainId,
    sort = "hot",
    maxTokens = DEFAULT_MAX_TOKENS,
    messageScanWindow = DEFAULT_MESSAGE_SCAN_WINDOW,
    rpcUrl,
  } = options;
  validateChainSupported(chainId);

  const minUpvotes = options.thresholds?.minUpvotes ?? DEFAULT_MIN_UPVOTES;
  const minMarketCap =
    options.thresholds?.minMarketCap ?? DEFAULT_MIN_MARKET_CAP;
  const recencyHours = options.thresholds?.recencyHours ?? DEFAULT_RECENCY_HOURS;
  const nowSec = Date.now() / 1000;

  const rpcOverride = rpcUrl
    ? { rpcUrls: Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl] }
    : undefined;
  const publicClient = getPublicClient({ chainId, rpcUrl });
  const netClient = new NetClient({ chainId, overrides: rpcOverride });

  // --- Steps 1-2: enumerate recent upvote messages for legacy + 3 strategies
  const messageGroups = await fetchUpvoteMessages({
    netClient,
    messageScanWindow,
  });

  // --- Steps 3-4: bulk-read storage blobs referenced by strategy messages
  const storageBlobByKey = await fetchStrategyStorage({
    publicClient,
    messageGroups,
  });

  // --- Step 5: aggregate per-token events, score, take top N+slack
  const wethAddress = getWethAddress(chainId);
  const { tokenAddresses, latestUpvoteTimestamps } = aggregateAndRank({
    messageGroups,
    storageBlobByKey,
    sort,
    maxTokens,
    excludeAddresses: [wethAddress.toLowerCase()],
    nowSec,
  });

  if (tokenAddresses.length === 0) return [];

  // --- Steps 6-8: ERC20 info, pool prices, aggregate upvotes (parallel)
  const usdcAddress = USDC_ADDRESS_BY_CHAIN[chainId];
  const pairs = [
    ...tokenAddresses.map((tokenAddress) => ({
      tokenAddress,
      baseTokenAddress: wethAddress,
    })),
    ...(usdcAddress
      ? [{ tokenAddress: wethAddress, baseTokenAddress: usdcAddress }]
      : []),
  ];
  const [tokenInfos, pools, upvoteCounts] = await Promise.all([
    fetchBulkErc20Info({ publicClient, addresses: tokenAddresses }),
    discoverPools({ publicClient, pairs, chainId }),
    fetchAggregateUpvotes({ publicClient, tokenAddresses }),
  ]);

  if (tokenInfos.length !== tokenAddresses.length) {
    throw new Error(
      `ERC20 bulk info returned ${tokenInfos.length} entries for ${tokenAddresses.length} addresses`
    );
  }
  if (upvoteCounts.length !== tokenAddresses.length) {
    throw new Error(
      `getUpvotesWithLegacy returned ${upvoteCounts.length} entries for ${tokenAddresses.length} addresses`
    );
  }

  // --- Step 9: compose, filter, sort, slice
  return composeAndFilter({
    tokenAddresses,
    tokenInfos,
    pools,
    upvoteCounts,
    latestUpvoteTimestamps,
    wethAddress,
    usdcAddress,
    sort,
    maxTokens,
    minUpvotes,
    minMarketCap,
    recencyHours,
    nowSec,
  });
}

function validateChainSupported(chainId: number): void {
  if (!(SUPPORTED_SCORE_CHAINS as readonly number[]).includes(chainId)) {
    throw new Error(
      `getTokenRankings: chainId ${chainId} is not supported. ` +
        `Supported chains: ${SUPPORTED_SCORE_CHAINS.join(", ")}`
    );
  }
}

// ============================================================================
// Step 1-2: message fetch
// ============================================================================

type MessageGroups = {
  legacy: Awaited<ReturnType<NetClient["getMessagesBatch"]>>;
  strategy1: Awaited<ReturnType<NetClient["getMessagesBatch"]>>;
  strategy2: Awaited<ReturnType<NetClient["getMessagesBatch"]>>;
  strategy3: Awaited<ReturnType<NetClient["getMessagesBatch"]>>;
};

async function fetchUpvoteMessages({
  netClient,
  messageScanWindow,
}: {
  netClient: NetClient;
  messageScanWindow: number;
}): Promise<MessageGroups> {
  const legacyFilter = {
    appAddress: LEGACY_UPVOTE_V1_ADDRESS,
    topic: "t",
  };
  const strategyFilters = [
    UNIV234_POOLS_STRATEGY.address,
    PURE_ALPHA_STRATEGY.address,
    DYNAMIC_SPLIT_STRATEGY.address,
  ].map((stratAddr) => ({
    appAddress: SCORE_CONTRACT.address,
    topic: `t${stratAddr.toLowerCase()}`,
  }));

  const [legacyCount, ...strategyCounts] = await Promise.all([
    netClient.getMessageCount({ filter: legacyFilter }),
    ...strategyFilters.map((filter) => netClient.getMessageCount({ filter })),
  ]);

  // TOCTOU note: the count read above can be stale by the time the batch read
  // below runs. New messages landing in between are excluded from the window.
  // We accept this for simplicity; the alternative is overshoot+dedupe.
  const sliceRange = (count: number) => ({
    startIndex: Math.max(0, count - messageScanWindow),
    endIndex: count,
  });

  const [legacy, strategy1, strategy2, strategy3] = await Promise.all([
    legacyCount > 0
      ? netClient.getMessagesBatch({
          filter: legacyFilter,
          ...sliceRange(legacyCount),
        })
      : Promise.resolve([]),
    ...strategyFilters.map((filter, i) =>
      strategyCounts[i] > 0
        ? netClient.getMessagesBatch({
            filter,
            ...sliceRange(strategyCounts[i]),
          })
        : Promise.resolve([])
    ),
  ]);

  return { legacy, strategy1, strategy2, strategy3 };
}

// ============================================================================
// Step 3-4: strategy storage bulk read
// ============================================================================

async function fetchStrategyStorage({
  publicClient,
  messageGroups,
}: {
  publicClient: PublicClient;
  messageGroups: MessageGroups;
}): Promise<Map<string, `0x${string}`>> {
  // Dedup so the multicall payload grows with unique slots, not message count.
  const seen = new Set<string>();
  const keys: { key: `0x${string}`; operator: Address }[] = [];
  for (const msg of [
    ...messageGroups.strategy1,
    ...messageGroups.strategy2,
    ...messageGroups.strategy3,
  ]) {
    if (!msg.data || !msg.data.startsWith("0x")) continue;
    const key = msg.data as `0x${string}`;
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push({ key, operator: SCORE_CONTRACT.address });
  }

  if (keys.length === 0) return new Map();

  // Direct readContract instead of StorageClient.bulkGet, which swallows
  // errors. We want RPC failures to surface, not silently produce empty
  // rankings.
  const results = (await readContract(publicClient, {
    address: STORAGE_CONTRACT.address,
    abi: STORAGE_CONTRACT.abi,
    functionName: "bulkGet",
    args: [keys],
  })) as Array<readonly [string, `0x${string}`]>;

  const map = new Map<string, `0x${string}`>();
  results.forEach((item, idx) => {
    const value = item?.[1];
    if (value && value !== "0x") {
      map.set(keys[idx].key, value);
    }
  });
  return map;
}

// ============================================================================
// Step 5: aggregate + score (PURE, exported for tests)
// ============================================================================

export function aggregateAndRank({
  messageGroups,
  storageBlobByKey,
  sort,
  maxTokens,
  excludeAddresses = [],
  nowSec,
}: {
  messageGroups: MessageGroups;
  storageBlobByKey: Map<string, `0x${string}`>;
  sort: RankingSort;
  maxTokens: number;
  excludeAddresses?: string[];
  nowSec: number;
}): { tokenAddresses: Address[]; latestUpvoteTimestamps: Map<string, number> } {
  const tokenUpvoteEvents = new Map<string, UpvoteEvent[]>();
  const excludeSet = new Set(excludeAddresses.map((a) => a.toLowerCase()));

  const addEvent = (tokenAddress: string, timestamp: number, count: number) => {
    if (!ADDRESS_RE.test(tokenAddress)) return;
    const lower = tokenAddress.toLowerCase();
    if (lower === NULL_ADDRESS || excludeSet.has(lower)) return;
    if (!Number.isFinite(timestamp) || !Number.isFinite(count)) return;
    const events = tokenUpvoteEvents.get(lower) ?? [];
    events.push({ timestamp, count });
    tokenUpvoteEvents.set(lower, events);
  };

  for (const msg of messageGroups.legacy) {
    if (msg.topic !== "t" || !msg.text) continue;
    let count = 1;
    if (msg.data && msg.data.startsWith("0x")) {
      try {
        const [votes] = decodeAbiParameters(
          [{ type: "uint256" }],
          msg.data as `0x${string}`
        );
        count = Number(votes);
      } catch {
        count = 1;
      }
    }
    addEvent(msg.text, Number(msg.timestamp), count);
  }

  for (const msg of [
    ...messageGroups.strategy1,
    ...messageGroups.strategy2,
    ...messageGroups.strategy3,
  ]) {
    if (!msg.topic.startsWith("t") || !msg.data || !msg.data.startsWith("0x")) {
      continue;
    }
    const blob = storageBlobByKey.get(msg.data);
    if (!blob) continue;
    const decoded = decodeUpvoteStorageBlob(blob);
    if (!decoded || !decoded.scoreKey) continue;
    const tokenAddress = extractTokenAddressFromScoreKey(decoded.scoreKey);
    if (!tokenAddress) continue;
    addEvent(tokenAddress, Number(msg.timestamp), decoded.scoreDelta);
  }

  const timeWeight = (ts: number) => Math.exp(-0.1 * ((nowSec - ts) / 3600));

  const latestUpvoteTimestamps = new Map<string, number>();
  for (const [addr, events] of tokenUpvoteEvents) {
    let latest = events[0].timestamp;
    for (const e of events) if (e.timestamp > latest) latest = e.timestamp;
    latestUpvoteTimestamps.set(addr, latest);
  }

  let ordered: string[];
  if (sort === "top") {
    // For "top", we don't know aggregate counts yet — defer to step 9.
    ordered = Array.from(tokenUpvoteEvents.keys());
  } else {
    const scores = new Map<string, number>();
    for (const [addr, events] of tokenUpvoteEvents) {
      if (sort === "recent") {
        scores.set(addr, latestUpvoteTimestamps.get(addr) ?? 0);
      } else {
        // "hot" / "trending"
        const score = events.reduce(
          (total, e) => total + e.count * timeWeight(e.timestamp),
          0
        );
        scores.set(addr, score);
      }
    }
    ordered = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([address]) => address);
  }

  // Fetch more than needed so the threshold filter has slack to work with.
  const fetchLimit = Math.max(maxTokens * 3, 30);
  return {
    tokenAddresses: ordered.slice(0, fetchLimit) as Address[],
    latestUpvoteTimestamps,
  };
}

// ============================================================================
// Step 6: ERC20 bulk info
// ============================================================================

async function fetchBulkErc20Info({
  publicClient,
  addresses,
}: {
  publicClient: PublicClient;
  addresses: Address[];
}): Promise<TokenInfo[]> {
  if (addresses.length === 0) return [];
  try {
    const data = (await readContract(publicClient, {
      address: ERC20_BULK_INFO_HELPER_CONTRACT.address,
      abi: ERC20_BULK_INFO_HELPER_CONTRACT.abi,
      functionName: "getTokenInfo",
      args: [addresses],
    })) as TokenInfo[];
    if (Array.isArray(data) && data.length === addresses.length) return data;
  } catch {
    // Bulk reverted (likely one bad address). Fall through to per-address.
  }
  // Per-address fallback so one bad address doesn't kill the whole ranking.
  const results = await Promise.all(
    addresses.map(async (addr): Promise<TokenInfo> => {
      try {
        const data = (await readContract(publicClient, {
          address: ERC20_BULK_INFO_HELPER_CONTRACT.address,
          abi: ERC20_BULK_INFO_HELPER_CONTRACT.abi,
          functionName: "getTokenInfo",
          args: [[addr]],
        })) as TokenInfo[];
        if (Array.isArray(data) && data[0]) return data[0];
      } catch {
        // swallow per-address failure
      }
      return {
        name: "",
        symbol: "",
        decimals: 0,
        totalSupply: 0n,
        burnedTokens: 0n,
      };
    })
  );
  return results;
}

// ============================================================================
// Step 8: aggregate upvotes
// ============================================================================

async function fetchAggregateUpvotes({
  publicClient,
  tokenAddresses,
}: {
  publicClient: PublicClient;
  tokenAddresses: Address[];
}): Promise<number[]> {
  if (tokenAddresses.length === 0) return [];
  const data = (await readContract(publicClient, {
    address: UPVOTE_APP.address,
    abi: UPVOTE_APP.abi,
    functionName: "getUpvotesWithLegacy",
    args: [
      tokenAddresses.map((addr) => encodeUpvoteKey(addr)),
      ALL_STRATEGY_ADDRESSES,
    ],
  })) as readonly bigint[];
  if (!Array.isArray(data)) {
    throw new Error(
      "getUpvotesWithLegacy returned non-array; contract or RPC misbehaving"
    );
  }
  return data.map(Number);
}

// ============================================================================
// Step 9: compose, filter, sort, slice (PURE, exported for tests)
// ============================================================================

export function composeAndFilter({
  tokenAddresses,
  tokenInfos,
  pools,
  upvoteCounts,
  latestUpvoteTimestamps,
  wethAddress,
  usdcAddress,
  sort,
  maxTokens,
  minUpvotes,
  minMarketCap,
  recencyHours,
  nowSec,
}: {
  tokenAddresses: Address[];
  tokenInfos: TokenInfo[];
  pools: Awaited<ReturnType<typeof discoverPools>>;
  upvoteCounts: number[];
  latestUpvoteTimestamps: Map<string, number>;
  wethAddress: Address;
  usdcAddress: Address | undefined;
  sort: RankingSort;
  maxTokens: number;
  minUpvotes: number;
  minMarketCap: number;
  recencyHours: number;
  nowSec: number;
}): RankedToken[] {
  const wethLower = wethAddress.toLowerCase();
  const usdcLower = usdcAddress?.toLowerCase();

  // ETH price in USDC. Pool discovery dedupes by on-chain pool address; if USDC
  // happens to be in the ranked set, the explicit WETH/USDC anchor may collide
  // with USDC's own USDC/WETH pool. Try both orientations.
  let ethPriceInUsdc: number | undefined;
  if (usdcLower) {
    const wethUsdcPool = pools.find(
      (p) =>
        p.tokenAddress.toLowerCase() === wethLower &&
        p.baseTokenAddress.toLowerCase() === usdcLower
    );
    const usdcWethPool = pools.find(
      (p) =>
        p.tokenAddress.toLowerCase() === usdcLower &&
        p.baseTokenAddress.toLowerCase() === wethLower
    );
    // Match website behavior: treat price == 0 as missing (truthy check), and
    // guard against 1/0 = Infinity in the fallback path.
    if (wethUsdcPool?.price) {
      ethPriceInUsdc = wethUsdcPool.price;
    } else if (usdcWethPool?.price) {
      ethPriceInUsdc = 1 / usdcWethPool.price;
    }
  }

  const tokenAddressToPool = new Map<string, (typeof pools)[number]>();
  for (const pool of pools) {
    if (pool.baseTokenAddress.toLowerCase() === wethLower) {
      tokenAddressToPool.set(pool.tokenAddress.toLowerCase(), pool);
    }
  }

  const composed: RankedToken[] = tokenAddresses.map((address, i) => {
    const info = tokenInfos[i];
    const pool = tokenAddressToPool.get(address.toLowerCase());
    // Truthy check on price matches the website; treats 0 as 'no price'.
    const priceInUsdc =
      pool?.price && ethPriceInUsdc ? pool.price * ethPriceInUsdc : undefined;
    // Truthy check on totalSupply matches the website; 0n is treated as 'no
    // supply data'. Clamp at 0 in case burned > total (buggy/reflection tokens).
    let circulating: bigint | undefined;
    if (info?.totalSupply) {
      const burned = info.burnedTokens ?? 0n;
      const c = info.totalSupply - burned;
      circulating = c > 0n ? c : 0n;
    }
    // Match website: decimals 0 is treated as 'no decimals known' (rare ERC20
    // case that produces wildly inflated FDV otherwise).
    const decimals = info?.decimals || undefined;
    const fdv =
      circulating != null && decimals != null && priceInUsdc != null
        ? (Number(circulating) / 10 ** decimals) * priceInUsdc
        : undefined;

    return {
      address,
      name: info?.name || undefined,
      symbol: info?.symbol || undefined,
      decimals,
      fdv,
      priceInUsdc,
      upvotes: upvoteCounts[i] ?? 0,
      latestUpvoteTimestamp:
        latestUpvoteTimestamps.get(address.toLowerCase()) ?? 0,
    };
  });

  // Drop tokens with missing metadata, or stale tokens below the market cap floor.
  const valid = composed.filter((t) => {
    if (!t.name?.trim() || !t.symbol?.trim()) return false;
    const belowFloor = t.fdv == null || t.fdv < minMarketCap;
    if (belowFloor) {
      const hoursSince = (nowSec - t.latestUpvoteTimestamp) / 3600;
      if (hoursSince > recencyHours) return false;
    }
    return true;
  });

  // Re-sort per requested order.
  let sorted: RankedToken[];
  if (sort === "top") {
    sorted = [...valid].sort((a, b) => b.upvotes - a.upvotes);
  } else {
    // Preserve the order returned by step 5 (already scored by hot/recent).
    const byAddr = new Map(valid.map((t) => [t.address.toLowerCase(), t]));
    sorted = tokenAddresses
      .map((addr) => byAddr.get(addr.toLowerCase()))
      .filter((t): t is RankedToken => t != null);
  }

  // Two-tier: tokens meeting the upvote/cap floor get top billing.
  const qualifies = (t: RankedToken) =>
    t.upvotes >= minUpvotes || (t.fdv != null && t.fdv >= minMarketCap);
  const top = sorted.filter(qualifies);
  const rest = sorted.filter((t) => !qualifies(t));
  return [...top, ...rest].slice(0, maxTokens);
}
