import { useReadContract } from "wagmi";
import { USER_UPVOTE_CONTRACT } from "../constants";
import type { UseUserUpvotesReceivedOptions } from "../types";

export function useUserUpvotesReceived({
  chainId,
  userAddress,
  enabled = true,
}: UseUserUpvotesReceivedOptions) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: USER_UPVOTE_CONTRACT.address,
    abi: USER_UPVOTE_CONTRACT.abi,
    functionName: "getUserUpvotesReceived",
    args: [userAddress],
    chainId,
    query: { enabled: enabled && !!userAddress },
  });

  return {
    upvotes: typeof data === "bigint" ? Number(data) : 0,
    isLoading,
    error,
    refetch,
  };
}
