/**
 * React hook for fetching NFT listings from Bazaar
 */

import { useState, useEffect, useMemo } from "react";
import { PublicClient } from "viem";
import { usePublicClient } from "wagmi";
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
  /** Only include listings from this address */
  maker?: `0x${string}`;
  /** Maximum number of messages to fetch (default: 200) */
  maxMessages?: number;
  /** Override start index for message range */
  startIndex?: number;
  /** Override end index for message range */
  endIndex?: number;
  /** Include expired listings in results (default: false) */
  includeExpired?: boolean;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
  /** Optional viem PublicClient (defaults to wagmi's client for the chain) */
  publicClient?: PublicClient;
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
  maker,
  maxMessages = 200,
  startIndex: startIndexOverride,
  endIndex: endIndexOverride,
  includeExpired = false,
  enabled = true,
  publicClient,
}: UseBazaarListingsOptions): UseBazaarListingsResult {
  const wagmiClient = usePublicClient({ chainId });
  const resolvedClient = (publicClient ?? wagmiClient) as PublicClient | undefined;

  const [listings, setListings] = useState<Listing[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<Error | undefined>();
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const hasRangeOverride = startIndexOverride != null && endIndexOverride != null;

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
      maker,
    }),
    [bazaarAddress, nftAddress, maker]
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

  const TAG = `[useBazaarListings chain=${chainId} nft=${nftAddress.slice(0, 10)}]`;

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
        const validListings = await client.processListingsFromMessages(
          messages,
          { nftAddress, excludeMaker, includeExpired }
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
  }, [chainId, nftAddress, excludeMaker, includeExpired, messages, isSupported, enabled, refetchTrigger]);

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
