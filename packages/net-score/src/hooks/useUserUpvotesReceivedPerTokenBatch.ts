import { useReadContract } from "wagmi";
import { USER_UPVOTE_CONTRACT } from "../constants";
import type { UseUserUpvotesReceivedPerTokenBatchOptions } from "../types";

export function useUserUpvotesReceivedPerTokenBatch({
  chainId,
  userAddress,
  tokenAddresses,
  enabled = true,
}: UseUserUpvotesReceivedPerTokenBatchOptions) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: USER_UPVOTE_CONTRACT.address,
    abi: USER_UPVOTE_CONTRACT.abi,
    functionName: "getUserUpvotesReceivedPerTokenBatch",
    args: [userAddress, tokenAddresses],
    chainId,
    query: { enabled: enabled && tokenAddresses.length > 0 },
  });

  return {
    upvoteCounts: Array.isArray(data) ? (data as bigint[]).map(Number) : [],
    isLoading,
    error,
    refetch,
  };
}
