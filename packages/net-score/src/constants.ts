import type { Abi, Address } from "viem";
import scoreAbi from "./abis/score.json";
import upvoteAppAbi from "./abis/upvote-app.json";
import upvoteStorageAppAbi from "./abis/upvote-storage-app.json";
import pureAlphaStrategyAbi from "./abis/pure-alpha-strategy.json";
import univ234PoolsStrategyAbi from "./abis/univ234-pools-strategy.json";
import dynamicSplitStrategyAbi from "./abis/dynamic-split-strategy.json";

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
