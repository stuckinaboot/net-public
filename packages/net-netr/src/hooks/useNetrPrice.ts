import { useEffect, useMemo, useState } from "react";
import { createPublicClient, defineChain, http } from "viem";
import { readContract } from "viem/actions";
import { useReadContract } from "wagmi";
import { getChainRpcUrls, getNetContract } from "@net-protocol/core";
import { STORAGE_CONTRACT } from "@net-protocol/storage";
import { getNetrChainConfig, getNetrContract } from "../chainConfig";
import { UNISWAP_V3_POOL_ABI } from "../constants";
import type { NetrPriceData, UseNetrPriceOptions } from "../types";
import { addressToBytes32 } from "../utils/addressUtils";
import { calculatePriceFromSqrtPriceX96 } from "../utils/priceUtils";
import { decodeBangerStorageData, extractAddressesFromMessageData } from "../utils/storageDecoding";

const DEFAULT_REFRESH_INTERVAL = 5000;

export function useNetrPrice({
  chainId,
  tokenAddress,
  enabled = true,
  refreshInterval = DEFAULT_REFRESH_INTERVAL,
}: UseNetrPriceOptions): {
  data: NetrPriceData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  poolAddress: `0x${string}` | undefined;
} {
  const [priceData, setPriceData] = useState<NetrPriceData | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [poolAddress, setPoolAddress] = useState<`0x${string}` | undefined>();

  const storageKey = useMemo(
    () => (tokenAddress ? addressToBytes32(tokenAddress) : undefined),
    [tokenAddress]
  );

  const netrContract = useMemo(() => {
    try {
      return getNetrContract(chainId);
    } catch {
      return undefined;
    }
  }, [chainId]);

  const { data: storageResult, isLoading: storageLoading } = useReadContract({
    address: STORAGE_CONTRACT.address,
    abi: STORAGE_CONTRACT.abi,
    functionName: "get",
    args: storageKey && netrContract ? [storageKey, netrContract.address] : undefined,
    chainId,
    query: { enabled: enabled && !!tokenAddress && !!netrContract },
  });

  const messageIndex = useMemo(() => {
    if (!storageResult) return undefined;
    const [, storageValue] = storageResult as [string, string];
    return decodeBangerStorageData(storageValue)?.messageIndex;
  }, [storageResult]);

  const netContract = useMemo(() => {
    try {
      return getNetContract(chainId);
    } catch {
      return undefined;
    }
  }, [chainId]);

  const { data: messageResult, isLoading: messageLoading } = useReadContract({
    address: netContract?.address,
    abi: netContract?.abi ?? [],
    functionName: "getMessage",
    args: messageIndex !== undefined ? [messageIndex.toString()] : undefined,
    chainId,
    query: { enabled: enabled && messageIndex !== undefined && !!netContract },
  });

  useEffect(() => {
    if (!messageResult) {
      setPoolAddress(undefined);
      return;
    }

    const message = messageResult as { data: string } | undefined;
    if (message?.data) {
      const { poolAddress: extracted } = extractAddressesFromMessageData(message.data);
      setPoolAddress(extracted);
    }
  }, [messageResult]);

  useEffect(() => {
    if (!poolAddress || !enabled) {
      setIsLoading(false);
      return;
    }

    async function fetchPrice() {
      try {
        const rpcUrls = getChainRpcUrls({ chainId });
        if (rpcUrls.length === 0) {
          throw new Error(`No RPC URLs available for chain ID: ${chainId}`);
        }

        const chainConfig = getNetrChainConfig(chainId);
        const client = createPublicClient({
          chain: defineChain({
            id: chainId,
            name: chainConfig?.name || `Chain ${chainId}`,
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: {
              default: { http: rpcUrls },
              public: { http: rpcUrls },
            },
          }),
          transport: http(rpcUrls[0]),
        });

        const slot0 = (await readContract(client, {
          address: poolAddress!,
          abi: UNISWAP_V3_POOL_ABI,
          functionName: "slot0",
        })) as [bigint, number, number, number, number, number, boolean];

        setPriceData(calculatePriceFromSqrtPriceX96(slot0[0], slot0[1]));
        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch price"));
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrice();
    const intervalId = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(intervalId);
  }, [poolAddress, chainId, enabled, refreshInterval]);

  return {
    data: priceData,
    isLoading: storageLoading || messageLoading || isLoading,
    error,
    poolAddress,
  };
}
