import { type Address } from "viem";
import { useWriteContract } from "wagmi";
import { getBaseDataSuffix } from "@net-protocol/core";
import { USER_UPVOTE_CONTRACT, NULL_ADDRESS } from "../constants";
import type { UseUpvoteUserOptions } from "../types";

export function useUpvoteUser({ chainId }: UseUpvoteUserOptions) {
  const { writeContractAsync, isPending, isSuccess, error, data: hash, reset } =
    useWriteContract();

  const upvoteUser = async (params: {
    userToUpvote: Address;
    token?: Address;
    numUpvotes: number;
    feeTier?: number;
    value: bigint;
  }) => {
    return writeContractAsync({
      address: USER_UPVOTE_CONTRACT.address,
      abi: USER_UPVOTE_CONTRACT.abi,
      functionName: "upvoteUser",
      args: [
        params.userToUpvote,
        params.token ?? NULL_ADDRESS,
        BigInt(params.numUpvotes),
        BigInt(params.feeTier ?? 0),
      ],
      value: params.value,
      chainId,
      dataSuffix: getBaseDataSuffix(chainId),
    });
  };

  return { upvoteUser, isPending, isSuccess, error, hash, reset };
}
