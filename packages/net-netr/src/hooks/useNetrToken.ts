import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { NETR_TOKEN_ABI, ZERO_ADDRESS } from "../constants";
import type { NetrTokenMetadata, UseNetrTokenOptions } from "../types";

export function useNetrToken({
  chainId,
  tokenAddress,
  enabled = true,
}: UseNetrTokenOptions): {
  data: NetrTokenMetadata | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const targetAddress = tokenAddress ?? ZERO_ADDRESS;

  const contracts = useMemo(
    () =>
      [
        { address: targetAddress, abi: NETR_TOKEN_ABI, functionName: "name", chainId },
        { address: targetAddress, abi: NETR_TOKEN_ABI, functionName: "symbol", chainId },
        { address: targetAddress, abi: NETR_TOKEN_ABI, functionName: "deployer", chainId },
        { address: targetAddress, abi: NETR_TOKEN_ABI, functionName: "image", chainId },
        { address: targetAddress, abi: NETR_TOKEN_ABI, functionName: "animation", chainId },
        { address: targetAddress, abi: NETR_TOKEN_ABI, functionName: "fid", chainId },
        { address: targetAddress, abi: NETR_TOKEN_ABI, functionName: "totalSupply", chainId },
        { address: targetAddress, abi: NETR_TOKEN_ABI, functionName: "decimals", chainId },
        { address: targetAddress, abi: NETR_TOKEN_ABI, functionName: "extraStringData", chainId },
      ] as const,
    [targetAddress, chainId]
  );

  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: { enabled: enabled && !!tokenAddress },
  });

  const tokenMetadata = useMemo<NetrTokenMetadata | undefined>(() => {
    if (!data || data.length < 9) return undefined;
    if (!data.every((result) => result.status === "success")) return undefined;

    return {
      name: data[0].result as string,
      symbol: data[1].result as string,
      deployer: data[2].result as `0x${string}`,
      image: data[3].result as string,
      animation: data[4].result as string,
      fid: data[5].result as bigint,
      totalSupply: data[6].result as bigint,
      decimals: data[7].result as number,
      extraStringData: data[8].result as string,
    };
  }, [data]);

  return {
    data: tokenMetadata,
    isLoading,
    error: error as Error | undefined,
  };
}
