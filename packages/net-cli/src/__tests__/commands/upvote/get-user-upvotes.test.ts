import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const TEST_CHAIN_ID = 8453;
const TEST_USER_ADDRESS = "0x1234567890123456789012345678901234567890";
const TEST_UPVOTE_PRICE = 25000000000000n; // 0.000025 ETH

// Mock UserUpvoteClient
const mockGetUserUpvotesGiven = vi.fn();
const mockGetUserUpvotesReceived = vi.fn();
const mockGetUpvotePrice = vi.fn();

vi.mock("@net-protocol/score", () => ({
  UserUpvoteClient: vi.fn().mockImplementation(() => ({
    getUserUpvotesGiven: mockGetUserUpvotesGiven,
    getUserUpvotesReceived: mockGetUserUpvotesReceived,
    getUpvotePrice: mockGetUpvotePrice,
  })),
}));

// Mock cli/shared
vi.mock("../../../cli/shared", () => ({
  parseReadOnlyOptionsWithDefault: vi.fn().mockImplementation((opts) => ({
    chainId: opts.chainId || TEST_CHAIN_ID,
    rpcUrl: opts.rpcUrl,
  })),
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
import { executeGetUserUpvotes } from "../../../commands/upvote/get-user-upvotes";
import type { GetUserUpvotesOptions } from "../../../commands/upvote/types";

describe("executeGetUserUpvotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserUpvotesGiven.mockResolvedValue(10n);
    mockGetUserUpvotesReceived.mockResolvedValue(25n);
    mockGetUpvotePrice.mockResolvedValue(TEST_UPVOTE_PRICE);
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  const baseOptions: GetUserUpvotesOptions = {
    address: TEST_USER_ADDRESS,
    chainId: TEST_CHAIN_ID,
  };

  describe("human-readable output", () => {
    it("should display upvote stats", async () => {
      await executeGetUserUpvotes(baseOptions);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(TEST_USER_ADDRESS)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Upvotes Given")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Upvotes Received")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Upvote Price")
      );
    });

    it("should display given and received counts", async () => {
      await executeGetUserUpvotes(baseOptions);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("10")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("25")
      );
    });

    it("should display zero counts correctly", async () => {
      mockGetUserUpvotesGiven.mockResolvedValue(0n);
      mockGetUserUpvotesReceived.mockResolvedValue(0n);

      await executeGetUserUpvotes(baseOptions);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("0")
      );
    });
  });

  describe("JSON output", () => {
    it("should output valid JSON", async () => {
      await executeGetUserUpvotes({ ...baseOptions, json: true });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });
      expect(jsonCall).toBeDefined();
    });

    it("should include all fields in JSON", async () => {
      await executeGetUserUpvotes({ ...baseOptions, json: true });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.address !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonCall).toBeDefined();
      const output = JSON.parse(jsonCall![0]);
      expect(output.address).toBe(TEST_USER_ADDRESS);
      expect(output.chainId).toBe(TEST_CHAIN_ID);
      expect(output.upvotesGiven).toBe(10);
      expect(output.upvotesReceived).toBe(25);
      expect(output.upvotePriceWei).toBe(TEST_UPVOTE_PRICE.toString());
      expect(output.upvotePriceEth).toBeDefined();
    });
  });

  describe("validation", () => {
    it("should error on invalid address", async () => {
      await expect(
        executeGetUserUpvotes({ ...baseOptions, address: "bad" })
      ).rejects.toThrow("Invalid address format");
    });

    it("should error when fetch fails", async () => {
      mockGetUserUpvotesGiven.mockRejectedValue(new Error("Network error"));

      await expect(
        executeGetUserUpvotes(baseOptions)
      ).rejects.toThrow("Failed to fetch user upvotes");
    });
  });
});
