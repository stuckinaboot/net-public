import { type Address, type PublicClient } from "viem";
import { readContract } from "viem/actions";
import {
  MULTI_VERSION_UNISWAP_BULK_POOL_FINDER,
  MULTI_VERSION_UNISWAP_POOL_INFO_RETRIEVER,
  getWethAddress,
  NULL_ADDRESS,
} from "../constants";
import type { PoolKey, PoolDiscoveryResult, PoolDiscoveryPair } from "../types";

// ============================================================================
// Internal types
// ============================================================================

type PairInput = PoolDiscoveryPair;

type V4PoolKeyLike = {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
};

type RawPoolDiscovery = {
  pairIndex: bigint;
  version: number;
  poolAddress: Address;
  poolKey: V4PoolKeyLike;
  fee: number;
  tickSpacing: number;
  hooks: Address;
};

type PoolFullInfo = {
  poolAddress: Address;
  token0: Address;
  token1: Address;
  token0Decimals: number;
  token1Decimals: number;
  sqrtPriceX96: bigint;
  baseTokenBalance: bigint;
  token0Balance: bigint;
  token1Balance: bigint;
  liquidity: bigint;
};

type PairMeta = {
  tokenAddress: string;
  baseTokenAddress: string;
  fee: number;
};

type Discoveries = {
  v2PoolAddresses: Address[];
  v3PoolAddresses: Address[];
  v4PoolKeys: V4PoolKeyLike[];
  v2PoolAddressToPair: Record<string, PairMeta>;
  v3PoolAddressToPair: Record<string, PairMeta>;
  v4PoolKeyToPair: Record<string, PairMeta>;
};

// ============================================================================
// Constants
// ============================================================================

const V3_V4_FEE_TIERS = [500, 3000, 10000, 12000, 8388608];
const V4_TICK_SPACINGS = [200];
const V4_HOOKS: Address[] = [
  NULL_ADDRESS,
  "0xDd5EeaFf7BD481AD55Db083062b13a3cdf0A68CC",
  "0x34a45c6B61876d739400Bd71228CbcbD4F53E8cC",
  "0xb429d62f8f3bFFb98CdB9569533eA23bF0Ba28CC",
  "0xd60D6B218116cFd801E28F78d011a203D2b068Cc",
  "0x3e342a06f9592459D75721d6956B570F02eF2Dc0",
  "0xbB7784A4d481184283Ed89619A3e3ed143e1Adc0",
  "0xBDF938149ac6a781F94FAa0ed45E6A0e984c6544",
];

const Q96 = BigInt(2) ** BigInt(96);
const ZERO_BI = BigInt(0);

// Derived WETH amount (wei) for a V4 pool at its current price.
//   WETH = currency1:  L * sqrtPriceX96 / Q96
//   WETH = currency0:  L * Q96 / sqrtPriceX96
// Only counts in-range liquidity, which is sufficient for selection.
function deriveV4WethDepthWei(
  liquidity: bigint,
  sqrtPriceX96: bigint,
  wethIsCurrency1: boolean
): bigint {
  if (sqrtPriceX96 === ZERO_BI || liquidity === ZERO_BI) return ZERO_BI;
  if (wethIsCurrency1) {
    return (liquidity * sqrtPriceX96) / Q96;
  }
  return (liquidity * Q96) / sqrtPriceX96;
}

// WETH-side balance for a V2/V3 pool. Mirrors the V4 helper so selection can
// compare both versions on the same `wethDepthWei` axis.
function deriveV2V3WethDepthWei(
  info: PoolFullInfo,
  wethLower: string
): bigint {
  if ((info.token0 ?? "").toLowerCase() === wethLower) {
    return BigInt(info.token0Balance ?? 0);
  }
  if ((info.token1 ?? "").toLowerCase() === wethLower) {
    return BigInt(info.token1Balance ?? 0);
  }
  return BigInt(info.baseTokenBalance ?? 0);
}

// ============================================================================
// Pure helper functions
// ============================================================================

export function normalizeTokenPairs(pairs: PairInput[], wethAddress: Address) {
  return pairs.map((pair) => {
    const tokenA = pair.tokenAddress;
    const tokenB = pair.baseTokenAddress || wethAddress;

    return {
      originalPair: pair,
      tokenA: tokenA.toLowerCase() < tokenB.toLowerCase() ? tokenA : tokenB,
      tokenB: tokenA.toLowerCase() < tokenB.toLowerCase() ? tokenB : tokenA,
    };
  });
}

function buildDiscoveryArgs(
  normalizedPairs: ReturnType<typeof normalizeTokenPairs>
) {
  return {
    tokenAs: normalizedPairs.map((p) => p.tokenA),
    tokenBs: normalizedPairs.map((p) => p.tokenB),
    fees: V3_V4_FEE_TIERS,
    v4TickSpacings: V4_TICK_SPACINGS,
    v4Hooks: V4_HOOKS,
  };
}

export function parsePoolDiscoveries(
  poolResults: readonly [RawPoolDiscovery[], bigint] | undefined,
  pairs: PairInput[],
  wethAddress: Address
): Discoveries {
  if (!poolResults) {
    return {
      v2PoolAddresses: [],
      v3PoolAddresses: [],
      v4PoolKeys: [],
      v2PoolAddressToPair: {},
      v3PoolAddressToPair: {},
      v4PoolKeyToPair: {},
    };
  }

  const [discoveries, countRaw] = poolResults;
  const countNum =
    typeof countRaw === "bigint" ? Number(countRaw) : Number(countRaw || 0);

  const v2PoolAddresses: Address[] = [];
  const v3PoolAddresses: Address[] = [];
  const v4PoolKeys: V4PoolKeyLike[] = [];
  const seenV2V3Addresses = new Set<string>();
  const seenV4Keys = new Set<string>();

  const v2PoolAddressToPair: Record<string, PairMeta> = {};
  const v3PoolAddressToPair: Record<string, PairMeta> = {};
  const v4PoolKeyToPair: Record<string, PairMeta> = {};

  for (let i = 0; i < Math.min(countNum, discoveries.length); i++) {
    const discovery: RawPoolDiscovery = discoveries[i] as RawPoolDiscovery;
    const version = Number(discovery?.version ?? 0);
    const poolAddressValue = discovery?.poolAddress as string | undefined;
    const pairIndex = Number(discovery?.pairIndex ?? 0);
    const feeNum = Number(discovery?.fee ?? 0);
    const poolKey = discovery?.poolKey;

    const pair = pairs[pairIndex];
    if (!pair) continue;

    if (
      version === 2 &&
      poolAddressValue &&
      poolAddressValue !== NULL_ADDRESS
    ) {
      const poolAddress = poolAddressValue.toLowerCase();
      if (!seenV2V3Addresses.has(poolAddress)) {
        seenV2V3Addresses.add(poolAddress);
        v2PoolAddresses.push(poolAddressValue as Address);
        v2PoolAddressToPair[poolAddress] = {
          tokenAddress: pair.tokenAddress,
          baseTokenAddress: pair.baseTokenAddress || wethAddress,
          fee: feeNum,
        };
      }
    } else if (
      version === 3 &&
      poolAddressValue &&
      poolAddressValue !== NULL_ADDRESS
    ) {
      const poolAddress = poolAddressValue.toLowerCase();
      if (!seenV2V3Addresses.has(poolAddress)) {
        seenV2V3Addresses.add(poolAddress);
        v3PoolAddresses.push(poolAddressValue as Address);
        v3PoolAddressToPair[poolAddress] = {
          tokenAddress: pair.tokenAddress,
          baseTokenAddress: pair.baseTokenAddress || wethAddress,
          fee: feeNum,
        };
      }
    } else if (version === 4 && poolKey) {
      const poolKeyString = JSON.stringify(poolKey);
      if (!seenV4Keys.has(poolKeyString)) {
        seenV4Keys.add(poolKeyString);
        v4PoolKeys.push(poolKey);
        v4PoolKeyToPair[poolKeyString] = {
          tokenAddress: pair.tokenAddress,
          baseTokenAddress: pair.baseTokenAddress || wethAddress,
          fee: feeNum,
        };
      }
    }
  }

  return {
    v2PoolAddresses,
    v3PoolAddresses,
    v4PoolKeys,
    v2PoolAddressToPair,
    v3PoolAddressToPair,
    v4PoolKeyToPair,
  };
}

function determinePoolVersion(discoveries: Discoveries, index: number) {
  const {
    v2PoolAddresses,
    v3PoolAddresses,
    v4PoolKeys,
    v2PoolAddressToPair,
    v3PoolAddressToPair,
    v4PoolKeyToPair,
  } = discoveries;

  if (index < v2PoolAddresses.length) {
    const poolAddress = v2PoolAddresses[index].toLowerCase();
    return {
      version: 2,
      pair: v2PoolAddressToPair[poolAddress],
      fee: 0,
      v4PoolKey: undefined,
    };
  } else if (index < v2PoolAddresses.length + v3PoolAddresses.length) {
    const v3Index = index - v2PoolAddresses.length;
    const poolAddress = v3PoolAddresses[v3Index].toLowerCase();
    return {
      version: 3,
      pair: v3PoolAddressToPair[poolAddress],
      fee: v3PoolAddressToPair[poolAddress]?.fee || 0,
      v4PoolKey: undefined,
    };
  } else {
    const v4Index = index - v2PoolAddresses.length - v3PoolAddresses.length;
    const poolKey = v4PoolKeys[v4Index];
    const poolKeyString = JSON.stringify(poolKey);
    return {
      version: 4,
      pair: v4PoolKeyToPair[poolKeyString],
      fee: v4PoolKeyToPair[poolKeyString]?.fee || 0,
      v4PoolKey: poolKey,
    };
  }
}

/**
 * Calculate price from sqrtPriceX96 for Uniswap V3/V4 pools.
 */
export function calculatePriceFromSqrtPriceX96(
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number,
  isToken0: boolean
): number {
  const sqrtPrice = Number(sqrtPriceX96);
  if (sqrtPrice === 0) return 0;

  const priceX96 = (sqrtPrice / 2 ** 96) ** 2;

  if (isToken0) {
    return priceX96 * 10 ** (token0Decimals - token1Decimals);
  } else {
    return (1 / priceX96) * 10 ** (token1Decimals - token0Decimals);
  }
}

function calculatePoolPrice(
  info: PoolFullInfo,
  pair: PairMeta,
  version: number
): number | null {
  try {
    const sqrtPriceX96 = Number(info.sqrtPriceX96);
    const token0Decimals = Number(info.token0Decimals);
    const token1Decimals = Number(info.token1Decimals);
    const isToken0 =
      info.token0.toLowerCase() === pair.tokenAddress.toLowerCase();

    if (version === 2) {
      const token0Balance = Number(info.token0Balance) / 10 ** token0Decimals;
      const token1Balance = Number(info.token1Balance) / 10 ** token1Decimals;

      if (token0Balance === 0 || token1Balance === 0) return null;

      if (isToken0) {
        return token1Balance / token0Balance;
      } else {
        return token0Balance / token1Balance;
      }
    } else {
      if (sqrtPriceX96 === 0) return null;

      if (isToken0) {
        return (
          (sqrtPriceX96 / 2 ** 96) ** 2 *
          10 ** (token0Decimals - token1Decimals)
        );
      } else {
        const priceX96 = (sqrtPriceX96 / 2 ** 96) ** 2;
        return (1 / priceX96) * 10 ** (token1Decimals - token0Decimals);
      }
    }
  } catch {
    return null;
  }
}

export function constructPoolKey(
  info: PoolFullInfo,
  pair: PairMeta,
  version: number,
  v4PoolKey?: V4PoolKeyLike
): PoolKey | undefined {
  try {
    if (!info.token0 || !info.token1 || typeof pair.fee !== "number") {
      return undefined;
    }

    if (!info.token0.startsWith("0x") || !info.token1.startsWith("0x")) {
      return undefined;
    }

    const currency0 =
      info.token0.toLowerCase() < info.token1.toLowerCase()
        ? info.token0
        : info.token1;
    const currency1 =
      info.token0.toLowerCase() < info.token1.toLowerCase()
        ? info.token1
        : info.token0;

    if (version === 2) {
      return {
        currency0,
        currency1,
        fee: 0,
        tickSpacing: 0,
        hooks: NULL_ADDRESS,
      };
    } else if (version === 3) {
      return {
        currency0,
        currency1,
        fee: pair.fee,
        tickSpacing: 0,
        hooks: NULL_ADDRESS,
      };
    } else {
      if (!v4PoolKey || !v4PoolKey.currency0 || !v4PoolKey.currency1) {
        return undefined;
      }
      return v4PoolKey as PoolKey;
    }
  } catch {
    return undefined;
  }
}

// ============================================================================
// Pool selection
// ============================================================================

type PoolWithMeta = {
  tokenAddress: string;
  baseTokenAddress: string;
  poolAddress: Address | null;
  price: number | null;
  baseTokenBalance: string;
  token0?: Address;
  token1?: Address;
  token0Balance: string;
  token1Balance: string;
  fee: number;
  poolKey?: PoolKey;
  liquidity: string;
  wethDepthWei: bigint;
};

// V2/V3 WETH-side ERC20 balance and V4 in-range virtual reserve are both
// expressed in WETH wei, so they're directly comparable. Pools with zero depth
// are rejected to skip V4 ghost pools left behind after liquidity removal.
export function selectBestPoolPerPair(
  allPools: PoolWithMeta[]
): PoolWithMeta[] {
  const poolsByPair: Record<string, PoolWithMeta[]> = {};

  for (const pool of allPools) {
    const key =
      pool.tokenAddress.toLowerCase() +
      "_" +
      pool.baseTokenAddress.toLowerCase();
    if (!poolsByPair[key]) poolsByPair[key] = [];
    poolsByPair[key].push(pool);
  }

  const bestPools: PoolWithMeta[] = [];
  for (const group of Object.values(poolsByPair)) {
    const withDepth = group.filter((p) => p.wethDepthWei > ZERO_BI);
    if (withDepth.length === 0) continue;
    const best = withDepth.reduce((a, b) =>
      a.wethDepthWei > b.wethDepthWei ? a : b
    );
    bestPools.push(best);
  }

  return bestPools;
}

// ============================================================================
// Main exported functions
// ============================================================================

/**
 * Discover the best Uniswap pools for multiple token pairs.
 * Makes two on-chain calls: pool discovery + pool info retrieval.
 */
export async function discoverPools({
  publicClient,
  pairs,
  chainId = 8453,
}: {
  publicClient: PublicClient;
  pairs: PoolDiscoveryPair[];
  /** Chain ID used to resolve the WETH address. Defaults to Base (8453). */
  chainId?: number;
}): Promise<PoolDiscoveryResult[]> {
  if (pairs.length === 0) return [];

  const wethAddress = getWethAddress(chainId);
  const normalizedPairs = normalizeTokenPairs(pairs, wethAddress);
  const discoveryArgs = buildDiscoveryArgs(normalizedPairs);

  // Step 1: Discover pools
  const poolResults = (await readContract(publicClient, {
    address: MULTI_VERSION_UNISWAP_BULK_POOL_FINDER.address,
    abi: MULTI_VERSION_UNISWAP_BULK_POOL_FINDER.abi,
    functionName: "getPoolsMultiVersion",
    args: [discoveryArgs],
  })) as readonly [RawPoolDiscovery[], bigint];

  const discoveries = parsePoolDiscoveries(poolResults, pairs, wethAddress);

  const totalPools =
    discoveries.v2PoolAddresses.length +
    discoveries.v3PoolAddresses.length +
    discoveries.v4PoolKeys.length;

  if (totalPools === 0) return [];

  // Step 2: Get full pool info
  const poolInfos = (await readContract(publicClient, {
    address: MULTI_VERSION_UNISWAP_POOL_INFO_RETRIEVER.address,
    abi: MULTI_VERSION_UNISWAP_POOL_INFO_RETRIEVER.abi,
    functionName: "getPoolsFullInfoMultiVersion",
    args: [
      discoveries.v2PoolAddresses,
      discoveries.v3PoolAddresses,
      discoveries.v4PoolKeys,
      wethAddress,
    ],
  })) as PoolFullInfo[];

  if (!Array.isArray(poolInfos) || poolInfos.length === 0) return [];

  const wethLower = wethAddress.toLowerCase();

  // Step 3: Map pool infos to enriched format
  const allPools = poolInfos
    .map((info: PoolFullInfo, index: number) => {
      const poolData = determinePoolVersion(discoveries, index);
      if (!poolData || !poolData.pair) return null;

      const isV4 = poolData.version === 4;
      const liquidity = BigInt(info.liquidity ?? 0);

      let wethDepthWei: bigint;
      if (isV4) {
        const wethIsCurrency1 =
          poolData.v4PoolKey!.currency1.toLowerCase() === wethLower;
        wethDepthWei = deriveV4WethDepthWei(
          liquidity,
          BigInt(info.sqrtPriceX96 ?? 0),
          wethIsCurrency1
        );
      } else {
        wethDepthWei = deriveV2V3WethDepthWei(info, wethLower);
      }

      return {
        tokenAddress: poolData.pair.tokenAddress,
        baseTokenAddress: poolData.pair.baseTokenAddress || wethAddress,
        poolAddress: isV4 ? null : (info.poolAddress as Address),
        price: calculatePoolPrice(info, poolData.pair, poolData.version),
        baseTokenBalance: String(info.baseTokenBalance || 0),
        token0: info.token0,
        token1: info.token1,
        token0Balance: String(info.token0Balance || 0),
        token1Balance: String(info.token1Balance || 0),
        fee: poolData.fee,
        poolKey: constructPoolKey(
          info,
          poolData.pair,
          poolData.version,
          poolData.v4PoolKey
        ),
        liquidity: String(liquidity),
        wethDepthWei,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null) as PoolWithMeta[];

  // Step 4: Select best pool per pair
  const bestPools = selectBestPoolPerPair(allPools);

  return bestPools.map(
    (pool): PoolDiscoveryResult => ({
      tokenAddress: pool.tokenAddress,
      baseTokenAddress: pool.baseTokenAddress,
      poolAddress: pool.poolAddress,
      price: pool.price,
      fee: pool.fee,
      poolKey: pool.poolKey,
      liquidity: pool.liquidity,
      balances: {
        baseTokenBalance: pool.baseTokenBalance,
        token0Balance: pool.token0Balance,
        token1Balance: pool.token1Balance,
      },
    })
  );
}

/**
 * Discover the best WETH pool for a single token.
 * Convenience wrapper around discoverPools.
 */
export async function discoverTokenPool({
  publicClient,
  tokenAddress,
  chainId = 8453,
}: {
  publicClient: PublicClient;
  tokenAddress: string;
  /** Chain ID used to resolve the WETH address. Defaults to Base (8453). */
  chainId?: number;
}): Promise<PoolDiscoveryResult | null> {
  const results = await discoverPools({
    publicClient,
    pairs: [{ tokenAddress }],
    chainId,
  });
  return results[0] ?? null;
}
