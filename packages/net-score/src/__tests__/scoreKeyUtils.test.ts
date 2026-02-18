import { describe, it, expect } from "vitest";
import {
  getTokenScoreKey,
  isTokenScoreKey,
  extractTokenAddressFromScoreKey,
  getFeedContentKey,
  getScoreKey,
} from "../utils/scoreKeyUtils";
import type { FeedMessage, ScoreItem } from "../types";

describe("scoreKeyUtils", () => {
  describe("getTokenScoreKey", () => {
    it("should pad a token address to bytes32", () => {
      const address = "0x1234567890123456789012345678901234567890";
      const result = getTokenScoreKey(address);
      expect(result).toBe(
        "0x0000000000000000000000001234567890123456789012345678901234567890"
      );
    });

    it("should handle addresses with leading zeros", () => {
      const address = "0x00BB8dE12906F4579a25BD0F0D26DE59071AEe68";
      const result = getTokenScoreKey(address);
      expect(result).toHaveLength(66); // 0x + 64 hex chars
      expect(result.startsWith("0x000000000000000000000000")).toBe(true);
    });
  });

  describe("isTokenScoreKey", () => {
    it("should return true for zero-padded address score keys", () => {
      const key =
        "0x0000000000000000000000001234567890123456789012345678901234567890";
      expect(isTokenScoreKey(key)).toBe(true);
    });

    it("should return false for hash-based score keys", () => {
      const key =
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";
      expect(isTokenScoreKey(key)).toBe(false);
    });
  });

  describe("extractTokenAddressFromScoreKey", () => {
    it("should extract a valid address from a token score key", () => {
      const address = "0x1234567890123456789012345678901234567890";
      const scoreKey = getTokenScoreKey(address);
      const extracted = extractTokenAddressFromScoreKey(scoreKey);
      expect(extracted).toBe(
        "0x1234567890123456789012345678901234567890"
      );
    });

    it("should return null for non-token score keys", () => {
      const key =
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";
      expect(extractTokenAddressFromScoreKey(key)).toBe(null);
    });

    it("should return null for malformed keys", () => {
      expect(extractTokenAddressFromScoreKey("0x00")).toBe(null);
    });
  });

  describe("getFeedContentKey", () => {
    it("should produce a bytes32 hash from feed message fields", () => {
      const message: FeedMessage = {
        app: "0x0000000000000000000000000000000000000000",
        sender: "0x1234567890123456789012345678901234567890",
        timestamp: 1000000n,
        data: "0x1234",
        text: "hello",
        topic: "test-topic",
      };
      const key = getFeedContentKey(message);
      expect(key).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should produce the same key for identical messages", () => {
      const message: FeedMessage = {
        app: "0x0000000000000000000000000000000000000000",
        sender: "0x1234567890123456789012345678901234567890",
        timestamp: 1000000n,
        data: "0x1234",
        text: "hello",
        topic: "test-topic",
      };
      expect(getFeedContentKey(message)).toBe(getFeedContentKey(message));
    });

    it("should produce different keys for different messages", () => {
      const msg1: FeedMessage = {
        app: "0x0000000000000000000000000000000000000000",
        sender: "0x1234567890123456789012345678901234567890",
        timestamp: 1000000n,
        data: "0x1234",
        text: "hello",
        topic: "test-topic",
      };
      const msg2: FeedMessage = {
        ...msg1,
        text: "goodbye",
      };
      expect(getFeedContentKey(msg1)).not.toBe(getFeedContentKey(msg2));
    });
  });

  describe("getScoreKey", () => {
    it("should dispatch to getTokenScoreKey for token items", () => {
      const item: ScoreItem = {
        type: "token",
        tokenAddress: "0x1234567890123456789012345678901234567890",
      };
      const result = getScoreKey(item);
      expect(result).toBe(getTokenScoreKey(item.tokenAddress));
    });

    it("should produce a hash for feed items", () => {
      const item: ScoreItem = {
        type: "feed",
        message: {
          app: "0x0000000000000000000000000000000000000000",
          sender: "0x1234567890123456789012345678901234567890",
          timestamp: 1000000n,
          data: "0x",
          text: "test",
          topic: "test",
        },
      };
      const result = getScoreKey(item);
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
      // Feed keys should NOT look like token keys (zero-padded)
      expect(isTokenScoreKey(result)).toBe(false);
    });
  });
});
