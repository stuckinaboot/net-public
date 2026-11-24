import { useInfiniteQuery } from "@tanstack/react-query";
import { TokenTransferClient } from "../client/TokenTransferClient";
import type { TokenTransfer, TransferQuery } from "../types";

export type UseTokenTransfersOptions = {
  chainId: number;
  /** Pass undefined to disable the query */
  query: TransferQuery | undefined;
  pageSize?: number;
  rpcUrls?: string[];
  enabled?: boolean;
};

/**
 * Paged transfers (newest first) for a sent-by / received-by / between / token query.
 * `transfers` is every loaded page flattened; call `fetchNextPage` for more.
 */
export function useTokenTransfers({
  chainId,
  query,
  pageSize = 20,
  rpcUrls,
  enabled = true,
}: UseTokenTransfersOptions) {
  const result = useInfiniteQuery({
    queryKey: ["net-token-transfers", chainId, query, pageSize],
    enabled: enabled && !!query,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<TokenTransfer[]> => {
      const client = new TokenTransferClient({
        chainId,
        overrides: rpcUrls ? { rpcUrls } : undefined,
      });
      return client.getTransfers(query as TransferQuery, {
        limit: pageSize,
        offset: pageParam,
      });
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < pageSize ? undefined : allPages.length * pageSize,
  });

  return {
    transfers: result.data?.pages.flat() ?? [],
    isLoading: result.isLoading,
    error: result.error,
    hasNextPage: result.hasNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
    fetchNextPage: result.fetchNextPage,
    refetch: result.refetch,
  };
}
