import { describe, it, expect } from "vitest";
import {
  encodeUpvoteKey,
  tokenAddressToUpvoteKeyString,
  isStrategyMessage,
  isUserUpvoteMessage,
  extractStrategyAddress,
  isPureAlphaStrategy,
  isUniv234PoolsStrategy,
  isDynamicSplitStrategy,
  selectStrategy,
} from "../utils/strategyUtils";
import {
  PURE_ALPHA_STRATEGY,
  UNIV234_POOLS_STRATEGY,
  DYNAMIC_SPLIT_STRATEGY,
} from "../constants";

describe("strategyUtils", () => {
  describe("encodeUpvoteKey", () => {
    it("should convert a token address to zero-padded bytes32", () => {
      const address = "0x1234567890123456789012345678901234567890";
      const result = encodeUpvoteKey(address);
      expect(result).toBe(
        "0x0000000000000000000000001234567890123456789012345678901234567890"
      );
      expect(result).toHaveLength(66);
    });
  });

  describe("tokenAddressToUpvoteKeyString", () => {
    it("should strip leading zeros after 0x", () => {
      const address = "0x00BB8dE12906F4579a25BD0F0D26DE59071AEe68";
      const result = tokenAddressToUpvoteKeyString(address);
      expect(result).toBe("0xbb8de12906f4579a25bd0f0d26de59071aee68");
    });

    it("should handle all-zero address", () => {
      const address = "0x0000000000000000000000000000000000000000";
      const result = tokenAddressToUpvoteKeyString(address);
      expect(result).toBe("0x0");
    });

    it("should lowercase the result", () => {
      const address = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      const result = tokenAddressToUpvoteKeyString(address);
      expect(result).toBe(result.toLowerCase());
    });
  });

  describe("topic detection", () => {
    it("isStrategyMessage should detect strategy topics", () => {
      expect(isStrategyMessage("s" + "a".repeat(43))).toBe(true);
      expect(isStrategyMessage("s")).toBe(false);
      expect(isStrategyMessage("t")).toBe(false);
    });

    it("isUserUpvoteMessage should detect user upvote topics", () => {
      expect(isUserUpvoteMessage("t")).toBe(true);
      expect(isUserUpvoteMessage("t-something")).toBe(true);
      expect(isUserUpvoteMessage("s-something")).toBe(false);
    });
  });

  describe("extractStrategyAddress", () => {
    it("should extract from 't' prefix format", () => {
      const addr = "0x1234567890123456789012345678901234567890";
      expect(extractStrategyAddress("t" + addr)).toBe(addr);
    });

    it("should extract from 's' prefix format", () => {
      const addr = "0x1234567890123456789012345678901234567890";
      expect(extractStrategyAddress("s" + addr + "extra")).toBe(addr);
    });

    it("should return empty string for unknown format", () => {
      expect(extractStrategyAddress("")).toBe("");
    });
  });

  describe("strategy identification", () => {
    it("should identify pure alpha strategy", () => {
      expect(isPureAlphaStrategy(PURE_ALPHA_STRATEGY.address)).toBe(true);
      expect(isPureAlphaStrategy(UNIV234_POOLS_STRATEGY.address)).toBe(false);
    });

    it("should identify univ234 pools strategy", () => {
      expect(isUniv234PoolsStrategy(UNIV234_POOLS_STRATEGY.address)).toBe(true);
      expect(isUniv234PoolsStrategy(PURE_ALPHA_STRATEGY.address)).toBe(false);
    });

    it("should identify dynamic split strategy", () => {
      expect(isDynamicSplitStrategy(DYNAMIC_SPLIT_STRATEGY.address)).toBe(true);
      expect(isDynamicSplitStrategy(PURE_ALPHA_STRATEGY.address)).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(
        isPureAlphaStrategy(PURE_ALPHA_STRATEGY.address.toUpperCase())
      ).toBe(true);
    });
  });

  describe("selectStrategy", () => {
    it("should return PURE_ALPHA for null/undefined pool key", () => {
      expect(selectStrategy(null)).toBe(PURE_ALPHA_STRATEGY.address);
      expect(selectStrategy(undefined)).toBe(PURE_ALPHA_STRATEGY.address);
    });

    it("should return DYNAMIC_SPLIT for valid pool key", () => {
      const poolKey = {
        currency0: "0x4200000000000000000000000000000000000006",
        currency1: "0xc5b1511d56C845242f1616b3b31042462aCE9B07",
        fee: 0x800000,
        tickSpacing: 200,
        hooks: "0xDd5EeaFf7BD481AD55Db083062b13a3cdf0A68CC",
      };
      expect(selectStrategy(poolKey)).toBe(DYNAMIC_SPLIT_STRATEGY.address);
    });
  });
});
