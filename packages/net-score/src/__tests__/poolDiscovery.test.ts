import { describe, it, expect, vi } from "vitest";
import {
  normalizeTokenPairs,
  parsePoolDiscoveries,
  selectBestPoolPerPair,
  constructPoolKey,
  calculatePriceFromSqrtPriceX96,
} from "../utils/poolDiscovery";
import { WETH_ADDRESS, NULL_ADDRESS } from "../constants";

describe("normalizeTokenPairs", () => {
  it("should use WETH as default base token", () => {
    const result = normalizeTokenPairs([
      { tokenAddress: "0xaaaa000000000000000000000000000000000001" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].originalPair.tokenAddress).toBe(
      "0xaaaa000000000000000000000000000000000001"
    );
    // One of tokenA/tokenB should be WETH
    const tokens = [result[0].tokenA, result[0].tokenB];
    expect(tokens).toContain(WETH_ADDRESS);
  });

  it("should lexicographically order token pairs", () => {
    const result = normalizeTokenPairs([
      { tokenAddress: "0xzzzz000000000000000000000000000000000001" },
    ]);
    // tokenA should be the lower address
    expect(result[0].tokenA.toLowerCase() < result[0].tokenB.toLowerCase()).toBe(
      true
    );
  });

  it("should use provided base token address", () => {
    const baseToken = "0xbbbb000000000000000000000000000000000002";
    const result = normalizeTokenPairs([
      {
        tokenAddress: "0xaaaa000000000000000000000000000000000001",
        baseTokenAddress: baseToken,
      },
    ]);
    const tokens = [result[0].tokenA, result[0].tokenB];
    expect(tokens).toContain(baseToken);
    expect(tokens).not.toContain(WETH_ADDRESS);
  });
});

describe("parsePoolDiscoveries", () => {
  it("should return empty discoveries when poolResults is undefined", () => {
    const result = parsePoolDiscoveries(undefined, []);
    expect(result.v2PoolAddresses).toHaveLength(0);
    expect(result.v3PoolAddresses).toHaveLength(0);
    expect(result.v4PoolKeys).toHaveLength(0);
  });

  it("should parse V2 pool discoveries", () => {
    const poolAddress = "0x1234567890123456789012345678901234567890";
    const discoveries = [
      {
        pairIndex: 0n,
        version: 2,
        poolAddress: poolAddress as `0x${string}`,
        poolKey: {
          currency0: NULL_ADDRESS as `0x${string}`,
          currency1: NULL_ADDRESS as `0x${string}`,
          fee: 0,
          tickSpacing: 0,
          hooks: NULL_ADDRESS as `0x${string}`,
        },
        fee: 0,
        tickSpacing: 0,
        hooks: NULL_ADDRESS as `0x${string}`,
      },
    ];

    const result = parsePoolDiscoveries(
      [discoveries, 1n] as const,
      [{ tokenAddress: "0xaaaa000000000000000000000000000000000001" }]
    );

    expect(result.v2PoolAddresses).toHaveLength(1);
    expect(result.v2PoolAddresses[0]).toBe(poolAddress);
    expect(result.v3PoolAddresses).toHaveLength(0);
    expect(result.v4PoolKeys).toHaveLength(0);
  });

  it("should parse V3 pool discoveries", () => {
    const poolAddress = "0x1234567890123456789012345678901234567890";
    const discoveries = [
      {
        pairIndex: 0n,
        version: 3,
        poolAddress: poolAddress as `0x${string}`,
        poolKey: {
          currency0: NULL_ADDRESS as `0x${string}`,
          currency1: NULL_ADDRESS as `0x${string}`,
          fee: 3000,
          tickSpacing: 60,
          hooks: NULL_ADDRESS as `0x${string}`,
        },
        fee: 3000,
        tickSpacing: 60,
        hooks: NULL_ADDRESS as `0x${string}`,
      },
    ];

    const result = parsePoolDiscoveries(
      [discoveries, 1n] as const,
      [{ tokenAddress: "0xaaaa000000000000000000000000000000000001" }]
    );

    expect(result.v3PoolAddresses).toHaveLength(1);
    expect(result.v2PoolAddresses).toHaveLength(0);
  });

  it("should deduplicate pool addresses", () => {
    const poolAddress = "0x1234567890123456789012345678901234567890";
    const discoveries = [
      {
        pairIndex: 0n,
        version: 3,
        poolAddress: poolAddress as `0x${string}`,
        poolKey: {
          currency0: NULL_ADDRESS as `0x${string}`,
          currency1: NULL_ADDRESS as `0x${string}`,
          fee: 3000,
          tickSpacing: 60,
          hooks: NULL_ADDRESS as `0x${string}`,
        },
        fee: 3000,
        tickSpacing: 60,
        hooks: NULL_ADDRESS as `0x${string}`,
      },
      {
        pairIndex: 0n,
        version: 3,
        poolAddress: poolAddress as `0x${string}`,
        poolKey: {
          currency0: NULL_ADDRESS as `0x${string}`,
          currency1: NULL_ADDRESS as `0x${string}`,
          fee: 3000,
          tickSpacing: 60,
          hooks: NULL_ADDRESS as `0x${string}`,
        },
        fee: 3000,
        tickSpacing: 60,
        hooks: NULL_ADDRESS as `0x${string}`,
      },
    ];

    const result = parsePoolDiscoveries(
      [discoveries, 2n] as const,
      [{ tokenAddress: "0xaaaa000000000000000000000000000000000001" }]
    );

    expect(result.v3PoolAddresses).toHaveLength(1);
  });
});

describe("selectBestPoolPerPair", () => {
  const basePool = {
    tokenAddress: "0xaaaa000000000000000000000000000000000001",
    baseTokenAddress: WETH_ADDRESS,
    price: 0.001,
    token0: "0xaaaa000000000000000000000000000000000001" as `0x${string}`,
    token1: WETH_ADDRESS as `0x${string}`,
    token0Balance: "1000000000000000000000",
    token1Balance: "1000000000000000000",
  };

  it("should return single pool when only one exists", () => {
    const pools = [
      {
        ...basePool,
        poolAddress: "0x1111000000000000000000000000000000000001" as `0x${string}`,
        baseTokenBalance: "1000000000000000000",
        fee: 3000,
      },
    ];

    const result = selectBestPoolPerPair(pools);
    expect(result).toHaveLength(1);
    expect(result[0].poolAddress).toBe(
      "0x1111000000000000000000000000000000000001"
    );
  });

  it("should prefer V2/V3 pools with sufficient liquidity over V4", () => {
    const pools = [
      {
        ...basePool,
        poolAddress: "0x1111000000000000000000000000000000000001" as `0x${string}`,
        baseTokenBalance: String(0.2 * 1e18), // Above 0.1 ETH threshold
        fee: 3000,
      },
      {
        ...basePool,
        poolAddress: null,
        baseTokenBalance: "0",
        fee: 500,
      },
    ];

    const result = selectBestPoolPerPair(pools);
    expect(result).toHaveLength(1);
    expect(result[0].poolAddress).toBe(
      "0x1111000000000000000000000000000000000001"
    );
  });

  it("should fall back to V4 when V2/V3 pools lack liquidity", () => {
    const pools = [
      {
        ...basePool,
        poolAddress: "0x1111000000000000000000000000000000000001" as `0x${string}`,
        baseTokenBalance: String(0.001 * 1e18), // Below both thresholds
        // token1 is WETH, so getWethBalanceWei uses token1Balance
        token1Balance: String(0.001 * 1e18), // Below both thresholds
        fee: 3000,
      },
      {
        ...basePool,
        poolAddress: null,
        baseTokenBalance: "0",
        token1Balance: "0",
        fee: 500,
      },
    ];

    const result = selectBestPoolPerPair(pools);
    expect(result).toHaveLength(1);
    expect(result[0].poolAddress).toBeNull(); // V4 pool
  });
});

describe("constructPoolKey", () => {
  const baseInfo = {
    poolAddress: "0x1111000000000000000000000000000000000001" as `0x${string}`,
    token0: "0x4200000000000000000000000000000000000006" as `0x${string}`,
    token1: "0xaaaa000000000000000000000000000000000001" as `0x${string}`,
    token0Decimals: 18,
    token1Decimals: 18,
    sqrtPriceX96: 0n,
    baseTokenBalance: 0n,
    token0Balance: 0n,
    token1Balance: 0n,
  };

  it("should construct V2 pool key with zero fee and tickSpacing", () => {
    const result = constructPoolKey(
      baseInfo,
      {
        tokenAddress: "0xaaaa000000000000000000000000000000000001",
        baseTokenAddress: WETH_ADDRESS,
        fee: 0,
      },
      2
    );

    expect(result).toBeDefined();
    expect(result!.fee).toBe(0);
    expect(result!.tickSpacing).toBe(0);
    expect(result!.hooks).toBe(NULL_ADDRESS);
  });

  it("should construct V3 pool key with fee from pair", () => {
    const result = constructPoolKey(
      baseInfo,
      {
        tokenAddress: "0xaaaa000000000000000000000000000000000001",
        baseTokenAddress: WETH_ADDRESS,
        fee: 3000,
      },
      3
    );

    expect(result).toBeDefined();
    expect(result!.fee).toBe(3000);
    expect(result!.tickSpacing).toBe(0);
  });

  it("should return V4 pool key directly", () => {
    const v4Key = {
      currency0: "0x4200000000000000000000000000000000000006" as `0x${string}`,
      currency1: "0xaaaa000000000000000000000000000000000001" as `0x${string}`,
      fee: 12000,
      tickSpacing: 200,
      hooks: "0xDd5EeaFf7BD481AD55Db083062b13a3cdf0A68CC" as `0x${string}`,
    };

    const result = constructPoolKey(
      baseInfo,
      {
        tokenAddress: "0xaaaa000000000000000000000000000000000001",
        baseTokenAddress: WETH_ADDRESS,
        fee: 12000,
      },
      4,
      v4Key
    );

    expect(result).toEqual(v4Key);
  });

  it("should return undefined for invalid token addresses", () => {
    const invalidInfo = {
      ...baseInfo,
      token0: "" as `0x${string}`,
      token1: "" as `0x${string}`,
    };

    const result = constructPoolKey(
      invalidInfo,
      {
        tokenAddress: "0xaaaa000000000000000000000000000000000001",
        baseTokenAddress: WETH_ADDRESS,
        fee: 3000,
      },
      3
    );

    expect(result).toBeUndefined();
  });
});

describe("calculatePriceFromSqrtPriceX96", () => {
  it("should return 0 for zero sqrtPriceX96", () => {
    expect(calculatePriceFromSqrtPriceX96(0n, 18, 18, true)).toBe(0);
  });

  it("should calculate correct price for equal decimals when isToken0", () => {
    // sqrtPriceX96 = 2^96 means price = 1.0
    const sqrtPriceX96 = BigInt(2) ** BigInt(96);
    const price = calculatePriceFromSqrtPriceX96(sqrtPriceX96, 18, 18, true);
    expect(price).toBeCloseTo(1.0, 5);
  });

  it("should calculate correct price for equal decimals when not isToken0", () => {
    const sqrtPriceX96 = BigInt(2) ** BigInt(96);
    const price = calculatePriceFromSqrtPriceX96(sqrtPriceX96, 18, 18, false);
    expect(price).toBeCloseTo(1.0, 5);
  });

  it("should account for decimal differences", () => {
    // sqrtPriceX96 = 2^96, token0 has 18 decimals, token1 has 6 decimals
    const sqrtPriceX96 = BigInt(2) ** BigInt(96);
    const price = calculatePriceFromSqrtPriceX96(sqrtPriceX96, 18, 6, true);
    // price = 1.0 * 10^(18-6) = 1e12
    expect(price).toBeCloseTo(1e12, -6);
  });
});

vi.mock("viem/actions", () => ({
  readContract: vi.fn(),
}));

describe("discoverTokenPool", () => {
  it("should return null when no pools found", async () => {
    const { readContract } = await import("viem/actions");
    const { discoverTokenPool } = await import("../utils/poolDiscovery");

    // Mock getPoolsMultiVersion to return no pools
    (readContract as ReturnType<typeof vi.fn>).mockResolvedValueOnce([[], 0n]);

    const mockPublicClient = {} as any;

    const result = await discoverTokenPool({
      publicClient: mockPublicClient,
      tokenAddress: "0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb",
    });

    expect(result).toBeNull();
    expect(readContract).toHaveBeenCalledTimes(1);
  });
});
