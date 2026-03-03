import { type Address, type PublicClient, type WalletClient } from "viem";
import { readContract } from "viem/actions";
import { getPublicClient, getBaseDataSuffix } from "@net-protocol/core";
import { USER_UPVOTE_CONTRACT, NULL_ADDRESS } from "../constants";
import { validateUpvoteParams, calculateUpvoteCost } from "./userUpvoteUtils";
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
  private chainId: number;

  constructor(params: UserUpvoteClientOptions) {
    this.chainId = params.chainId;
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

  async getUpvotePrice(): Promise<bigint> {
    const data = await readContract(this.client, {
      address: this.contractAddress,
      abi: USER_UPVOTE_CONTRACT.abi,
      functionName: "upvotePrice",
    });
    return data as bigint;
  }

  async upvoteUser({
    walletClient,
    userToUpvote,
    token = NULL_ADDRESS,
    numUpvotes,
    feeTier = 0,
    value: providedValue,
  }: {
    walletClient: WalletClient;
    userToUpvote: Address;
    token?: Address;
    numUpvotes: number;
    feeTier?: number;
    /** Pre-computed ETH value. When omitted, fetches upvotePrice from chain. */
    value?: bigint;
  }): Promise<`0x${string}`> {
    const sender = walletClient.account?.address;
    if (sender) {
      const validation = validateUpvoteParams({ sender, userToUpvote, numUpvotes });
      if (!validation.valid) {
        throw new Error(validation.error);
      }
    }

    const value = providedValue ?? calculateUpvoteCost(numUpvotes, await this.getUpvotePrice());

    const hash = await walletClient.writeContract({
      address: this.contractAddress,
      abi: USER_UPVOTE_CONTRACT.abi,
      functionName: "upvoteUser",
      args: [userToUpvote, token, BigInt(numUpvotes), BigInt(feeTier)],
      value,
      chain: null,
      dataSuffix: getBaseDataSuffix(this.chainId),
    } as unknown as Parameters<typeof walletClient.writeContract>[0]);

    return hash;
  }
}
