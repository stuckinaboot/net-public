import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReadContract, useReadContracts, usePublicClient } from "wagmi";
import { readContract, multicall } from "viem/actions";
import type { Abi, PublicClient } from "viem";
import { getPublicClient, getChainRpcUrls } from "../chainConfig";

/**
 * Hybrid contract-read primitives that work for any chain the SDK supports —
 * even chains that aren't in the consumer's wagmi config.
 *
 * wagmi's useReadContract/useReadContracts read through the WagmiProvider's
 * config, so they return nothing for a chain that isn't listed there (e.g. a
 * testnet deliberately kept out of the wallet/network picker). These wrappers
 * keep the wagmi path for configured chains (unchanged behavior, shared cache)
 * and transparently fall back to the SDK's standalone client (getPublicClient)
 * for chains that are SDK-supported but absent from the wagmi config — the same
 * approach useNetMessagesBatchAsync already takes.
 *
 * They're drop-in replacements: swap `import { useReadContract } from "wagmi"`
 * for `import { useNetReadContract } from "@net-protocol/core/react"`.
 */

export interface NetReadContractConfig {
  address?: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  chainId?: number;
  query?: { enabled?: boolean; refetchInterval?: number };
}

export interface NetContractCall {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  chainId?: number;
}

export interface NetReadContractResult<T = unknown> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

// Stable, bigint-safe serialization for effect dependency keys.
function serializeArgs(args?: readonly unknown[]): string {
  return JSON.stringify(args ?? [], (_key, value) =>
    typeof value === "bigint" ? `${value.toString()}n` : value
  );
}

// True when the chain isn't in the wagmi config but the SDK can read it directly.
// Always calls usePublicClient (no conditional hooks); the arg just varies.
function useStandaloneStrategy(chainId?: number): boolean {
  const wagmiClient = usePublicClient(chainId != null ? { chainId } : undefined);
  return (
    !wagmiClient && chainId != null && getChainRpcUrls({ chainId }).length > 0
  );
}

// Standalone read via the SDK's own client. useEffect/useState (not react-query)
// so the primitive carries no provider requirement beyond wagmi itself.
function useStandaloneReader<T>(params: {
  enabled: boolean;
  chainId?: number;
  cacheKey: string;
  refetchInterval?: number;
  fetcher: (client: PublicClient) => Promise<T>;
}): NetReadContractResult<T> {
  const { enabled, chainId, cacheKey, refetchInterval, fetcher } = params;
  const active = enabled && chainId != null;

  // Latest fetcher captured by ref so the effect can depend on cacheKey (stable)
  // rather than the closure identity (new every render).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [nonce, setNonce] = useState(0);
  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!active) {
      setData(undefined);
      setIsLoading(false);
      setError(undefined);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const client = getPublicClient({ chainId: chainId as number });
        const result = await fetcherRef.current(client);
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) {
          setData(undefined);
          setError(e as Error);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    const timer = refetchInterval ? setInterval(run, refetchInterval) : undefined;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [active, chainId, cacheKey, refetchInterval, nonce]);

  return { data, isLoading: active && isLoading, error, refetch };
}

export function useNetReadContract(
  config: NetReadContractConfig
): NetReadContractResult {
  const { address, abi, functionName, args, chainId, query } = config;
  const enabled = query?.enabled ?? true;
  const refetchInterval = query?.refetchInterval;
  const useStandalone = useStandaloneStrategy(chainId);

  const wagmi = useReadContract({
    address,
    abi,
    functionName,
    args: args as unknown[] | undefined,
    chainId,
    query: { enabled: enabled && !useStandalone, refetchInterval },
  });

  const cacheKey = useMemo(
    () => `${chainId}:${address}:${functionName}:${serializeArgs(args)}`,
    [chainId, address, functionName, args]
  );

  const standalone = useStandaloneReader({
    enabled: enabled && useStandalone,
    chainId,
    cacheKey,
    refetchInterval,
    fetcher: (client) =>
      readContract(client, {
        address: address as `0x${string}`,
        abi,
        functionName,
        args: args as unknown[],
      }),
  });

  if (useStandalone) return standalone;
  return {
    data: wagmi.data,
    isLoading: wagmi.isLoading,
    error: wagmi.error as Error | undefined,
    refetch: wagmi.refetch,
  };
}

export function useNetReadContracts<T = unknown[]>(config: {
  contracts: readonly NetContractCall[];
  allowFailure?: boolean;
  query?: { enabled?: boolean; refetchInterval?: number };
}): NetReadContractResult<T> {
  const { contracts, allowFailure = true, query } = config;
  const enabled = query?.enabled ?? true;
  const refetchInterval = query?.refetchInterval;

  // Standalone multicall reads a single chain. If the batch spans chains
  // (not a pattern in practice), stay on wagmi.
  const chainId = contracts[0]?.chainId;
  const sameChain = contracts.every((c) => c.chainId === chainId);
  const useStandalone = useStandaloneStrategy(sameChain ? chainId : undefined);

  const wagmi = useReadContracts({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts: contracts as any,
    allowFailure,
    query: { enabled: enabled && !useStandalone, refetchInterval },
  });

  const cacheKey = useMemo(
    () =>
      `${chainId}:${allowFailure}:${contracts
        .map((c) => `${c.address}:${c.functionName}:${serializeArgs(c.args)}`)
        .join("|")}`,
    [chainId, allowFailure, contracts]
  );

  const standalone = useStandaloneReader<T>({
    enabled: enabled && useStandalone,
    chainId,
    cacheKey,
    refetchInterval,
    fetcher: (client) =>
      multicall(client, {
        allowFailure,
        contracts: contracts.map((c) => ({
          address: c.address,
          abi: c.abi,
          functionName: c.functionName,
          args: c.args as unknown[],
        })),
      }) as Promise<T>,
  });

  if (useStandalone) return standalone;
  return {
    data: wagmi.data as T | undefined,
    isLoading: wagmi.isLoading,
    error: wagmi.error as Error | undefined,
    refetch: wagmi.refetch,
  };
}
