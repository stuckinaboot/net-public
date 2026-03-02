import { useReadContract } from "wagmi";
import { USER_UPVOTE_CONTRACT } from "../constants";
import type { UseUserUpvotesGivenOptions } from "../types";

export function useUserUpvotesGiven({
  chainId,
  userAddress,
  enabled = true,
}: UseUserUpvotesGivenOptions) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: USER_UPVOTE_CONTRACT.address,
    abi: USER_UPVOTE_CONTRACT.abi,
    functionName: "getUserUpvotesGiven",
    args: [userAddress],
    chainId,
    query: { enabled },
  });

  return {
    upvotes: typeof data === "bigint" ? Number(data) : 0,
    isLoading,
    error,
    refetch,
  };
}
