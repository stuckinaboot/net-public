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
  // Storage contracts
  STORAGE_CONTRACT:
    "0x00000000db40fcb9f4466330982372e27fd7bbf5" as `0x${string}`,
  CHUNKED_STORAGE_CONTRACT:
    "0x000000A822F09aF21b1951B65223F54ea392E6C6" as `0x${string}`,
  STORAGE_ROUTER_CONTRACT:
    "0x000000C0bbc2Ca04B85E77D18053e7c38bB97939" as `0x${string}`,

  // Net Protocol contract
  NET_CONTRACT: "0x00000000B24D62781dB359b07880a105cD0b64e6" as `0x${string}`,
} as const;

/**
 * Known test operators on Base chain
 * These are addresses that have storage data we can test against
 * Note: These may need to be discovered/updated based on actual Base chain data
 */
export const BASE_TEST_OPERATORS = {
  // Placeholder - will need to be populated with actual operators that have storage
  // Example: TEST_OPERATOR: "0x..." as `0x${string}`,
} as const;

/**
 * Known test storage keys on Base chain
 * These are storage keys that exist and can be used for testing
 * Note: These may need to be discovered/updated based on actual Base chain data
 */
export const BASE_TEST_STORAGE_KEYS = {
  // Placeholder - will need to be populated with actual storage keys
  // Example: TEST_KEY: "test-key",
} as const;

/**
 * Helper to create a test client configuration
 */
export function createTestConfig(overrides?: {
  chainId?: number;
  rpcUrls?: string[];
}) {
  return {
    chainId: overrides?.chainId ?? BASE_CHAIN_ID,
    overrides: overrides?.rpcUrls
      ? { rpcUrls: overrides.rpcUrls }
      : { rpcUrls: [BASE_TEST_RPC_URL] },
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

/**
 * Type for bulk storage put entries
 */
export type BulkPutEntry = {
  key: `0x${string}`;
  text: string;
  value: `0x${string}`;
};

/**
 * Type guard to check if a value is an array of bulk put entries
 */
export function isBulkPutEntries(value: unknown): value is BulkPutEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "key" in entry &&
        "text" in entry &&
        "value" in entry &&
        typeof entry.key === "string" &&
        typeof entry.text === "string" &&
        typeof entry.value === "string"
    )
  );
}
