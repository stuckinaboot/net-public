/**
 * Test utilities for integration tests
 * Focuses on Base chain (chainId: 8453) for testing
 */

import type { Abi } from "viem";

export const BASE_CHAIN_ID = 8453;

/**
 * RPC URL to use for tests (BlastAPI has better rate limits)
 */
export const BASE_TEST_RPC_URL = "https://base-mainnet.public.blastapi.io";

/**
 * Delay between RPC calls to avoid rate limiting (in milliseconds)
 * Increased to 500ms to reduce 429 rate limit errors
 */
export const RPC_DELAY_MS = 500;

/**
 * Known Base chain contract addresses for testing
 * These are real contracts deployed on Base mainnet
 */
export const BASE_TEST_ADDRESSES = {
  // Net Protocol contract
  NET_CONTRACT: "0x00000000B24D62781dB359b07880a105cD0b64e6" as `0x${string}`,

  // Bazaar contracts (NFT marketplace on Net)
  BAZAAR_CONTRACT:
    "0x000000058f3ade587388daf827174d0e6fc97595" as `0x${string}`,

  // Score/Upvote contracts
  UPVOTE_APP: "0x00000001f0b8173316a016a5067ad74e8cea47bf" as `0x${string}`,
  UPVOTE_CONTRACT:
    "0x00000000DB40fcB9f4466330982372e27Fd7Bbf5" as `0x${string}`,
  SCORE_CONTRACT: "0x0000000FA09B022E5616E5a173b4b67FA2FBcF28" as `0x${string}`,

  // NULL address (used for topic-based feeds)
  NULL_ADDRESS: "0x0000000000000000000000000000000000000000" as `0x${string}`,
} as const;

/**
 * Helper to create a test client configuration
 */
export function createTestConfig(overrides?: {
  chainId?: number;
  rpcUrl?: string | string[];
}) {
  return {
    chainId: overrides?.chainId ?? BASE_CHAIN_ID,
    rpcUrl: overrides?.rpcUrl,
  };
}

/**
 * Helper to wait for a short delay (useful for rate limiting)
 * Uses RPC_DELAY_MS by default
 */
export function delay(ms: number = RPC_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to retry a function with exponential backoff
 * Automatically retries on 429 (rate limit) errors
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error (429) or contains rate limit message
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isRateLimit =
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("Rate limit") ||
        errorMessage.includes("too many requests");

      if (i < maxRetries - 1) {
        // Use longer delay for rate limit errors
        const backoffDelay = isRateLimit
          ? initialDelay * Math.pow(2, i + 1) // Extra delay for rate limits
          : initialDelay * Math.pow(2, i);

        await delay(backoffDelay);
      }
    }
  }

  throw lastError || new Error("Retry failed");
}

/**
 * Wrapper for RPC calls that automatically retries on rate limit errors
 * Use this for RPC calls that might hit rate limits
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
  }
): Promise<T> {
  return retryWithBackoff(
    fn,
    options?.maxRetries ?? 3,
    options?.initialDelay ?? 2000
  );
}

/**
 * Type guard to check if an ABI item is a function
 */
export function isAbiFunction(
  item: Abi[number]
): item is Extract<Abi[number], { type: "function" }> {
  return item.type === "function";
}

/**
 * Helper to find and type-check an ABI function by name
 * Returns undefined if function is not found or is not a function type
 */
export function findAbiFunction(
  abi: Abi,
  functionName: string
): Extract<Abi[number], { type: "function" }> | undefined {
  const item = abi.find(
    (item) => item.type === "function" && item.name === functionName
  );
  return item && isAbiFunction(item) ? item : undefined;
}
