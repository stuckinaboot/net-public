/**
 * React hook for fetching collection offers from Bazaar
 */

import { useState, useEffect, useMemo } from "react";
import { PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core/react";
import { BazaarClient } from "../client/BazaarClient";
import { CollectionOffer } from "../types";
import { getCollectionOffersAddress, isBazaarSupportedOnChain } from "../chainConfig";

export interface UseBazaarCollectionOffersOptions {
  /** Chain ID to query */
  chainId: number;
  /** NFT collection address (optional - if omitted, fetches recent offers across all collections) */
  nftAddress?: `0x${string}`;
  /** Exclude offers from this address */
  excludeMaker?: `0x${string}`;
  /** Maximum number of messages to fetch (default: 100) */
  maxMessages?: number;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

export interface UseBazaarCollectionOffersResult {
  /** Valid collection offers (sorted by price, highest first) */
  offers: CollectionOffer[];
  /** Whether the data is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | undefined;
  /** Refetch function */
  refetch: () => void;
}

/**
 * React hook for fetching valid collection offers from Bazaar
 *
 * Returns offers that are:
 * - OPEN status (not filled, cancelled, or expired)
 * - Not expired
 * - Buyer has sufficient WETH balance
 *
 * Results are sorted by price (highest first)
 *
 * @example
 * ```tsx
 * const { offers, isLoading, error } = useBazaarCollectionOffers({
 *   chainId: 8453,
 *   nftAddress: "0x...",
 * });
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * const bestOffer = offers[0];
 * if (bestOffer) {
 *   return <div>Best offer: {bestOffer.price} {bestOffer.currency}</div>;
 * }
 * ```
 */
export function useBazaarCollectionOffers({
  chainId,
  nftAddress,
  excludeMaker,
  maxMessages = 100,
  enabled = true,
}: UseBazaarCollectionOffersOptions): UseBazaarCollectionOffersResult {
  const wagmiClient = usePublicClient({ chainId });

  const [offers, setOffers] = useState<CollectionOffer[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<Error | undefined>();
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Check if chain is supported
  const isSupported = useMemo(
    () => isBazaarSupportedOnChain(chainId),
    [chainId]
  );

  // Get collection offers address for the chain
  const collectionOffersAddress = useMemo(
    () => (isSupported ? getCollectionOffersAddress(chainId) : undefined),
    [chainId, isSupported]
  );

  // Build filter
  const filter = useMemo(
    () => ({
      appAddress: collectionOffersAddress as `0x${string}`,
      topic: nftAddress?.toLowerCase(),
    }),
    [collectionOffersAddress, nftAddress]
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

  const TAG = `[useBazaarCollectionOffers chain=${chainId}${nftAddress ? ` nft=${nftAddress.slice(0, 10)}` : ""}]`;

  // Log pipeline state changes
  useEffect(() => {
    console.log(TAG, {
      enabled,
      isSupported,
      totalCount,
      isLoadingCount,
      startIndex,
      endIndex: totalCount,
      messagesLength: messages?.length ?? 0,
      isLoadingMessages,
      messagesError: messagesError?.message,
    });
  }, [enabled, isSupported, totalCount, isLoadingCount, startIndex, messages?.length, isLoadingMessages, messagesError]);

  // Process offers when messages change
  useEffect(() => {
    if (!isSupported || !enabled) {
      setOffers([]);
      return;
    }

    if (!messages || messages.length === 0) {
      setOffers([]);
      return;
    }

    let cancelled = false;

    async function processOffers() {
      setIsProcessing(true);
      setProcessingError(undefined);
      console.log(TAG, `processing ${messages.length} messages...`);

      try {
        const client = new BazaarClient({ chainId, publicClient: wagmiClient as PublicClient });
        const validOffers = await client.processCollectionOffersFromMessages(
          messages,
          { nftAddress, excludeMaker }
        );
        console.log(TAG, `processed → ${validOffers.length} valid offers`);

        if (!cancelled) {
          setOffers(validOffers);
        }
      } catch (err) {
        console.error(TAG, "processing error:", err);
        if (!cancelled) {
          setProcessingError(err instanceof Error ? err : new Error(String(err)));
          setOffers([]);
        }
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
        }
      }
    }

    processOffers();

    return () => {
      cancelled = true;
    };
  }, [chainId, nftAddress, excludeMaker, messages, isSupported, enabled, refetchTrigger]);

  const refetch = () => {
    refetchMessages();
    setRefetchTrigger((t) => t + 1);
  };

  return {
    offers,
    isLoading: isLoadingCount || isLoadingMessages || isProcessing,
    error: messagesError || processingError,
    refetch,
  };
}
