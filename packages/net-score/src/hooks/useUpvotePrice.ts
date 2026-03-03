import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { USER_UPVOTE_CONTRACT } from "../constants";
import type { UseUpvotePriceOptions } from "../types";

export function useUpvotePrice({
  chainId,
  enabled = true,
}: UseUpvotePriceOptions) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: USER_UPVOTE_CONTRACT.address,
    abi: USER_UPVOTE_CONTRACT.abi,
    functionName: "upvotePrice",
    chainId,
    query: { enabled },
  });

  const price = typeof data === "bigint" ? data : 0n;
  const priceInEth = price > 0n ? Number(formatEther(price)) : 0;

  return {
    price,
    priceInEth,
    isLoading,
    error,
    refetch,
  };
}
