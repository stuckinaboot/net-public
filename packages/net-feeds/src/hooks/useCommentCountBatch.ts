import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { NULL_ADDRESS, getNetContract } from "@net-protocol/core";
import { getCommentTopic, generatePostHash } from "../utils/commentUtils";
import type { UseCommentCountBatchOptions, NetMessage } from "../types";

/**
 * React hook for efficiently fetching comment counts for multiple posts in a single multicall.
 *
 * @param options - Batch comment count options
 * @param options.chainId - Chain ID to query
 * @param options.posts - Array of posts to get comment counts for
 * @param options.enabled - Whether the query is enabled (default: true)
 * @returns Object with counts Map, isLoading, and error
 *
 * @example
 * ```tsx
 * const { counts, isLoading } = useCommentCountBatch({
 *   chainId: 8453,
 *   posts: feedPosts,
 * });
 *
 * // Get count for a specific post
 * const postHash = generatePostHash(post);
 * const count = counts.get(postHash) ?? 0;
 * ```
 */
export function useCommentCountBatch({
  chainId,
  posts,
  enabled = true,
}: UseCommentCountBatchOptions) {
  // Get the net contract config for this chain
  const netContract = useMemo(() => getNetContract(chainId), [chainId]);

  // Build contract read configs for each post's comment count
  const contracts = useMemo(() => {
    return posts.map((post) => {
      const commentTopic = getCommentTopic(post);
      return {
        abi: netContract.abi,
        address: netContract.address,
        functionName: "getTotalMessagesForAppTopicCount" as const,
        args: [NULL_ADDRESS, commentTopic] as const,
        chainId,
      };
    });
  }, [posts, netContract, chainId]);

  // Generate post hashes for the result map
  const postHashes = useMemo(
    () => posts.map((post) => generatePostHash(post)),
    [posts]
  );

  // Use wagmi's multicall to fetch all counts in one request
  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: {
      enabled: enabled && posts.length > 0,
    },
  });

  // Build a Map from post hash to count for easy lookup
  const counts = useMemo(() => {
    const map = new Map<`0x${string}`, number>();

    if (!data) {
      return map;
    }

    data.forEach((result, index) => {
      const postHash = postHashes[index];
      if (result.status === "success" && result.result !== undefined) {
        map.set(postHash, Number(result.result));
      } else {
        map.set(postHash, 0);
      }
    });

    return map;
  }, [data, postHashes]);

  return {
    counts,
    isLoading,
    error: error as Error | undefined,
  };
}
