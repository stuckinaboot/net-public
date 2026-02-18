import { type Address, type PublicClient } from "viem";
import { readContract } from "viem/actions";
import { getPublicClient } from "@net-protocol/core";
import {
  SCORE_CONTRACT,
  UPVOTE_APP,
  ALL_STRATEGY_ADDRESSES,
} from "../constants";
import { getScoreKey } from "../utils/scoreKeyUtils";
import type {
  ScoreClientOptions,
  GetUpvotesOptions,
  GetUpvotesForItemsOptions,
  GetStrategyKeyScoresOptions,
  GetAppKeyScoresOptions,
} from "../types";

/**
 * ScoreClient - Client for interacting with Net protocol scoring/upvote system
 *
 * **Pattern for client methods:**
 * - Client methods never require `chainId` in their parameters
 * - All methods use `this.client` internally (created during construction)
 * - This ensures consistency: the client's chain is the single source of truth
 */
export class ScoreClient {
  private client: PublicClient;
  private scoreAddress: Address;
  private upvoteAppAddress: Address;

  constructor(params: ScoreClientOptions) {
    this.client = getPublicClient({
      chainId: params.chainId,
      rpcUrl: params.overrides?.rpcUrls,
    });
    this.scoreAddress =
      params.overrides?.scoreAddress ?? SCORE_CONTRACT.address;
    this.upvoteAppAddress =
      params.overrides?.upvoteAppAddress ?? UPVOTE_APP.address;
  }

  /**
   * Get upvote counts for score keys via UpvoteApp.getUpvotesWithLegacy.
   * Returns an array of counts, one per score key.
   */
  async getUpvotesWithLegacy({
    scoreKeys,
    strategies = ALL_STRATEGY_ADDRESSES,
  }: GetUpvotesOptions): Promise<number[]> {
    const data = await readContract(this.client, {
      address: this.upvoteAppAddress,
      abi: UPVOTE_APP.abi,
      functionName: "getUpvotesWithLegacy",
      args: [scoreKeys, strategies],
    });

    if (Array.isArray(data)) {
      return data.map(Number);
    }
    return [];
  }

  /**
   * Get upvote counts for ScoreItem array.
   * Converts items to score keys, then calls getUpvotesWithLegacy.
   */
  async getUpvotesForItems({
    items,
    strategies,
  }: GetUpvotesForItemsOptions): Promise<number[]> {
    const scoreKeys = items.map((item) => getScoreKey(item));
    return this.getUpvotesWithLegacy({ scoreKeys, strategies });
  }

  /**
   * Read scores for keys from a specific strategy on the Score contract.
   * Uses the batch getAppStrategyKeyScores function for efficiency.
   */
  async getStrategyKeyScores({
    strategy,
    scoreKeys,
  }: GetStrategyKeyScoresOptions): Promise<number[]> {
    const data = await readContract(this.client, {
      address: this.scoreAddress,
      abi: SCORE_CONTRACT.abi,
      functionName: "getAppStrategyKeyScores",
      args: [this.upvoteAppAddress, strategy, scoreKeys],
    });

    if (Array.isArray(data)) {
      return data.map(Number);
    }
    return [];
  }

  /**
   * Read scores for keys from a specific app on the Score contract.
   * Uses the batch getAppKeyScores function for efficiency.
   */
  async getAppKeyScores({
    app,
    scoreKeys,
  }: GetAppKeyScoresOptions): Promise<number[]> {
    const data = await readContract(this.client, {
      address: this.scoreAddress,
      abi: SCORE_CONTRACT.abi,
      functionName: "getAppKeyScores",
      args: [app, scoreKeys],
    });

    if (Array.isArray(data)) {
      return data.map(Number);
    }
    return [];
  }
}
