import type { Abi, Address } from "viem";
import scoreAbi from "./abis/score.json";
import upvoteAppAbi from "./abis/upvote-app.json";
import upvoteStorageAppAbi from "./abis/upvote-storage-app.json";
import pureAlphaStrategyAbi from "./abis/pure-alpha-strategy.json";
import univ234PoolsStrategyAbi from "./abis/univ234-pools-strategy.json";
import dynamicSplitStrategyAbi from "./abis/dynamic-split-strategy.json";
import multiVersionUniswapBulkPoolFinderAbi from "./abis/multi-version-uniswap-bulk-pool-finder.json";
import multiVersionUniswapPoolInfoRetrieverAbi from "./abis/multi-version-uniswap-pool-info-retriever.json";

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
export const MULTI_VERSION_UNISWAP_BULK_POOL_FINDER = {
  address: "0xbc237dac4c74c170780fc12f353a258bdd31a8cf" as Address,
  abi: multiVersionUniswapBulkPoolFinderAbi as Abi,
} as const;

export const MULTI_VERSION_UNISWAP_POOL_INFO_RETRIEVER = {
  address: "0x7A9EF0AC6F6a254cd570B05D62D094D3aa5067f1" as Address,
  abi: multiVersionUniswapPoolInfoRetrieverAbi as Abi,
} as const;

// WETH addresses by chain
const WETH_BY_CHAIN: Record<number, Address> = {
  8453: "0x4200000000000000000000000000000000000006", // Base (L2 predeploy)
  1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // Ethereum mainnet
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

// Upvote pricing
export const UPVOTE_PRICE_ETH = 0.000025;
