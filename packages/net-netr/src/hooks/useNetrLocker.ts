import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { LP_LOCKER_ABI, ZERO_ADDRESS } from "../constants";
import type { NetrLockerData, UseNetrLockerOptions } from "../types";

export function useNetrLocker({
  chainId,
  lockerAddress,
  enabled = true,
}: UseNetrLockerOptions): {
  data: NetrLockerData | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const targetAddress = lockerAddress ?? ZERO_ADDRESS;

  const contracts = useMemo(
    () =>
      [
        { address: targetAddress, abi: LP_LOCKER_ABI, functionName: "owner", chainId },
        { address: targetAddress, abi: LP_LOCKER_ABI, functionName: "duration", chainId },
        { address: targetAddress, abi: LP_LOCKER_ABI, functionName: "end", chainId },
        { address: targetAddress, abi: LP_LOCKER_ABI, functionName: "version", chainId },
      ] as const,
    [targetAddress, chainId]
  );

  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: { enabled: enabled && !!lockerAddress },
  });

  const lockerData = useMemo<NetrLockerData | undefined>(() => {
    if (!data || data.length < 4) return undefined;
    if (!data.every((result) => result.status === "success")) return undefined;

    return {
      owner: data[0].result as `0x${string}`,
      duration: data[1].result as bigint,
      endTimestamp: data[2].result as bigint,
      version: data[3].result as string,
    };
  }, [data]);

  return {
    data: lockerData,
    isLoading,
    error: error as Error | undefined,
  };
}
