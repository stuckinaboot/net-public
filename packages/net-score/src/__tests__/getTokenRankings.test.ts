import { describe, it, expect } from "vitest";
import { encodeAbiParameters, type Address } from "viem";
import {
  aggregateAndRank,
  buildStorageMapFromBulkGetResults,
  composeAndFilter,
  getTokenRankings,
  type BulkGetResult,
  type TokenInfo,
} from "../ranking/getTokenRankings";
import type {
  GetTokenRankingsOptions,
  RankedToken,
  RankingSort,
} from "../ranking/types";

type Msg = {
  topic: string;
  text: string;
  data: `0x${string}`;
  timestamp: bigint;
  app: `0x${string}`;
  sender: `0x${string}`;
};

const ZERO: `0x${string}` = "0x0000000000000000000000000000000000000000";
const TOKEN_A: Address = "0x1111111111111111111111111111111111111111";
const TOKEN_B: Address = "0x2222222222222222222222222222222222222222";
const TOKEN_C: Address = "0x3333333333333333333333333333333333333333";
const WETH: Address = "0x4200000000000000000000000000000000000006";
const USDC: Address = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

function legacyMsg(token: string, votes: number, timestamp: number): Msg {
  return {
    topic: "t",
    text: token,
    data: encodeAbiParameters([{ type: "uint256" }], [BigInt(votes)]),
    timestamp: BigInt(timestamp),
    app: ZERO,
    sender: ZERO,
  };
}

const NOW = 1_700_000_000;

describe("getTokenRankings: public surface", () => {
  it("exports the function and types", () => {
    expect(typeof getTokenRankings).toBe("function");
  });

  it("accepts the documented options shape", () => {
    const options: GetTokenRankingsOptions = {
      chainId: 8453,
      sort: "hot",
      maxTokens: 10,
      messageScanWindow: 200,
      thresholds: { minUpvotes: 100, minMarketCap: 10_000, recencyHours: 24 },
      rpcUrl: "https://example.com",
    };
    expect(options.chainId).toBe(8453);
  });

  it("rejects unsupported chains synchronously without RPC work", async () => {
    await expect(getTokenRankings({ chainId: 1 })).rejects.toThrow(
      /not supported/i
    );
  });

  it("RankingSort accepts hot/trending/recent/top", () => {
    const sorts: RankingSort[] = ["hot", "trending", "recent", "top"];
    expect(sorts).toHaveLength(4);
  });
});

describe("aggregateAndRank", () => {
  const emptyStrategies = { strategy1: [], strategy2: [], strategy3: [] };

  it("sorts 'top' by raw key set, deferring real count to step 9", () => {
    const messageGroups = {
      legacy: [
        legacyMsg(TOKEN_A, 10, NOW - 100),
        legacyMsg(TOKEN_B, 5, NOW - 50),
      ],
      ...emptyStrategies,
    };
    const result = aggregateAndRank({
      messageGroups,
      storageBlobByKey: new Map(),
      sort: "top",
      maxTokens: 10,
      nowSec: NOW,
    });
    expect(result.tokenAddresses.sort()).toEqual(
      [TOKEN_A.toLowerCase(), TOKEN_B.toLowerCase()].sort()
    );
  });

  it("sorts 'recent' by latest upvote timestamp", () => {
    const messageGroups = {
      legacy: [
        legacyMsg(TOKEN_A, 100, NOW - 1000),
        legacyMsg(TOKEN_B, 1, NOW - 10),
      ],
      ...emptyStrategies,
    };
    const result = aggregateAndRank({
      messageGroups,
      storageBlobByKey: new Map(),
      sort: "recent",
      maxTokens: 10,
      nowSec: NOW,
    });
    expect(result.tokenAddresses).toEqual([
      TOKEN_B.toLowerCase(),
      TOKEN_A.toLowerCase(),
    ]);
  });

  it("sorts 'hot' with time-decayed weighting (recent activity wins)", () => {
    const messageGroups = {
      // A has more total upvotes but old; B has fewer but recent.
      legacy: [
        legacyMsg(TOKEN_A, 100, NOW - 3600 * 50),
        legacyMsg(TOKEN_B, 5, NOW - 60),
      ],
      ...emptyStrategies,
    };
    const result = aggregateAndRank({
      messageGroups,
      storageBlobByKey: new Map(),
      sort: "hot",
      maxTokens: 10,
      nowSec: NOW,
    });
    expect(result.tokenAddresses[0]).toBe(TOKEN_B.toLowerCase());
  });

  it("rejects malformed token addresses in legacy text field", () => {
    const messageGroups = {
      legacy: [
        legacyMsg("hello not an address", 100, NOW),
        legacyMsg("0xfoo", 100, NOW),
        legacyMsg(TOKEN_A, 5, NOW),
      ],
      ...emptyStrategies,
    };
    const result = aggregateAndRank({
      messageGroups,
      storageBlobByKey: new Map(),
      sort: "top",
      maxTokens: 10,
      nowSec: NOW,
    });
    expect(result.tokenAddresses).toEqual([TOKEN_A.toLowerCase()]);
  });

  it("excludes zero address", () => {
    const messageGroups = {
      legacy: [legacyMsg(ZERO, 100, NOW), legacyMsg(TOKEN_A, 5, NOW)],
      ...emptyStrategies,
    };
    const result = aggregateAndRank({
      messageGroups,
      storageBlobByKey: new Map(),
      sort: "top",
      maxTokens: 10,
      nowSec: NOW,
    });
    expect(result.tokenAddresses).toEqual([TOKEN_A.toLowerCase()]);
  });

  it("excludes addresses passed via excludeAddresses (e.g. WETH self-pair)", () => {
    const messageGroups = {
      legacy: [legacyMsg(WETH, 100, NOW), legacyMsg(TOKEN_A, 5, NOW)],
      ...emptyStrategies,
    };
    const result = aggregateAndRank({
      messageGroups,
      storageBlobByKey: new Map(),
      sort: "top",
      maxTokens: 10,
      nowSec: NOW,
      excludeAddresses: [WETH.toLowerCase()],
    });
    expect(result.tokenAddresses).toEqual([TOKEN_A.toLowerCase()]);
  });

  it("emits lowercased addresses (consistent map keying)", () => {
    const mixedCase = "0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd";
    const messageGroups = {
      legacy: [legacyMsg(mixedCase, 1, NOW)],
      ...emptyStrategies,
    };
    const result = aggregateAndRank({
      messageGroups,
      storageBlobByKey: new Map(),
      sort: "top",
      maxTokens: 10,
      nowSec: NOW,
    });
    expect(result.tokenAddresses[0]).toBe(mixedCase.toLowerCase());
  });
});

describe("composeAndFilter", () => {
  function makeInfo(
    name: string,
    symbol: string,
    decimals: number,
    totalSupply: bigint,
    burnedTokens: bigint = 0n
  ): TokenInfo {
    return { name, symbol, decimals, totalSupply, burnedTokens };
  }

  const baseArgs = {
    pools: [] as Awaited<ReturnType<typeof import("../utils/poolDiscovery").discoverPools>>,
    wethAddress: WETH,
    usdcAddress: USDC,
    sort: "top" as RankingSort,
    maxTokens: 10,
    minUpvotes: 500,
    minMarketCap: 40_000,
    recencyHours: 48,
    nowSec: NOW,
  };

  it("returns only valid (non-empty name+symbol) tokens", () => {
    const result = composeAndFilter({
      ...baseArgs,
      tokenAddresses: [TOKEN_A, TOKEN_B] as Address[],
      tokenInfos: [
        makeInfo("Token A", "TKA", 18, 1_000_000n * 10n ** 18n),
        makeInfo("", "", 0, 0n),
      ],
      upvoteCounts: [600, 700],
      latestUpvoteTimestamps: new Map([
        [TOKEN_A.toLowerCase(), NOW],
        [TOKEN_B.toLowerCase(), NOW],
      ]),
    });
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe(TOKEN_A);
  });

  it("drops below-floor tokens that are also stale beyond recencyHours", () => {
    const result = composeAndFilter({
      ...baseArgs,
      tokenAddresses: [TOKEN_A] as Address[],
      tokenInfos: [makeInfo("Token A", "TKA", 18, 1_000_000n * 10n ** 18n)],
      // No price/pool → fdv undefined → belowFloor=true. No upvotes → upvotes=0.
      upvoteCounts: [0],
      latestUpvoteTimestamps: new Map([
        [TOKEN_A.toLowerCase(), NOW - 3600 * 100], // 100 hours ago > 48
      ]),
    });
    expect(result).toEqual([]);
  });

  it("keeps below-floor tokens if they have upvotes >= minUpvotes (qualifying tier)", () => {
    const result = composeAndFilter({
      ...baseArgs,
      tokenAddresses: [TOKEN_A] as Address[],
      tokenInfos: [makeInfo("Token A", "TKA", 18, 1_000_000n * 10n ** 18n)],
      upvoteCounts: [1_000_000], // way above 500 floor
      latestUpvoteTimestamps: new Map([[TOKEN_A.toLowerCase(), NOW]]),
    });
    expect(result).toHaveLength(1);
    expect(result[0].upvotes).toBe(1_000_000);
  });

  it("places qualifying tokens before non-qualifying", () => {
    const result = composeAndFilter({
      ...baseArgs,
      tokenAddresses: [TOKEN_A, TOKEN_B] as Address[],
      tokenInfos: [
        makeInfo("A", "A", 18, 1n * 10n ** 18n),
        makeInfo("B", "B", 18, 1n * 10n ** 18n),
      ],
      upvoteCounts: [10, 1000], // B qualifies, A does not
      latestUpvoteTimestamps: new Map([
        [TOKEN_A.toLowerCase(), NOW],
        [TOKEN_B.toLowerCase(), NOW],
      ]),
      sort: "top",
    });
    expect(result.map((t) => t.address)).toEqual([TOKEN_B, TOKEN_A]);
  });

  it("returns decimals=undefined for decimals=0 tokens (matches website)", () => {
    const result = composeAndFilter({
      ...baseArgs,
      tokenAddresses: [TOKEN_A] as Address[],
      tokenInfos: [makeInfo("A", "A", 0, 1_000n)],
      upvoteCounts: [1000],
      latestUpvoteTimestamps: new Map([[TOKEN_A.toLowerCase(), NOW]]),
    });
    expect(result[0].decimals).toBeUndefined();
    expect(result[0].fdv).toBeUndefined();
  });

  it("clamps negative circulating (burned > total) so fdv stays sensible", () => {
    const pools = [
      {
        tokenAddress: TOKEN_A,
        baseTokenAddress: WETH,
        poolAddress: ZERO,
        price: 0.0001,
        fee: 3000,
        liquidity: "0",
        balances: { baseTokenBalance: "0", token0Balance: "0", token1Balance: "0" },
      },
      {
        tokenAddress: WETH,
        baseTokenAddress: USDC,
        poolAddress: ZERO,
        price: 3000,
        fee: 500,
        liquidity: "0",
        balances: { baseTokenBalance: "0", token0Balance: "0", token1Balance: "0" },
      },
    ] as Awaited<ReturnType<typeof import("../utils/poolDiscovery").discoverPools>>;
    const result = composeAndFilter({
      ...baseArgs,
      pools,
      tokenAddresses: [TOKEN_A] as Address[],
      tokenInfos: [makeInfo("A", "A", 18, 100n, 200n)], // burned > total
      upvoteCounts: [1000],
      latestUpvoteTimestamps: new Map([[TOKEN_A.toLowerCase(), NOW]]),
    });
    expect(result[0].fdv).toBe(0); // clamped from negative
  });

  it("derives ethPriceInUsdc from WETH/USDC pool", () => {
    const pools = [
      {
        tokenAddress: TOKEN_A,
        baseTokenAddress: WETH,
        poolAddress: ZERO,
        price: 0.0001,
        fee: 3000,
        liquidity: "0",
        balances: { baseTokenBalance: "0", token0Balance: "0", token1Balance: "0" },
      },
      {
        tokenAddress: WETH,
        baseTokenAddress: USDC,
        poolAddress: ZERO,
        price: 3000,
        fee: 500,
        liquidity: "0",
        balances: { baseTokenBalance: "0", token0Balance: "0", token1Balance: "0" },
      },
    ] as Awaited<ReturnType<typeof import("../utils/poolDiscovery").discoverPools>>;
    const result = composeAndFilter({
      ...baseArgs,
      pools,
      tokenAddresses: [TOKEN_A] as Address[],
      tokenInfos: [makeInfo("A", "A", 18, 1_000_000n * 10n ** 18n)],
      upvoteCounts: [1000],
      latestUpvoteTimestamps: new Map([[TOKEN_A.toLowerCase(), NOW]]),
    });
    // priceInUsdc = 0.0001 * 3000 = 0.3
    expect(result[0].priceInUsdc).toBeCloseTo(0.3, 6);
    // fdv = 1_000_000 * 0.3 = 300_000
    expect(result[0].fdv).toBeCloseTo(300_000, 0);
  });

  it("treats pool.price === 0 as missing (no Infinity from 1/0 fallback)", () => {
    const pools = [
      {
        tokenAddress: USDC,
        baseTokenAddress: WETH,
        poolAddress: ZERO,
        price: 0, // degenerate
        fee: 500,
        liquidity: "0",
        balances: { baseTokenBalance: "0", token0Balance: "0", token1Balance: "0" },
      },
    ] as Awaited<ReturnType<typeof import("../utils/poolDiscovery").discoverPools>>;
    const result = composeAndFilter({
      ...baseArgs,
      pools,
      tokenAddresses: [TOKEN_A] as Address[],
      tokenInfos: [makeInfo("A", "A", 18, 1_000_000n * 10n ** 18n)],
      upvoteCounts: [1000],
      latestUpvoteTimestamps: new Map([[TOKEN_A.toLowerCase(), NOW]]),
    });
    expect(result[0].priceInUsdc).toBeUndefined();
    expect(result[0].fdv).toBeUndefined();
  });

  it("respects maxTokens slice", () => {
    const addrs = [TOKEN_A, TOKEN_B, TOKEN_C] as Address[];
    const result = composeAndFilter({
      ...baseArgs,
      maxTokens: 2,
      tokenAddresses: addrs,
      tokenInfos: addrs.map((_, i) =>
        makeInfo(`T${i}`, `T${i}`, 18, 1n * 10n ** 18n)
      ),
      upvoteCounts: [1000, 2000, 3000],
      latestUpvoteTimestamps: new Map(
        addrs.map((a) => [a.toLowerCase(), NOW])
      ),
      sort: "top",
    });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.upvotes)).toEqual([3000, 2000]);
  });

  it("preserves sort='hot'/'recent' ordering from step 5", () => {
    // tokenAddresses comes in pre-sorted from aggregateAndRank
    const addrs = [TOKEN_B, TOKEN_A] as Address[];
    const result = composeAndFilter({
      ...baseArgs,
      tokenAddresses: addrs,
      tokenInfos: addrs.map((_, i) =>
        makeInfo(`T${i}`, `T${i}`, 18, 1n * 10n ** 18n)
      ),
      upvoteCounts: [600, 700], // both qualify
      latestUpvoteTimestamps: new Map(
        addrs.map((a) => [a.toLowerCase(), NOW])
      ),
      sort: "hot",
    });
    expect(result.map((t) => t.address)).toEqual([TOKEN_B, TOKEN_A]);
  });
});

describe("buildStorageMapFromBulkGetResults", () => {
  // viem deserializes Solidity named-tuple outputs as objects, not positional
  // arrays. A previous version of fetchStrategyStorage cast bulkGet results
  // as `[string, bytes][]` and read `item[1]`, which always returned undefined
  // and silently dropped every strategy storage blob from the candidate set.
  // The bug was masked because the legacy upvote path kept producing some
  // tokens, just a much smaller set than the website. These tests pin the
  // expected shape.
  const KEY_A: `0x${string}` = `0x${"a".repeat(64)}`;
  const KEY_B: `0x${string}` = `0x${"b".repeat(64)}`;
  const OPERATOR: Address = "0x0000000fa09b022e5616e5a173b4b67fa2fbcf28";
  const VALUE_A: `0x${string}` = "0xdeadbeef";
  const VALUE_B: `0x${string}` = "0xcafebabe";

  it("reads value from the .value property, not via array index", () => {
    const results: BulkGetResult[] = [
      { text: "", value: VALUE_A },
      { text: "", value: VALUE_B },
    ];
    const keys = [
      { key: KEY_A, operator: OPERATOR },
      { key: KEY_B, operator: OPERATOR },
    ];
    const map = buildStorageMapFromBulkGetResults(results, keys);
    expect(map.size).toBe(2);
    expect(map.get(KEY_A)).toBe(VALUE_A);
    expect(map.get(KEY_B)).toBe(VALUE_B);
  });

  it("skips entries whose value is empty 0x", () => {
    const results: BulkGetResult[] = [
      { text: "", value: "0x" },
      { text: "", value: VALUE_B },
    ];
    const keys = [
      { key: KEY_A, operator: OPERATOR },
      { key: KEY_B, operator: OPERATOR },
    ];
    const map = buildStorageMapFromBulkGetResults(results, keys);
    expect(map.size).toBe(1);
    expect(map.has(KEY_A)).toBe(false);
    expect(map.get(KEY_B)).toBe(VALUE_B);
  });

  it("returns an empty map when results is empty", () => {
    const map = buildStorageMapFromBulkGetResults([], []);
    expect(map.size).toBe(0);
  });
});
