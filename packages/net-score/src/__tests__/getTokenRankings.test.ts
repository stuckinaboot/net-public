import { describe, it, expect } from "vitest";
import { getTokenRankings } from "../ranking/getTokenRankings";
import type {
  GetTokenRankingsOptions,
  RankedToken,
  RankingSort,
} from "../ranking/types";

describe("getTokenRankings", () => {
  it("exports the function and types", () => {
    expect(typeof getTokenRankings).toBe("function");
  });

  it("accepts the documented options shape", () => {
    const options: GetTokenRankingsOptions = {
      chainId: 8453,
      sort: "hot",
      maxTokens: 10,
      messageScanWindow: 200,
      thresholds: {
        minUpvotes: 100,
        minMarketCap: 10_000,
        recencyHours: 24,
      },
      rpcUrl: "https://example.com",
    };
    expect(options.chainId).toBe(8453);
  });

  it("RankingSort accepts hot/trending/recent/top", () => {
    const sorts: RankingSort[] = ["hot", "trending", "recent", "top"];
    expect(sorts).toHaveLength(4);
  });

  it("RankedToken has the expected shape", () => {
    const token: RankedToken = {
      address: "0x0000000000000000000000000000000000000001",
      name: "Test",
      symbol: "TST",
      decimals: 18,
      fdv: 100_000,
      priceInUsdc: 1.23,
      upvotes: 42,
      latestUpvoteTimestamp: 1700000000,
    };
    expect(token.upvotes).toBe(42);
  });
});
