import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { TokenTransferClient } from "../client/TokenTransferClient";
import type { TransferQuery, TransfersPage } from "../types";

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
  const rpcKey = rpcUrls?.join(",");
  const client = useMemo(
    () => new TokenTransferClient({ chainId, overrides: rpcUrls ? { rpcUrls } : undefined }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rpcKey stands in for rpcUrls
    [chainId, rpcKey]
  );

  const result = useInfiniteQuery({
    queryKey: ["net-token-transfers", chainId, rpcKey, query, pageSize],
    enabled: enabled && !!query,
    initialPageParam: 0,
    queryFn: ({ pageParam }): Promise<TransfersPage> =>
      client.getTransfers(query as TransferQuery, { limit: pageSize, offset: pageParam }),
    getNextPageParam: (lastPage, _pages, lastOffset) => {
      const nextOffset = lastOffset + pageSize;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
  });

  return {
    transfers: result.data?.pages.flatMap((page) => page.transfers) ?? [],
    total: result.data?.pages[0]?.total,
    isLoading: result.isLoading,
    error: result.error,
    hasNextPage: result.hasNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
    fetchNextPage: result.fetchNextPage,
    refetch: result.refetch,
  };
}
