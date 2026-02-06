/**
 * React hook for fetching recent sales from Bazaar
 */

import { useState, useEffect, useMemo } from "react";
import { PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core/react";
import { BazaarClient } from "../client/BazaarClient";
import { Sale } from "../types";
import { NET_SEAPORT_ZONE_ADDRESS, isBazaarSupportedOnChain } from "../chainConfig";

export interface UseBazaarSalesOptions {
  /** Chain ID to query */
  chainId: number;
  /** NFT collection address */
  nftAddress: `0x${string}`;
  /** Maximum number of messages to fetch (default: 100) */
  maxMessages?: number;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

export interface UseBazaarSalesResult {
  /** Recent sales (sorted by timestamp, most recent first) */
  sales: Sale[];
  /** Whether the data is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | undefined;
  /** Refetch function */
  refetch: () => void;
}

/**
 * React hook for fetching recent sales from Bazaar
 *
 * Sales data flows differently from listings/offers:
 * - Net messages (appAddress=zone, topic=nftAddress) contain order hashes
 * - Actual sale data is fetched from the bulk storage contract
 *
 * Results are sorted by timestamp (most recent first)
 *
 * @example
 * ```tsx
 * const { sales, isLoading, error } = useBazaarSales({
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
 *     {sales.map((sale) => (
 *       <li key={sale.orderHash}>
 *         Token #{sale.tokenId} - {sale.price} {sale.currency}
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useBazaarSales({
  chainId,
  nftAddress,
  maxMessages = 100,
  enabled = true,
}: UseBazaarSalesOptions): UseBazaarSalesResult {
  const wagmiClient = usePublicClient({ chainId });

  const [sales, setSales] = useState<Sale[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<Error | undefined>();
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Check if chain is supported
  const isSupported = useMemo(
    () => isBazaarSupportedOnChain(chainId),
    [chainId]
  );

  // Build filter: appAddress = zone contract, topic = nft address
  const filter = useMemo(
    () => ({
      appAddress: NET_SEAPORT_ZONE_ADDRESS as `0x${string}`,
      topic: nftAddress.toLowerCase(),
    }),
    [nftAddress]
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

  const TAG = `[useBazaarSales chain=${chainId} nft=${nftAddress.slice(0, 10)}]`;

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

  // Process sales when messages change
  useEffect(() => {
    if (!isSupported || !enabled) {
      setSales([]);
      return;
    }

    if (!messages || messages.length === 0) {
      setSales([]);
      return;
    }

    let cancelled = false;

    async function processSales() {
      setIsProcessing(true);
      setProcessingError(undefined);
      console.log(TAG, `processing ${messages.length} messages...`);

      try {
        const client = new BazaarClient({ chainId, publicClient: wagmiClient as PublicClient });
        const parsedSales = await client.processSalesFromMessages(
          messages,
          { nftAddress }
        );
        console.log(TAG, `processed → ${parsedSales.length} sales`);

        if (!cancelled) {
          setSales(parsedSales);
        }
      } catch (err) {
        console.error(TAG, "processing error:", err);
        if (!cancelled) {
          setProcessingError(err instanceof Error ? err : new Error(String(err)));
          setSales([]);
        }
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
        }
      }
    }

    processSales();

    return () => {
      cancelled = true;
    };
  }, [chainId, nftAddress, messages, isSupported, enabled, refetchTrigger]);

  const refetch = () => {
    refetchMessages();
    setRefetchTrigger((t) => t + 1);
  };

  return {
    sales,
    isLoading: isLoadingCount || isLoadingMessages || isProcessing,
    error: messagesError || processingError,
    refetch,
  };
}
