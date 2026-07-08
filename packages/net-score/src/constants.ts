import type { Abi, Address } from "viem";
import scoreAbi from "./abis/score.json";
import upvoteAppAbi from "./abis/upvote-app.json";
import upvoteStorageAppAbi from "./abis/upvote-storage-app.json";
import pureAlphaStrategyAbi from "./abis/pure-alpha-strategy.json";
import univ234PoolsStrategyAbi from "./abis/univ234-pools-strategy.json";
import dynamicSplitStrategyAbi from "./abis/dynamic-split-strategy.json";
import multiVersionUniswapBulkPoolFinderAbi from "./abis/multi-version-uniswap-bulk-pool-finder.json";
import multiVersionUniswapPoolInfoRetrieverAbi from "./abis/multi-version-uniswap-pool-info-retriever.json";
import userUpvoteAbi from "./abis/user-upvote.json";
import erc20BulkInfoHelperAbi from "./abis/erc20-bulk-info-helper.json";

// Score core contract (v2 strategy)
export const SCORE_CONTRACT = {
  address: "0x0000000fa09b022e5616e5a173b4b67fa2fbcf28" as Address,
  abi: scoreAbi as Abi,
} as const;

// UpvoteApp contract
export const UPVOTE_APP = {
  address: "0x00000001f0b8173316a016a5067ad74e8cea47bf" as Address,
  abi: upvoteAppAbi as Abi,
} as const;

// UpvoteStorageApp contract
export const UPVOTE_STORAGE_APP = {
  address: "0x000000060CEB69D023227DF64CfB75eC37c75B62" as Address,
  abi: upvoteStorageAppAbi as Abi,
} as const;

// UpvotePureAlphaStrategy contract
export const PURE_ALPHA_STRATEGY = {
  address: "0x00000001b1bcdeddeafd5296aaf4f3f3e21ae876" as Address,
  abi: pureAlphaStrategyAbi as Abi,
} as const;

// UpvoteUniv234PoolsStrategy (handles Uniswap V2, V3, V4 pools)
export const UNIV234_POOLS_STRATEGY = {
  address: "0x000000063f84e07a3e7a7ee578b42704ee6d22c9" as Address,
  abi: univ234PoolsStrategyAbi as Abi,
} as const;

// UpvoteDynamicSplitUniv234PoolsStrategy (configurable token/alpha split for Uni V2/V3/V4 pools)
export const DYNAMIC_SPLIT_STRATEGY = {
  address: "0x0000000869160f0b2a213adefb46a7ea7e62ac7a" as Address,
  abi: dynamicSplitStrategyAbi as Abi,
} as const;

// All strategy addresses for batch queries
export const ALL_STRATEGY_ADDRESSES: Address[] = [
  UNIV234_POOLS_STRATEGY.address,
  PURE_ALPHA_STRATEGY.address,
  DYNAMIC_SPLIT_STRATEGY.address,
];

// Legacy upvote contract addresses (v1 and v2, before Score system)
export const LEGACY_UPVOTE_V1_ADDRESS =
  "0x0ada882dbbdc12388a1f9ca85d2d847088f747df" as Address;

export const LEGACY_UPVOTE_V2_ADDRESS =
  "0x9027dcad0a3dca5835895e14fbc022a1e5ea909b" as Address;

// Chains where the Score system is deployed
export const SUPPORTED_SCORE_CHAINS = [8453] as const;

// Pool discovery contracts
// Generalized bulk pool finder: takes per-chain factory addresses in
// PoolFinderParams (v2Factory/v3Factory/v4PoolManager). Deployed deterministically
// via CREATE2 (salt 0x77edd319…), so the address is identical on every chain.
export const MULTI_VERSION_UNISWAP_BULK_POOL_FINDER = {
  address: "0x88A51f8d3B1f222394075E086e33108BC9ceDfB6" as Address,
  abi: multiVersionUniswapBulkPoolFinderAbi as Abi,
} as const;

export const MULTI_VERSION_UNISWAP_POOL_INFO_RETRIEVER = {
  address: "0x00000002986Ca76897216a8A3A7Db10FcB0d29Cf" as Address,
  abi: multiVersionUniswapPoolInfoRetrieverAbi as Abi,
} as const;

// WETH addresses by chain
const WETH_BY_CHAIN: Record<number, Address> = {
  8453: "0x4200000000000000000000000000000000000006", // Base (L2 predeploy)
  1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // Ethereum mainnet
  4663: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73", // Robinhood Chain (non-standard WETH; not the OP predeploy)
};

/**
 * Get the WETH address for a given chain.
 */
export function getWethAddress(chainId: number): Address {
  const addr = WETH_BY_CHAIN[chainId];
  if (!addr) {
    throw new Error(`Score: No WETH address for chain ${chainId}`);
  }
  return addr;
}

// Common addresses
export const NULL_ADDRESS =
  "0x0000000000000000000000000000000000000000" as Address;

// Uniswap factory / pool-manager addresses by chain, passed to the bulk pool
// finder so a single deployment works on any chain. Use NULL_ADDRESS for a
// Uniswap version not deployed on a chain — the finder skips it instead of
// reverting.
export type UniswapFactories = {
  v2Factory: Address;
  v3Factory: Address;
  v4PoolManager: Address;
};

const UNISWAP_FACTORIES_BY_CHAIN: Record<number, UniswapFactories> = {
  8453: {
    // Base
    v2Factory: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
    v3Factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    v4PoolManager: "0x498581fF718922c3f8e6A244956aF099B2652b2b",
  },
  1: {
    // Ethereum mainnet
    v2Factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    v3Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    v4PoolManager: "0x000000000004444c5dc75cB358380D2e3dE08A90",
  },
  4663: {
    // Robinhood Chain — Uniswap V3 only, at a non-canonical factory address.
    v2Factory: NULL_ADDRESS,
    v3Factory: "0x1f7d7550B1b028f7571E69A784071F0205FD2EfA",
    v4PoolManager: NULL_ADDRESS,
  },
};

/**
 * Get the Uniswap factory / pool-manager addresses for a given chain.
 */
export function getUniswapFactories(chainId: number): UniswapFactories {
  const factories = UNISWAP_FACTORIES_BY_CHAIN[chainId];
  if (!factories) {
    throw new Error(`Score: No Uniswap factories for chain ${chainId}`);
  }
  return factories;
}

// Upvote pricing
export const UPVOTE_PRICE_ETH = 0.000025;

// User upvote contract (standalone user-to-user upvote system, separate from Score)
export const USER_UPVOTE_CONTRACT = {
  address: "0xa4bc2c63dd0157692fd5f409389e5032e37d8895" as Address,
  abi: userUpvoteAbi as Abi,
} as const;

// ERC20 bulk info helper (name/symbol/decimals/totalSupply/burnedTokens in one call)
export const ERC20_BULK_INFO_HELPER_CONTRACT = {
  address: "0x00000051809cbfacdf7d08ada813836822b880a2" as Address,
  abi: erc20BulkInfoHelperAbi as Abi,
} as const;
