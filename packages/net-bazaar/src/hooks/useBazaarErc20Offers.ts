/**
 * React hook for fetching ERC20 offers from Bazaar
 */

import { useState, useEffect, useMemo } from "react";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core/react";
import { BazaarClient } from "../client/BazaarClient";
import { Erc20Offer } from "../types";
import { getErc20OffersAddress, isBazaarSupportedOnChain } from "../chainConfig";

export interface UseBazaarErc20OffersOptions {
  /** Chain ID to query */
  chainId: number;
  /** ERC20 token address */
  tokenAddress: `0x${string}`;
  /** Exclude offers from this address */
  excludeMaker?: `0x${string}`;
  /** Maximum number of messages to fetch (default: 200) */
  maxMessages?: number;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

export interface UseBazaarErc20OffersResult {
  /** Valid ERC20 offers (sorted by price per token, highest first) */
  offers: Erc20Offer[];
  /** Whether the data is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | undefined;
  /** Refetch function */
  refetch: () => void;
}

/**
 * React hook for fetching valid ERC20 offers from Bazaar
 *
 * ERC20 offers are only available on Base (8453) and HyperEVM (999).
 *
 * Returns offers that are:
 * - OPEN status (not filled, cancelled, or expired)
 * - Not expired
 * - Buyer has sufficient WETH balance
 *
 * Results are sorted by price per token (highest first)
 *
 * @example
 * ```tsx
 * const { offers, isLoading, error } = useBazaarErc20Offers({
 *   chainId: 8453,
 *   tokenAddress: "0x...",
 * });
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * const bestOffer = offers[0];
 * if (bestOffer) {
 *   return (
 *     <div>
 *       Best offer: {bestOffer.pricePerToken} {bestOffer.currency} per token
 *       (total: {bestOffer.price} {bestOffer.currency} for {bestOffer.tokenAmount.toString()} tokens)
 *     </div>
 *   );
 * }
 * ```
 */
export function useBazaarErc20Offers({
  chainId,
  tokenAddress,
  excludeMaker,
  maxMessages = 200,
  enabled = true,
}: UseBazaarErc20OffersOptions): UseBazaarErc20OffersResult {
  const [offers, setOffers] = useState<Erc20Offer[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<Error | undefined>();
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Check if chain is supported and has ERC20 offers
  const isSupported = useMemo(
    () => isBazaarSupportedOnChain(chainId),
    [chainId]
  );

  // Get ERC20 offers address for the chain (only Base and HyperEVM)
  const erc20OffersAddress = useMemo(
    () => (isSupported ? getErc20OffersAddress(chainId) : undefined),
    [chainId, isSupported]
  );

  // ERC20 offers only available on chains with the contract deployed
  const hasErc20Offers = Boolean(erc20OffersAddress);

  // Build filter
  const filter = useMemo(
    () => ({
      appAddress: erc20OffersAddress as `0x${string}`,
      topic: tokenAddress.toLowerCase(),
    }),
    [erc20OffersAddress, tokenAddress]
  );

  // Get message count
  const { count: totalCount, isLoading: isLoadingCount } = useNetMessageCount({
    chainId,
    filter,
    enabled: enabled && hasErc20Offers,
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
    enabled: enabled && hasErc20Offers && totalCount > 0,
  });

  // Process offers when messages change
  useEffect(() => {
    if (!hasErc20Offers || !enabled) {
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

      try {
        const client = new BazaarClient({ chainId });
        const validOffers = await client.getErc20Offers({
          tokenAddress,
          excludeMaker,
          maxMessages,
        });

        if (!cancelled) {
          setOffers(validOffers);
        }
      } catch (err) {
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
  }, [chainId, tokenAddress, excludeMaker, maxMessages, messages, hasErc20Offers, enabled, refetchTrigger]);

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
