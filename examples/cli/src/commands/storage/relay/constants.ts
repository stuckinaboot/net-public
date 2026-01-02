import type { RetryConfig } from "./types";

/**
 * EIP-712 domain name for relay session signing
 */
export const RELAY_DOMAIN_NAME = "Net Relay Service";

/**
 * EIP-712 domain version for relay session signing
 */
export const RELAY_DOMAIN_VERSION = "1";

/**
 * EIP-712 types for relay session signing
 */
export const RELAY_SESSION_TYPES = {
  RelaySession: [
    { name: "operatorAddress", type: "address" },
    { name: "secretKeyHash", type: "bytes32" },
    { name: "expiresAt", type: "uint256" },
  ],
} as const;

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Default number of confirmations to wait for
 */
export const DEFAULT_CONFIRMATIONS = 1;

/**
 * Default timeout for waiting for transaction confirmations (milliseconds)
 */
export const DEFAULT_TIMEOUT = 60000; // 60 seconds

