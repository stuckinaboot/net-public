import { useQuery, skipToken } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { discoverPools } from "../utils/poolDiscovery";
import type { UseDiscoverPoolsOptions } from "../types";

export function useDiscoverPools({
  chainId,
  pairs,
  enabled = true,
}: UseDiscoverPoolsOptions) {
  const publicClient = usePublicClient({ chainId });
  const canRun = enabled && !!publicClient && pairs.length > 0;

  // Normalize addresses in the queryKey so case drift doesn't fragment the cache.
  // discoverPools itself is already case-insensitive internally.
  const keyPairs = pairs.map((p) => [
    p.tokenAddress.toLowerCase(),
    p.baseTokenAddress?.toLowerCase(),
  ]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["discoverPools", chainId, keyPairs],
    queryFn: canRun
      ? () => discoverPools({ publicClient, pairs, chainId })
      : skipToken,
  });

  return {
    pools: data ?? [],
    isLoading,
    error,
    refetch,
  };
}
