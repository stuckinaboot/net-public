import { describe, it, expect } from "vitest";
import { normalizeFeedTopic, isFeedTopic } from "../utils/feedUtils";

describe("feedUtils", () => {
  describe("normalizeFeedTopic", () => {
    it("should add prefix to topic without prefix", () => {
      expect(normalizeFeedTopic("crypto")).toBe("feed-crypto");
      expect(normalizeFeedTopic("art")).toBe("feed-art");
      expect(normalizeFeedTopic("tech")).toBe("feed-tech");
    });

    it("should return as-is for topic with prefix", () => {
      expect(normalizeFeedTopic("feed-crypto")).toBe("feed-crypto");
      expect(normalizeFeedTopic("feed-art")).toBe("feed-art");
    });

    it("should normalize case-insensitively", () => {
      expect(normalizeFeedTopic("CRYPTO")).toBe("feed-crypto");
      expect(normalizeFeedTopic("CRYPTO")).toBe("feed-crypto");
      expect(normalizeFeedTopic("Crypto")).toBe("feed-crypto");
    });

    it("should handle already prefixed case-insensitive topics correctly", () => {
      // Critical test: "FEED-crypto" should become "feed-crypto", not "feed-feed-crypto"
      expect(normalizeFeedTopic("FEED-crypto")).toBe("feed-crypto");
      expect(normalizeFeedTopic("Feed-Crypto")).toBe("feed-crypto");
      expect(normalizeFeedTopic("FEED-CRYPTO")).toBe("feed-crypto");
    });

    it("should handle mixed case topics", () => {
      expect(normalizeFeedTopic("Feed-Crypto")).toBe("feed-crypto");
      expect(normalizeFeedTopic("FeEd-CrYpTo")).toBe("feed-crypto");
    });

    it("should handle empty string", () => {
      expect(normalizeFeedTopic("")).toBe("feed-");
    });

    it("should trim whitespace", () => {
      expect(normalizeFeedTopic("  crypto  ")).toBe("feed-crypto");
      expect(normalizeFeedTopic("  feed-crypto  ")).toBe("feed-crypto");
      expect(normalizeFeedTopic("\tcrypto\n")).toBe("feed-crypto");
    });

    it("should be idempotent", () => {
      const topic = "crypto";
      const normalized1 = normalizeFeedTopic(topic);
      const normalized2 = normalizeFeedTopic(normalized1);
      expect(normalized1).toBe("feed-crypto");
      expect(normalized2).toBe("feed-crypto");
      expect(normalized1).toBe(normalized2);
    });

    it("should handle topics with special characters", () => {
      expect(normalizeFeedTopic("crypto-news")).toBe("feed-crypto-news");
      expect(normalizeFeedTopic("crypto_news")).toBe("feed-crypto_news");
      expect(normalizeFeedTopic("crypto.news")).toBe("feed-crypto.news");
    });
  });

  describe("isFeedTopic", () => {
    it("should return true for topics starting with feed- prefix", () => {
      expect(isFeedTopic("feed-crypto")).toBe(true);
      expect(isFeedTopic("feed-art")).toBe(true);
      expect(isFeedTopic("feed-tech")).toBe(true);
    });

    it("should return false for topics without prefix", () => {
      expect(isFeedTopic("crypto")).toBe(false);
      expect(isFeedTopic("art")).toBe(false);
      expect(isFeedTopic("tech")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(isFeedTopic("FEED-crypto")).toBe(true);
      expect(isFeedTopic("Feed-Crypto")).toBe(true);
      expect(isFeedTopic("FEED-CRYPTO")).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isFeedTopic("")).toBe(false);
    });

    it("should return false for topics that only partially match", () => {
      expect(isFeedTopic("feeds-crypto")).toBe(false);
      expect(isFeedTopic("feedcrypto")).toBe(false);
      expect(isFeedTopic("myfeed-crypto")).toBe(false);
    });
  });
});

