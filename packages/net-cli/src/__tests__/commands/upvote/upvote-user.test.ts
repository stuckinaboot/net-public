import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const TEST_CHAIN_ID = 8453;
const TEST_USER_ADDRESS = "0x1234567890123456789012345678901234567890";
const TEST_TX_HASH =
  "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
const TEST_UPVOTE_PRICE = 25000000000000n; // 0.000025 ETH

// Mock UserUpvoteClient
const mockGetUpvotePrice = vi.fn();
const mockUpvoteUser = vi.fn();

vi.mock("@net-protocol/score", () => ({
  UserUpvoteClient: vi.fn().mockImplementation(() => ({
    getUpvotePrice: mockGetUpvotePrice,
    upvoteUser: mockUpvoteUser,
  })),
  USER_UPVOTE_CONTRACT: {
    address: "0xa4bc2c63dd0157692fd5f409389e5032e37d8895",
    abi: [
      {
        name: "upvoteUser",
        type: "function",
        stateMutability: "payable",
        inputs: [
          { name: "user", type: "address" },
          { name: "token", type: "address" },
          { name: "numUpvotes", type: "uint256" },
          { name: "feeTier", type: "uint256" },
        ],
        outputs: [],
      },
    ],
  },
  NULL_ADDRESS: "0x0000000000000000000000000000000000000000",
  calculateUpvoteCost: vi.fn((count: number, price: bigint) => BigInt(count) * price),
}));

// Mock cli/shared
vi.mock("../../../cli/shared", () => ({
  parseReadOnlyOptionsWithDefault: vi.fn().mockImplementation((opts) => ({
    chainId: opts.chainId || TEST_CHAIN_ID,
    rpcUrl: opts.rpcUrl,
  })),
  parseCommonOptionsWithDefault: vi.fn().mockImplementation((opts) => ({
    privateKey: opts.privateKey || "0x" + "a".repeat(64),
    chainId: opts.chainId || TEST_CHAIN_ID,
    rpcUrl: opts.rpcUrl,
  })),
}));

// Mock shared/wallet
const mockCreateWallet = vi.fn().mockReturnValue({
  account: { address: "0x" + "b".repeat(40) },
});

vi.mock("../../../shared/wallet", () => ({
  createWallet: (...args: unknown[]) => mockCreateWallet(...args),
}));

// Mock shared/encode
const mockEncodeTransaction = vi.fn().mockReturnValue({
  to: "0xa4bc2c63dd0157692fd5f409389e5032e37d8895",
  data: "0xencoded",
  chainId: TEST_CHAIN_ID,
  value: "25000000000000",
});

vi.mock("../../../shared/encode", () => ({
  encodeTransaction: (...args: unknown[]) => mockEncodeTransaction(...args),
}));

// Mock shared/output
vi.mock("../../../shared/output", () => ({
  exitWithError: vi.fn().mockImplementation((msg: string) => {
    throw new Error(msg);
  }),
}));

// Mock console
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

// Import after mocks
import { executeUpvoteUser } from "../../../commands/upvote/upvote-user";
import type { UpvoteUserOptions } from "../../../commands/upvote/types";

describe("executeUpvoteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUpvotePrice.mockResolvedValue(TEST_UPVOTE_PRICE);
    mockUpvoteUser.mockResolvedValue(TEST_TX_HASH);
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  const baseOptions: UpvoteUserOptions = {
    address: TEST_USER_ADDRESS,
    count: "3",
    privateKey: "0x" + "a".repeat(64),
    chainId: TEST_CHAIN_ID,
  };

  describe("execute mode", () => {
    it("should submit upvote and print success", async () => {
      await executeUpvoteUser(baseOptions);

      expect(mockGetUpvotePrice).toHaveBeenCalled();
      expect(mockUpvoteUser).toHaveBeenCalledWith(
        expect.objectContaining({
          userToUpvote: TEST_USER_ADDRESS,
          numUpvotes: 3,
        })
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Profile upvote submitted successfully")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(TEST_TX_HASH)
      );
    });

    it("should pass token and feeTier when provided", async () => {
      const tokenAddress = "0x" + "c".repeat(40);
      await executeUpvoteUser({
        ...baseOptions,
        token: tokenAddress,
        feeTier: "3000",
      });

      expect(mockUpvoteUser).toHaveBeenCalledWith(
        expect.objectContaining({
          token: tokenAddress,
          feeTier: 3000,
        })
      );
    });

    it("should use NULL_ADDRESS when no token provided", async () => {
      await executeUpvoteUser(baseOptions);

      expect(mockUpvoteUser).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "0x0000000000000000000000000000000000000000",
        })
      );
    });

    it("should display token in output when non-null token provided", async () => {
      const tokenAddress = "0x" + "c".repeat(40);
      await executeUpvoteUser({
        ...baseOptions,
        token: tokenAddress,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(tokenAddress)
      );
    });
  });

  describe("encode-only mode", () => {
    it("should output encoded transaction as JSON", async () => {
      await executeUpvoteUser({
        ...baseOptions,
        encodeOnly: true,
      });

      expect(mockEncodeTransaction).toHaveBeenCalled();
      expect(mockUpvoteUser).not.toHaveBeenCalled();

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.to !== undefined;
        } catch {
          return false;
        }
      });
      expect(jsonCall).toBeDefined();
    });
  });

  describe("validation", () => {
    it("should error on invalid address", async () => {
      await expect(
        executeUpvoteUser({ ...baseOptions, address: "not-an-address" })
      ).rejects.toThrow("Invalid address format");
    });

    it("should error on invalid count", async () => {
      await expect(
        executeUpvoteUser({ ...baseOptions, count: "0" })
      ).rejects.toThrow("Count must be a positive integer");
    });

    it("should error on non-numeric count", async () => {
      await expect(
        executeUpvoteUser({ ...baseOptions, count: "abc" })
      ).rejects.toThrow("Count must be a positive integer");
    });

    it("should error when upvote price fetch fails", async () => {
      mockGetUpvotePrice.mockRejectedValue(new Error("Network error"));

      await expect(executeUpvoteUser(baseOptions)).rejects.toThrow(
        "Failed to fetch upvote price"
      );
    });

    it("should error when upvote transaction fails", async () => {
      mockUpvoteUser.mockRejectedValue(new Error("Transaction reverted"));

      await expect(executeUpvoteUser(baseOptions)).rejects.toThrow(
        "Failed to submit profile upvote"
      );
    });
  });
});
