/**
 * React hook for fetching ERC20 listings from Bazaar
 */

import { useState, useEffect, useMemo } from "react";
import { PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core/react";
import { BazaarClient } from "../client/BazaarClient";
import { Erc20Listing } from "../types";
import { getErc20BazaarAddress, isBazaarSupportedOnChain } from "../chainConfig";

export interface UseBazaarErc20ListingsOptions {
  /** Chain ID to query */
  chainId: number;
  /** ERC20 token address */
  tokenAddress: `0x${string}`;
  /** Exclude listings from this address */
  excludeMaker?: `0x${string}`;
  /** Only include listings from this address */
  maker?: `0x${string}`;
  /** Maximum number of messages to fetch (default: 200) */
  maxMessages?: number;
  /** Override start index for message range */
  startIndex?: number;
  /** Override end index for message range */
  endIndex?: number;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
  /** Optional viem PublicClient (defaults to wagmi's client for the chain) */
  publicClient?: PublicClient;
}

export interface UseBazaarErc20ListingsResult {
  /** Valid ERC20 listings (sorted by price per token, lowest first) */
  listings: Erc20Listing[];
  /** Whether the data is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | undefined;
  /** Refetch function */
  refetch: () => void;
}

/**
 * React hook for fetching valid ERC20 listings from Bazaar
 *
 * ERC20 listings are available on all supported chains.
 *
 * Returns listings that are:
 * - OPEN status (not filled, cancelled, or expired)
 * - Not expired
 * - Seller has sufficient ERC20 token balance
 *
 * Results are sorted by price per token (lowest first)
 *
 * @example
 * ```tsx
 * const { listings, isLoading, error } = useBazaarErc20Listings({
 *   chainId: 8453,
 *   tokenAddress: "0x...",
 * });
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * const bestListing = listings[0];
 * if (bestListing) {
 *   return (
 *     <div>
 *       Best listing: {bestListing.pricePerToken} {bestListing.currency} per token
 *       (total: {bestListing.price} {bestListing.currency} for {bestListing.tokenAmount.toString()} tokens)
 *     </div>
 *   );
 * }
 * ```
 */
export function useBazaarErc20Listings({
  chainId,
  tokenAddress,
  excludeMaker,
  maker,
  maxMessages = 200,
  startIndex: startIndexOverride,
  endIndex: endIndexOverride,
  enabled = true,
  publicClient,
}: UseBazaarErc20ListingsOptions): UseBazaarErc20ListingsResult {
  const wagmiClient = usePublicClient({ chainId });
  const resolvedClient = (publicClient ?? wagmiClient) as PublicClient | undefined;

  const [listings, setListings] = useState<Erc20Listing[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<Error | undefined>();
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const hasRangeOverride = startIndexOverride != null && endIndexOverride != null;

  // Check if chain is supported
  const isSupported = useMemo(
    () => isBazaarSupportedOnChain(chainId),
    [chainId]
  );

  // Get ERC20 bazaar address for the chain (available on all chains)
  const erc20BazaarAddress = useMemo(
    () => (isSupported ? getErc20BazaarAddress(chainId) : undefined),
    [chainId, isSupported]
  );

  // Build filter
  const filter = useMemo(
    () => ({
      appAddress: erc20BazaarAddress as `0x${string}`,
      topic: tokenAddress.toLowerCase(),
      maker,
    }),
    [erc20BazaarAddress, tokenAddress, maker]
  );

  // Get message count (skip when range overrides are provided)
  const { count: totalCount, isLoading: isLoadingCount } = useNetMessageCount({
    chainId,
    filter,
    enabled: enabled && isSupported && !hasRangeOverride,
  });

  // Calculate range
  const startIndex = hasRangeOverride
    ? startIndexOverride!
    : Math.max(0, totalCount - maxMessages);
  const endIndex = hasRangeOverride ? endIndexOverride! : totalCount;

  // Get messages
  const {
    messages,
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages,
  } = useNetMessages({
    chainId,
    filter,
    startIndex,
    endIndex,
    enabled: enabled && isSupported && (hasRangeOverride || totalCount > 0),
  });

  const TAG = `[useBazaarErc20Listings chain=${chainId} token=${tokenAddress.slice(0, 10)}]`;

  // Log pipeline state changes
  useEffect(() => {
    console.log(TAG, {
      enabled,
      isSupported,
      hasRangeOverride,
      totalCount,
      isLoadingCount,
      startIndex,
      endIndex,
      messagesLength: messages?.length ?? 0,
      isLoadingMessages,
      messagesError: messagesError?.message,
    });
  }, [enabled, isSupported, hasRangeOverride, totalCount, isLoadingCount, startIndex, endIndex, messages?.length, isLoadingMessages, messagesError]);

  // Process listings when messages change
  useEffect(() => {
    if (!isSupported || !enabled) {
      setListings([]);
      return;
    }

    if (!messages || messages.length === 0) {
      setListings([]);
      return;
    }

    let cancelled = false;

    async function processListings() {
      setIsProcessing(true);
      setProcessingError(undefined);
      console.log(TAG, `processing ${messages.length} messages...`);

      try {
        const client = new BazaarClient({ chainId, publicClient: resolvedClient });
        const validListings = await client.processErc20ListingsFromMessages(
          messages,
          { tokenAddress, excludeMaker }
        );
        console.log(TAG, `processed → ${validListings.length} valid listings`);

        if (!cancelled) {
          setListings(validListings);
        }
      } catch (err) {
        console.error(TAG, "processing error:", err);
        if (!cancelled) {
          setProcessingError(err instanceof Error ? err : new Error(String(err)));
          setListings([]);
        }
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
        }
      }
    }

    processListings();

    return () => {
      cancelled = true;
    };
  }, [chainId, tokenAddress, excludeMaker, messages, isSupported, enabled, refetchTrigger]);

  const refetch = () => {
    refetchMessages();
    setRefetchTrigger((t) => t + 1);
  };

  return {
    listings,
    isLoading: (hasRangeOverride ? false : isLoadingCount) || isLoadingMessages || isProcessing,
    error: messagesError || processingError,
    refetch,
  };
}
