import { useMemo } from "react";
import { getNetMessageCountReadConfig } from "../client/messages";
import { useNetReadContract } from "./useNetReadContract";
import { UseNetMessageCountOptions } from "../types";

export function useNetMessageCount(params: UseNetMessageCountOptions) {
  const { chainId, filter, refetchInterval } = params;
  const enabled = params.enabled ?? true;

  const readContractArgs = useMemo(
    () => getNetMessageCountReadConfig({ chainId, filter }),
    [chainId, filter]
  );

  // useNetReadContract reads via wagmi for configured chains and via the SDK's
  // standalone client for SDK-supported chains absent from the wagmi config.
  const { data, isLoading, error, refetch } = useNetReadContract({
    ...readContractArgs,
    query: { enabled, refetchInterval },
  });

  return {
    count: data ? Number(data) : 0,
    isLoading,
    error: error as Error | undefined,
    refetch,
  };
}
