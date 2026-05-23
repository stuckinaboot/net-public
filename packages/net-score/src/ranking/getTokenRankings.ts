import { decodeAbiParameters, type Address, type PublicClient } from "viem";
import { readContract } from "viem/actions";
import { NetClient, getPublicClient } from "@net-protocol/core";
import { StorageClient, type BulkStorageKey } from "@net-protocol/storage";
import {
  SCORE_CONTRACT,
  UPVOTE_APP,
  LEGACY_UPVOTE_V1_ADDRESS,
  ALL_STRATEGY_ADDRESSES,
  PURE_ALPHA_STRATEGY,
  UNIV234_POOLS_STRATEGY,
  DYNAMIC_SPLIT_STRATEGY,
  ERC20_BULK_INFO_HELPER_CONTRACT,
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
const DEFAULT_MAX_TOKENS = 6;
const DEFAULT_MIN_UPVOTES = 500;
const DEFAULT_MIN_MARKET_CAP = 40_000;
const DEFAULT_RECENCY_HOURS = 48;
const USDC_ADDRESS_BASE: Address = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_ADDRESS_BY_CHAIN: Record<number, Address> = {
  8453: USDC_ADDRESS_BASE,
};

interface TokenInfo {
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
  const minUpvotes = options.thresholds?.minUpvotes ?? DEFAULT_MIN_UPVOTES;
  const minMarketCap =
    options.thresholds?.minMarketCap ?? DEFAULT_MIN_MARKET_CAP;
  const recencyHours = options.thresholds?.recencyHours ?? DEFAULT_RECENCY_HOURS;

  const rpcOverride = rpcUrl
    ? { rpcUrls: Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl] }
    : undefined;
  const publicClient = getPublicClient({ chainId, rpcUrl });
  const netClient = new NetClient({ chainId, overrides: rpcOverride });
  const storageClient = new StorageClient({ chainId, overrides: rpcOverride });

  // --- Steps 1-2: enumerate recent upvote messages for legacy + 3 strategies
  const messageGroups = await fetchUpvoteMessages({
    netClient,
    messageScanWindow,
  });

  // --- Steps 3-4: bulk-read storage blobs referenced by strategy messages
  const storageBlobByKey = await fetchStrategyStorage({
    storageClient,
    messageGroups,
  });

  // --- Step 5: aggregate per-token events, score, take top N+slack
  const { tokenAddresses, latestUpvoteTimestamps } = aggregateAndRank({
    messageGroups,
    storageBlobByKey,
    sort,
    maxTokens,
  });

  if (tokenAddresses.length === 0) return [];

  // --- Steps 6-8: ERC20 info, pool prices, aggregate upvotes (parallel)
  const wethAddress = getWethAddress(chainId);
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
  });
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
  storageClient,
  messageGroups,
}: {
  storageClient: StorageClient;
  messageGroups: MessageGroups;
}): Promise<Map<string, `0x${string}`>> {
  const keys: BulkStorageKey[] = [];
  for (const msg of [
    ...messageGroups.strategy1,
    ...messageGroups.strategy2,
    ...messageGroups.strategy3,
  ]) {
    if (msg.data && msg.data.startsWith("0x")) {
      keys.push({ key: msg.data, operator: SCORE_CONTRACT.address });
    }
  }

  if (keys.length === 0) return new Map();

  const results = await storageClient.bulkGet({ keys });
  const map = new Map<string, `0x${string}`>();
  results.forEach((item, idx) => {
    if (item && item.value) {
      map.set(keys[idx].key, item.value as `0x${string}`);
    }
  });
  return map;
}

// ============================================================================
// Step 5: aggregate + score
// ============================================================================

function aggregateAndRank({
  messageGroups,
  storageBlobByKey,
  sort,
  maxTokens,
}: {
  messageGroups: MessageGroups;
  storageBlobByKey: Map<string, `0x${string}`>;
  sort: RankingSort;
  maxTokens: number;
}): { tokenAddresses: Address[]; latestUpvoteTimestamps: Map<string, number> } {
  const tokenUpvoteEvents = new Map<string, UpvoteEvent[]>();

  const addEvent = (tokenAddress: string, timestamp: number, count: number) => {
    const lower = tokenAddress.toLowerCase();
    if (!lower || lower === NULL_ADDRESS) return;
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

  const nowSec = Date.now() / 1000;
  const timeWeight = (ts: number) => Math.exp(-0.1 * ((nowSec - ts) / 3600));

  const latestUpvoteTimestamps = new Map<string, number>();
  for (const [addr, events] of tokenUpvoteEvents) {
    latestUpvoteTimestamps.set(addr, Math.max(...events.map((e) => e.timestamp)));
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
  const data = (await readContract(publicClient, {
    address: ERC20_BULK_INFO_HELPER_CONTRACT.address,
    abi: ERC20_BULK_INFO_HELPER_CONTRACT.abi,
    functionName: "getTokenInfo",
    args: [addresses],
  })) as TokenInfo[];
  return Array.isArray(data) ? data : [];
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
  return Array.isArray(data) ? data.map(Number) : [];
}

// ============================================================================
// Step 9: compose, filter, sort, slice
// ============================================================================

function composeAndFilter({
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
    ethPriceInUsdc = wethUsdcPool?.price
      ? wethUsdcPool.price
      : usdcWethPool?.price
        ? 1 / usdcWethPool.price
        : undefined;
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
    const priceInUsdc =
      pool?.price != null && ethPriceInUsdc != null
        ? pool.price * ethPriceInUsdc
        : undefined;
    const circulating = info?.totalSupply
      ? BigInt(info.totalSupply) - BigInt(info.burnedTokens ?? 0n)
      : undefined;
    const fdv =
      circulating != null && info?.decimals != null && priceInUsdc != null
        ? (Number(circulating) / 10 ** Number(info.decimals)) * priceInUsdc
        : undefined;

    return {
      address,
      name: info?.name || undefined,
      symbol: info?.symbol || undefined,
      decimals: info?.decimals != null ? Number(info.decimals) : undefined,
      fdv,
      priceInUsdc,
      upvotes: upvoteCounts[i] ?? 0,
      latestUpvoteTimestamp:
        latestUpvoteTimestamps.get(address.toLowerCase()) ?? 0,
    };
  });

  // Drop tokens with missing metadata, or stale tokens below the market cap floor.
  const nowSec = Date.now() / 1000;
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
