import { useReadContract } from "wagmi";
import { useMemo } from "react";
import { getNetMessagesReadConfig } from "../client/messages";
import { UseNetMessagesOptions, NetMessage } from "../types";

export function useNetMessages(params: UseNetMessagesOptions) {
  const readContractArgs = useMemo(
    () =>
      getNetMessagesReadConfig({
        chainId: params.chainId,
        filter: params.filter,
        startIndex: params.startIndex,
        endIndex: params.endIndex,
      }),
    [params.chainId, params.filter, params.startIndex, params.endIndex]
  );

  const { data, isLoading, error, refetch } = useReadContract({
    ...readContractArgs,
    query: {
      enabled: params.enabled,
    },
  });

  const messages = useMemo(() => {
    return (data as NetMessage[]) ?? [];
  }, [data]);

  return {
    messages,
    isLoading,
    error: error as Error | undefined,
    refetch,
  };
}
