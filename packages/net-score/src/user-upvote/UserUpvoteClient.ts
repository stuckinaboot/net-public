import { type Address, type PublicClient } from "viem";
import { readContract } from "viem/actions";
import { getPublicClient } from "@net-protocol/core";
import { USER_UPVOTE_CONTRACT } from "../constants";
import type { UserUpvoteClientOptions } from "./types";

/**
 * UserUpvoteClient - Client for reading user-to-user upvote data.
 *
 * This is a standalone upvote system separate from the token Score system.
 * It reads directly from the UserUpvote contract on Base.
 */
export class UserUpvoteClient {
  private client: PublicClient;
  private contractAddress: Address;

  constructor(params: UserUpvoteClientOptions) {
    this.client = getPublicClient({
      chainId: params.chainId,
      rpcUrl: params.overrides?.rpcUrls,
    });
    this.contractAddress =
      params.overrides?.contractAddress ?? USER_UPVOTE_CONTRACT.address;
  }

  async getUserUpvotesGiven({ user }: { user: Address }): Promise<bigint> {
    const data = await readContract(this.client, {
      address: this.contractAddress,
      abi: USER_UPVOTE_CONTRACT.abi,
      functionName: "getUserUpvotesGiven",
      args: [user],
    });
    return data as bigint;
  }

  async getUserUpvotesReceived({ user }: { user: Address }): Promise<bigint> {
    const data = await readContract(this.client, {
      address: this.contractAddress,
      abi: USER_UPVOTE_CONTRACT.abi,
      functionName: "getUserUpvotesReceived",
      args: [user],
    });
    return data as bigint;
  }

  async getUserUpvotesGivenPerTokenBatch({
    user,
    tokens,
  }: {
    user: Address;
    tokens: Address[];
  }): Promise<bigint[]> {
    const data = await readContract(this.client, {
      address: this.contractAddress,
      abi: USER_UPVOTE_CONTRACT.abi,
      functionName: "getUserUpvotesGivenPerTokenBatch",
      args: [user, tokens],
    });
    return data as bigint[];
  }

  async getUserUpvotesReceivedPerTokenBatch({
    user,
    tokens,
  }: {
    user: Address;
    tokens: Address[];
  }): Promise<bigint[]> {
    const data = await readContract(this.client, {
      address: this.contractAddress,
      abi: USER_UPVOTE_CONTRACT.abi,
      functionName: "getUserUpvotesReceivedPerTokenBatch",
      args: [user, tokens],
    });
    return data as bigint[];
  }

  async getTotalUpvotesPerToken({
    token,
  }: {
    token: Address;
  }): Promise<bigint> {
    const data = await readContract(this.client, {
      address: this.contractAddress,
      abi: USER_UPVOTE_CONTRACT.abi,
      functionName: "getTotalUpvotesPerToken",
      args: [token],
    });
    return data as bigint;
  }

  async getUserTokensInRange({
    user,
    startIndex,
    endIndex,
  }: {
    user: Address;
    startIndex: number;
    endIndex: number;
  }): Promise<{ token: Address; feeTier: number }[]> {
    const data = await readContract(this.client, {
      address: this.contractAddress,
      abi: USER_UPVOTE_CONTRACT.abi,
      functionName: "getUserTokensInRange",
      args: [user, BigInt(startIndex), BigInt(endIndex)],
    });
    return (data as { token: Address; feeTier: number }[]).map((item) => ({
      token: item.token,
      feeTier: Number(item.feeTier),
    }));
  }

  async getUserTokenCount({ user }: { user: Address }): Promise<number> {
    const data = await readContract(this.client, {
      address: this.contractAddress,
      abi: USER_UPVOTE_CONTRACT.abi,
      functionName: "getUserTokenCount",
      args: [user],
    });
    return Number(data);
  }

  async isTokenInUserList({
    user,
    token,
  }: {
    user: Address;
    token: Address;
  }): Promise<boolean> {
    const data = await readContract(this.client, {
      address: this.contractAddress,
      abi: USER_UPVOTE_CONTRACT.abi,
      functionName: "isTokenInUserList",
      args: [user, token],
    });
    return data as boolean;
  }
}
