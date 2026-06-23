import type { Abi } from "viem";
import feedRegistryAbi from "./abis/feed-registry.json";
import agentRegistryAbi from "./abis/agent-registry.json";
import topicCountBulkHelperAbi from "./abis/topic-count-bulk-helper.json";

// Feed topic prefix convention
export const FEED_TOPIC_PREFIX = "feed-" as const;

// Comment topic suffix convention
export const COMMENT_TOPIC_SUFFIX = ":comments:" as const;

// Maximum nesting depth for comments (top comment → reply → reply-to-reply)
// Replies to 3rd-level comments attach as siblings to the 3rd level rather than indenting further
export const MAX_COMMENT_NESTING_DEPTH = 3 as const;

// Maximum feed name length (enforced by FeedRegistry contract)
export const MAX_FEED_NAME_LENGTH = 64 as const;

// FeedRegistry contract - deterministic CREATE2 address, deployed on Base
// mainnet (8453) and Base Sepolia (84532). Same address/bytecode on each.
export const FEED_REGISTRY_CONTRACT = {
  abi: feedRegistryAbi as Abi,
  address: "0x000000049ad5f63b6074d3466aa00415c012fc4c" as `0x${string}`,
} as const;

// TopicCountBulkHelper contract - for batching comment count queries.
// Deterministic CREATE2 address, deployed on Base mainnet (8453) and Base
// Sepolia (84532). Same address/bytecode on each.
export const TOPIC_COUNT_BULK_HELPER_CONTRACT = {
  abi: topicCountBulkHelperAbi as Abi,
  address: "0x00000007221A01A02CEa1130d688325cA553566e" as `0x${string}`,
} as const;

// AgentRegistry contract - currently deployed on Base mainnet (8453) only.
// Not yet deployed on Base Sepolia. Resolve via getAgentRegistryContract() to
// get a clear error on unsupported chains instead of a low-level revert.
export const AGENT_REGISTRY_CONTRACT = {
  abi: agentRegistryAbi as Abi,
  address: "0x0000000c0744c5c7fea376db557b0eadc38c2150" as `0x${string}`,
} as const;

// Chains where the AgentRegistry contract is deployed. FeedRegistry and
// TopicCountBulkHelper are not allowlisted here because their deterministic
// CREATE2 deployments live on additional chains beyond Base + Base Sepolia.
export const AGENT_REGISTRY_CHAIN_IDS: number[] = [8453];

/**
 * Resolve the AgentRegistry contract for a chain, throwing a clear error when
 * the contract is not deployed there (e.g. Base Sepolia / 84532).
 */
export function getAgentRegistryContract(chainId: number): {
  abi: Abi;
  address: `0x${string}`;
} {
  if (!AGENT_REGISTRY_CHAIN_IDS.includes(chainId)) {
    throw new Error(
      `AgentRegistry is not deployed on chain ${chainId}. Supported chains: ${AGENT_REGISTRY_CHAIN_IDS.join(
        ", "
      )}.`
    );
  }
  return AGENT_REGISTRY_CONTRACT;
}

// Agent topic used by the AgentRegistry contract (single char for gas efficiency)
export const AGENT_TOPIC = "a" as const;

// Note: NULL_ADDRESS is imported directly from @net-protocol/core in files that need it
// It is not exported from this package's public API

