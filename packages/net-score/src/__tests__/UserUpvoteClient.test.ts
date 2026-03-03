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
  getBaseDataSuffix: vi.fn((chainId: number) =>
    chainId === 8453 ? "0xmocksuffix" : undefined
  ),
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

  describe("getUpvotePrice", () => {
    it("should return bigint from contract", async () => {
      vi.mocked(readContract).mockResolvedValue(25000000000000n);
      const result = await client.getUpvotePrice();
      expect(result).toBe(25000000000000n);
      expect(readContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          functionName: "upvotePrice",
        })
      );
    });
  });

  describe("upvoteUser", () => {
    it("should call walletClient.writeContract with correct args and value", async () => {
      // First call: getUpvotePrice (readContract)
      vi.mocked(readContract).mockResolvedValue(25000000000000n);

      const mockWriteContract = vi.fn().mockResolvedValue("0xabcdef1234567890");
      const mockWalletClient = { writeContract: mockWriteContract } as any;

      const result = await client.upvoteUser({
        walletClient: mockWalletClient,
        userToUpvote: USER_A,
        token: TOKEN_A,
        numUpvotes: 3,
        feeTier: 3000,
      });

      expect(result).toBe("0xabcdef1234567890");
      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "upvoteUser",
          args: [USER_A, TOKEN_A, 3n, 3000n],
          value: 75000000000000n, // 3 * 25000000000000
        })
      );
    });

    it("should reject self-upvote before making RPC call", async () => {
      const mockWriteContract = vi.fn();
      const mockWalletClient = {
        writeContract: mockWriteContract,
        account: { address: USER_A },
      } as any;

      await expect(
        client.upvoteUser({
          walletClient: mockWalletClient,
          userToUpvote: USER_A,
          numUpvotes: 1,
        })
      ).rejects.toThrow("Cannot upvote yourself");

      expect(readContract).not.toHaveBeenCalled();
      expect(mockWriteContract).not.toHaveBeenCalled();
    });

    it("should reject fractional upvotes before making RPC call", async () => {
      const mockWriteContract = vi.fn();
      const mockWalletClient = {
        writeContract: mockWriteContract,
        account: { address: "0x4444444444444444444444444444444444444444" },
      } as any;

      await expect(
        client.upvoteUser({
          walletClient: mockWalletClient,
          userToUpvote: USER_A,
          numUpvotes: 1.5,
        })
      ).rejects.toThrow("whole number");

      expect(readContract).not.toHaveBeenCalled();
    });

    it("should default token to NULL_ADDRESS and feeTier to 0", async () => {
      vi.mocked(readContract).mockResolvedValue(25000000000000n);

      const mockWriteContract = vi.fn().mockResolvedValue("0xhash");
      const mockWalletClient = { writeContract: mockWriteContract } as any;

      await client.upvoteUser({
        walletClient: mockWalletClient,
        userToUpvote: USER_A,
        numUpvotes: 1,
      });

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [
            USER_A,
            "0x0000000000000000000000000000000000000000",
            1n,
            0n,
          ],
          value: 25000000000000n,
        })
      );
    });

    it("should skip price fetch when value is provided", async () => {
      const mockWriteContract = vi.fn().mockResolvedValue("0xhash");
      const mockWalletClient = { writeContract: mockWriteContract } as any;

      await client.upvoteUser({
        walletClient: mockWalletClient,
        userToUpvote: USER_A,
        numUpvotes: 2,
        value: 50000000000000n,
      });

      expect(readContract).not.toHaveBeenCalled();
      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 50000000000000n,
        })
      );
    });
  });
});
