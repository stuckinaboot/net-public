import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserUpvoteClient } from "../user-upvote/UserUpvoteClient";
import type { Address } from "viem";

// Mock viem/actions
vi.mock("viem/actions", () => ({
  readContract: vi.fn(),
}));

// Mock @net-protocol/core
vi.mock("@net-protocol/core", () => ({
  getPublicClient: vi.fn(() => ({})),
}));

import { readContract } from "viem/actions";

const USER_A = "0x1111111111111111111111111111111111111111" as Address;
const TOKEN_A = "0x2222222222222222222222222222222222222222" as Address;
const TOKEN_B = "0x3333333333333333333333333333333333333333" as Address;

describe("UserUpvoteClient", () => {
  let client: UserUpvoteClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new UserUpvoteClient({ chainId: 8453 });
  });

  it("should construct with default options", () => {
    expect(client).toBeDefined();
  });

  it("should construct with overrides", () => {
    const custom = new UserUpvoteClient({
      chainId: 8453,
      overrides: {
        contractAddress: "0x9999999999999999999999999999999999999999" as Address,
        rpcUrls: ["https://custom-rpc.example.com"],
      },
    });
    expect(custom).toBeDefined();
  });

  describe("getUserUpvotesGiven", () => {
    it("should return bigint from contract", async () => {
      vi.mocked(readContract).mockResolvedValue(42n);
      const result = await client.getUserUpvotesGiven({ user: USER_A });
      expect(result).toBe(42n);
      expect(readContract).toHaveBeenCalledOnce();
    });
  });

  describe("getUserUpvotesReceived", () => {
    it("should return bigint from contract", async () => {
      vi.mocked(readContract).mockResolvedValue(100n);
      const result = await client.getUserUpvotesReceived({ user: USER_A });
      expect(result).toBe(100n);
    });
  });

  describe("getUserUpvotesGivenPerTokenBatch", () => {
    it("should return array of bigints", async () => {
      vi.mocked(readContract).mockResolvedValue([10n, 20n]);
      const result = await client.getUserUpvotesGivenPerTokenBatch({
        user: USER_A,
        tokens: [TOKEN_A, TOKEN_B],
      });
      expect(result).toEqual([10n, 20n]);
    });
  });

  describe("getUserUpvotesReceivedPerTokenBatch", () => {
    it("should return array of bigints", async () => {
      vi.mocked(readContract).mockResolvedValue([5n, 15n]);
      const result = await client.getUserUpvotesReceivedPerTokenBatch({
        user: USER_A,
        tokens: [TOKEN_A, TOKEN_B],
      });
      expect(result).toEqual([5n, 15n]);
    });
  });

  describe("getTotalUpvotesPerToken", () => {
    it("should return bigint", async () => {
      vi.mocked(readContract).mockResolvedValue(500n);
      const result = await client.getTotalUpvotesPerToken({ token: TOKEN_A });
      expect(result).toBe(500n);
    });
  });

  describe("getUserTokensInRange", () => {
    it("should return array of token info", async () => {
      vi.mocked(readContract).mockResolvedValue([
        { token: TOKEN_A, feeTier: 3000 },
        { token: TOKEN_B, feeTier: 10000 },
      ]);
      const result = await client.getUserTokensInRange({
        user: USER_A,
        startIndex: 0,
        endIndex: 2,
      });
      expect(result).toEqual([
        { token: TOKEN_A, feeTier: 3000 },
        { token: TOKEN_B, feeTier: 10000 },
      ]);
    });
  });

  describe("getUserTokenCount", () => {
    it("should return number", async () => {
      vi.mocked(readContract).mockResolvedValue(3n);
      const result = await client.getUserTokenCount({ user: USER_A });
      expect(result).toBe(3);
    });
  });

  describe("isTokenInUserList", () => {
    it("should return boolean", async () => {
      vi.mocked(readContract).mockResolvedValue(true);
      const result = await client.isTokenInUserList({
        user: USER_A,
        token: TOKEN_A,
      });
      expect(result).toBe(true);
    });

    it("should return false when token not in list", async () => {
      vi.mocked(readContract).mockResolvedValue(false);
      const result = await client.isTokenInUserList({
        user: USER_A,
        token: TOKEN_B,
      });
      expect(result).toBe(false);
    });
  });
});
