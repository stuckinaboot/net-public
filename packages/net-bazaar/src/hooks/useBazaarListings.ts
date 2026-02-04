/**
 * React hook for fetching NFT listings from Bazaar
 */

import { useState, useEffect, useMemo } from "react";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core/react";
import { BazaarClient } from "../client/BazaarClient";
import { Listing, SeaportOrderStatus } from "../types";
import { getBazaarAddress, isBazaarSupportedOnChain } from "../chainConfig";

export interface UseBazaarListingsOptions {
  /** Chain ID to query */
  chainId: number;
  /** NFT collection address */
  nftAddress: `0x${string}`;
  /** Exclude listings from this address */
  excludeMaker?: `0x${string}`;
  /** Maximum number of messages to fetch (default: 200) */
  maxMessages?: number;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

export interface UseBazaarListingsResult {
  /** Valid listings (deduplicated, sorted by price) */
  listings: Listing[];
  /** Whether the data is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | undefined;
  /** Refetch function */
  refetch: () => void;
}

/**
 * React hook for fetching valid NFT listings from Bazaar
 *
 * Returns listings that are:
 * - OPEN status (not filled, cancelled, or expired)
 * - Not expired
 * - Seller still owns the NFT
 *
 * Results are deduplicated (one per token) and sorted by price (lowest first)
 *
 * @example
 * ```tsx
 * const { listings, isLoading, error } = useBazaarListings({
 *   chainId: 8453,
 *   nftAddress: "0x...",
 *   maxMessages: 100,
 * });
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * return (
 *   <ul>
 *     {listings.map((listing) => (
 *       <li key={listing.orderHash}>
 *         Token #{listing.tokenId} - {listing.price} {listing.currency}
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useBazaarListings({
  chainId,
  nftAddress,
  excludeMaker,
  maxMessages = 200,
  enabled = true,
}: UseBazaarListingsOptions): UseBazaarListingsResult {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<Error | undefined>();
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Check if chain is supported
  const isSupported = useMemo(
    () => isBazaarSupportedOnChain(chainId),
    [chainId]
  );

  // Get bazaar address for the chain
  const bazaarAddress = useMemo(
    () => (isSupported ? getBazaarAddress(chainId) : undefined),
    [chainId, isSupported]
  );

  // Build filter
  const filter = useMemo(
    () => ({
      appAddress: bazaarAddress as `0x${string}`,
      topic: nftAddress.toLowerCase(),
    }),
    [bazaarAddress, nftAddress]
  );

  // Get message count
  const { count: totalCount, isLoading: isLoadingCount } = useNetMessageCount({
    chainId,
    filter,
    enabled: enabled && isSupported,
  });

  // Calculate range
  const startIndex = useMemo(
    () => Math.max(0, totalCount - maxMessages),
    [totalCount, maxMessages]
  );

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
    endIndex: totalCount,
    enabled: enabled && isSupported && totalCount > 0,
  });

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

      try {
        const client = new BazaarClient({ chainId });
        const validListings = await client.getListings({
          nftAddress,
          excludeMaker,
          maxMessages,
        });

        if (!cancelled) {
          setListings(validListings);
        }
      } catch (err) {
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
  }, [chainId, nftAddress, excludeMaker, maxMessages, messages, isSupported, enabled, refetchTrigger]);

  const refetch = () => {
    refetchMessages();
    setRefetchTrigger((t) => t + 1);
  };

  return {
    listings,
    isLoading: isLoadingCount || isLoadingMessages || isProcessing,
    error: messagesError || processingError,
    refetch,
  };
}
