import { useReadContract } from "wagmi";
import { useMemo } from "react";
import { getNetMessageCountReadConfig } from "../client/messages";
import { UseNetMessageCountOptions } from "../types";

export function useNetMessageCount(params: UseNetMessageCountOptions) {
  const readContractArgs = useMemo(
    () => getNetMessageCountReadConfig({
      chainId: params.chainId,
      filter: params.filter,
    }),
    [params.chainId, params.filter]
  );

  const { data, isLoading, error } = useReadContract({
    ...readContractArgs,
    query: {
      refetchInterval: params.refetchInterval,
      enabled: params.enabled,
    },
  });

  return {
    count: data ? Number(data) : 0,
    isLoading,
    error: error as Error | undefined,
  };
}

