import { describe, it, expect } from "vitest";
import { encodeAbiParameters } from "viem";
import {
  parseUserUpvoteMessage,
  extractTokenAddressesFromMessages,
  validateUserUpvoteMessage,
  calculatePriceInUsdc,
  calculateUserTokenBalance,
} from "../user-upvote/userUpvoteUtils";
import type { UserUpvoteNetMessage } from "../user-upvote/types";

function makeMessage(data: `0x${string}`): UserUpvoteNetMessage {
  return {
    app: "0x0000000000000000000000000000000000000001",
    sender: "0x0000000000000000000000000000000000000002",
    timestamp: 1000000n,
    data,
    text: "",
    topic: "",
  };
}

// Encode a "given" upvote message (6 fields, topic "g")
function encodeGivenMessage(
  upvotedUser: string,
  token: `0x${string}`,
  numUpvotes: bigint,
  tokenWethPrice: bigint,
  wethUsdcPrice: bigint,
  alphaWethPrice: bigint
): `0x${string}` {
  return encodeAbiParameters(
    [
      { type: "string" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    [upvotedUser, token, numUpvotes, tokenWethPrice, wethUsdcPrice, alphaWethPrice]
  );
}

// Encode a "received" upvote message (7 fields, topic "ub-{address}")
function encodeReceivedMessage(
  upvotedUser: string,
  token: `0x${string}`,
  numUpvotes: bigint,
  tokenWethPrice: bigint,
  wethUsdcPrice: bigint,
  alphaWethPrice: bigint,
  userTokenBalance: bigint
): `0x${string}` {
  return encodeAbiParameters(
    [
      { type: "string" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    [upvotedUser, token, numUpvotes, tokenWethPrice, wethUsdcPrice, alphaWethPrice, userTokenBalance]
  );
}

const TOKEN_A = "0x1234567890123456789012345678901234567890" as `0x${string}`;
const TOKEN_B = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`;

describe("userUpvoteUtils", () => {
  describe("parseUserUpvoteMessage", () => {
    it("should parse a given upvote message (6 fields)", () => {
      const data = encodeGivenMessage("alice.eth", TOKEN_A, 5n, 1000n, 2000n, 3000n);
      const msg = makeMessage(data);
      const result = parseUserUpvoteMessage(msg, "g");

      expect(result).not.toBeNull();
      expect(result!.upvotedUserString).toBe("alice.eth");
      expect(result!.actualToken.toLowerCase()).toBe(TOKEN_A.toLowerCase());
      expect(result!.numUpvotes).toBe(5);
      expect(result!.tokenWethPrice).toBe(1000n);
      expect(result!.wethUsdcPrice).toBe(2000n);
      expect(result!.alphaWethPrice).toBe(3000n);
      expect(result!.userTokenBalance).toBeUndefined();
    });

    it("should parse a received upvote message (7 fields)", () => {
      const data = encodeReceivedMessage("bob.eth", TOKEN_A, 3n, 500n, 1000n, 1500n, 99999n);
      const msg = makeMessage(data);
      const result = parseUserUpvoteMessage(msg, "ub-0x1234");

      expect(result).not.toBeNull();
      expect(result!.upvotedUserString).toBe("bob.eth");
      expect(result!.numUpvotes).toBe(3);
      expect(result!.userTokenBalance).toBe(99999n);
    });

    it("should return null for invalid data", () => {
      const msg = makeMessage("0x1234");
      expect(parseUserUpvoteMessage(msg, "g")).toBeNull();
    });

    it("should return null for empty data", () => {
      const msg = makeMessage("0x");
      expect(parseUserUpvoteMessage(msg, "g")).toBeNull();
    });
  });

  describe("extractTokenAddressesFromMessages", () => {
    it("should extract unique token addresses from valid messages", () => {
      const data1 = encodeGivenMessage("alice", TOKEN_A, 1n, 0n, 0n, 0n);
      const data2 = encodeGivenMessage("bob", TOKEN_B, 2n, 0n, 0n, 0n);
      const data3 = encodeGivenMessage("carol", TOKEN_A, 3n, 0n, 0n, 0n);

      const messages = [makeMessage(data1), makeMessage(data2), makeMessage(data3)];
      const result = extractTokenAddressesFromMessages(messages, "g");

      expect(result.tokenAddresses).toHaveLength(2);
      expect(result.validMessages).toHaveLength(3);
      expect(result.tokenAddresses).toContain(TOKEN_A.toLowerCase());
      expect(result.tokenAddresses).toContain(TOKEN_B.toLowerCase());
    });

    it("should skip invalid messages", () => {
      const validData = encodeGivenMessage("alice", TOKEN_A, 1n, 0n, 0n, 0n);
      const messages = [makeMessage(validData), makeMessage("0xbad")];
      const result = extractTokenAddressesFromMessages(messages, "g");

      expect(result.tokenAddresses).toHaveLength(1);
      expect(result.validMessages).toHaveLength(1);
    });

    it("should handle empty array", () => {
      const result = extractTokenAddressesFromMessages([], "g");
      expect(result.tokenAddresses).toHaveLength(0);
      expect(result.validMessages).toHaveLength(0);
    });
  });

  describe("validateUserUpvoteMessage", () => {
    it("should return true for valid message", () => {
      const data = encodeGivenMessage("alice", TOKEN_A, 1n, 0n, 0n, 0n);
      expect(validateUserUpvoteMessage(makeMessage(data), "g")).toBe(true);
    });

    it("should return false for invalid message", () => {
      expect(validateUserUpvoteMessage(makeMessage("0xbad"), "g")).toBe(false);
    });
  });

  describe("calculatePriceInUsdc", () => {
    it("should calculate price for 18-decimal token", () => {
      const parsed = {
        upvotedUserString: "alice",
        actualToken: TOKEN_A,
        numUpvotes: 1,
        tokenWethPrice: BigInt(1e18), // 1 token = 1 WETH (in contract's scale)
        wethUsdcPrice: BigInt(3000e6), // 1 WETH = 3000 USDC (in contract's scale)
        alphaWethPrice: 0n,
      };
      const price = calculatePriceInUsdc(parsed, 18);
      expect(price).toBeDefined();
      expect(price).toBeCloseTo(3000, 0);
    });

    it("should return undefined when tokenWethPrice is 0", () => {
      const parsed = {
        upvotedUserString: "alice",
        actualToken: TOKEN_A,
        numUpvotes: 1,
        tokenWethPrice: 0n,
        wethUsdcPrice: BigInt(3000e6),
        alphaWethPrice: 0n,
      };
      expect(calculatePriceInUsdc(parsed)).toBeUndefined();
    });

    it("should return undefined when wethUsdcPrice is 0", () => {
      const parsed = {
        upvotedUserString: "alice",
        actualToken: TOKEN_A,
        numUpvotes: 1,
        tokenWethPrice: BigInt(1e18),
        wethUsdcPrice: 0n,
        alphaWethPrice: 0n,
      };
      expect(calculatePriceInUsdc(parsed)).toBeUndefined();
    });

    it("should handle 6-decimal token", () => {
      const parsed = {
        upvotedUserString: "alice",
        actualToken: TOKEN_A,
        numUpvotes: 1,
        tokenWethPrice: BigInt(1e30), // scale for 6-decimal token: 10^(36-6) = 10^30
        wethUsdcPrice: BigInt(3000e6),
        alphaWethPrice: 0n,
      };
      const price = calculatePriceInUsdc(parsed, 6);
      expect(price).toBeDefined();
      expect(price).toBeCloseTo(3000, 0);
    });
  });

  describe("calculateUserTokenBalance", () => {
    it("should convert 18-decimal raw balance", () => {
      const raw = BigInt(1e18);
      expect(calculateUserTokenBalance(raw, 18)).toBeCloseTo(1, 5);
    });

    it("should convert 6-decimal raw balance", () => {
      const raw = BigInt(1e6);
      expect(calculateUserTokenBalance(raw, 6)).toBeCloseTo(1, 5);
    });

    it("should convert 8-decimal raw balance", () => {
      const raw = BigInt(1e8);
      expect(calculateUserTokenBalance(raw, 8)).toBeCloseTo(1, 5);
    });

    it("should handle zero balance", () => {
      expect(calculateUserTokenBalance(0n, 18)).toBe(0);
    });

    it("should default to 18 decimals", () => {
      const raw = BigInt(5e18);
      expect(calculateUserTokenBalance(raw)).toBeCloseTo(5, 5);
    });
  });
});
