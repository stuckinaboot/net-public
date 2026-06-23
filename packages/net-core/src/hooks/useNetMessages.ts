import { useMemo } from "react";
import { getNetMessagesReadConfig } from "../client/messages";
import { useNetReadContract } from "./useNetReadContract";
import { UseNetMessagesOptions, NetMessage } from "../types";

export function useNetMessages(params: UseNetMessagesOptions) {
  const { chainId, filter, startIndex, endIndex } = params;
  const enabled = params.enabled ?? true;

  const readContractArgs = useMemo(
    () =>
      getNetMessagesReadConfig({
        chainId,
        filter,
        startIndex,
        endIndex,
      }),
    [chainId, filter, startIndex, endIndex]
  );

  // useNetReadContract reads via wagmi for configured chains and via the SDK's
  // standalone client for SDK-supported chains absent from the wagmi config.
  const { data, isLoading, error, refetch } = useNetReadContract({
    ...readContractArgs,
    query: { enabled },
  });

  const messages = useMemo(() => (data as NetMessage[]) ?? [], [data]);

  return {
    messages,
    isLoading,
    error: error as Error | undefined,
    refetch,
  };
}
