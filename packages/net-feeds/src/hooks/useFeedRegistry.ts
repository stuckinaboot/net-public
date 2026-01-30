import { useMemo } from "react";
import { useReadContract } from "wagmi";
import {
  FEED_REGISTRY_CONTRACT,
  MAX_FEED_NAME_LENGTH,
} from "../constants";
import type {
  UseFeedRegistryOptions,
  UseIsFeedRegisteredOptions,
  PrepareRegisterFeedOptions,
  WriteTransactionConfig,
} from "../types";

/**
 * React hook for interacting with the FeedRegistry contract.
 * Provides methods for preparing feed registration transactions.
 *
 * @param options - Registry options
 * @param options.chainId - Chain ID to interact with
 * @returns Object with prepareRegisterFeed, validateFeedName, and contract info
 *
 * @example
 * ```tsx
 * const { prepareRegisterFeed, validateFeedName, contractAddress } = useFeedRegistry({
 *   chainId: 8453,
 * });
 *
 * // Validate feed name
 * const { isValid, error } = validateFeedName("my-feed");
 *
 * // Prepare registration transaction
 * const config = prepareRegisterFeed({
 *   feedName: "my-feed",
 *   description: "My awesome feed",
 * });
 * ```
 */
export function useFeedRegistry({ chainId }: UseFeedRegistryOptions) {
  /**
   * Validates a feed name without making any network calls.
   */
  const validateFeedName = useMemo(
    () => (feedName: string): { isValid: boolean; error?: string } => {
      if (!feedName || feedName.length === 0) {
        return { isValid: false, error: "Feed name cannot be empty" };
      }

      if (feedName.length > MAX_FEED_NAME_LENGTH) {
        return {
          isValid: false,
          error: `Feed name cannot exceed ${MAX_FEED_NAME_LENGTH} characters`,
        };
      }

      return { isValid: true };
    },
    []
  );

  /**
   * Prepares a transaction configuration for registering a new feed.
   */
  const prepareRegisterFeed = useMemo(
    () =>
      (params: PrepareRegisterFeedOptions): WriteTransactionConfig => {
        const { isValid, error } = validateFeedName(params.feedName);
        if (!isValid) {
          throw new Error(error);
        }

        return {
          abi: FEED_REGISTRY_CONTRACT.abi,
          to: FEED_REGISTRY_CONTRACT.address,
          functionName: "registerFeed",
          args: [params.feedName, params.description ?? ""],
        };
      },
    [validateFeedName]
  );

  return {
    prepareRegisterFeed,
    validateFeedName,
    contractAddress: FEED_REGISTRY_CONTRACT.address,
    maxFeedNameLength: MAX_FEED_NAME_LENGTH,
  };
}

/**
 * React hook for checking if a feed name is already registered.
 *
 * @param options - Options for checking feed registration
 * @param options.chainId - Chain ID to query
 * @param options.feedName - The feed name to check
 * @param options.enabled - Whether the query is enabled (default: true)
 * @returns Object with isRegistered, isLoading, and error
 *
 * @example
 * ```tsx
 * const { isRegistered, isLoading } = useIsFeedRegistered({
 *   chainId: 8453,
 *   feedName: "crypto",
 * });
 *
 * if (isLoading) return <span>Checking...</span>;
 * if (isRegistered) return <span>Feed name is taken</span>;
 * return <span>Feed name is available!</span>;
 * ```
 */
export function useIsFeedRegistered({
  chainId,
  feedName,
  enabled = true,
}: UseIsFeedRegisteredOptions) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: FEED_REGISTRY_CONTRACT.address,
    abi: FEED_REGISTRY_CONTRACT.abi,
    functionName: "isFeedRegistered",
    args: [feedName],
    chainId,
    query: {
      enabled: enabled && feedName.length > 0,
    },
  });

  return {
    isRegistered: data as boolean | undefined,
    isLoading,
    error: error as Error | undefined,
    refetch,
  };
}
