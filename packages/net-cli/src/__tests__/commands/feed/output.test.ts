import { describe, it, expect } from "vitest";
import {
  truncateAddress,
  formatTimestamp,
  postToJson,
  feedToJson,
} from "../../../commands/feed/format";
import type { NetMessage, RegisteredFeed } from "@net-protocol/feeds";

describe("output utilities", () => {
  describe("truncateAddress", () => {
    it("should truncate long addresses", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678";
      expect(truncateAddress(address)).toBe("0x1234...5678");
    });

    it("should not truncate short strings", () => {
      expect(truncateAddress("0x1234")).toBe("0x1234");
    });
  });

  describe("formatTimestamp", () => {
    it("should format a Unix timestamp", () => {
      const timestamp = 1706000000; // 2024-01-23T10:13:20Z
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toMatch(/2024-01-23/);
    });

    it("should handle bigint timestamps", () => {
      const timestamp = BigInt(1706000000);
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toMatch(/2024-01-23/);
    });
  });

  describe("postToJson", () => {
    it("should convert a post to JSON format", () => {
      const post: NetMessage = {
        sender: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
        timestamp: BigInt(1706000000),
        text: "Hello world",
        topic: "feed-general",
        app: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        data: "0x" as `0x${string}`,
      };

      const json = postToJson(post, 0, 5);

      expect(json.index).toBe(0);
      expect(json.sender).toBe(
        "0x1234567890abcdef1234567890abcdef12345678"
      );
      expect(json.text).toBe("Hello world");
      expect(json.timestamp).toBe(1706000000);
      expect(json.topic).toBe("feed-general");
      expect(json.commentCount).toBe(5);
    });

    it("should include data if not empty", () => {
      const post: NetMessage = {
        sender: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
        timestamp: BigInt(1706000000),
        text: "Hello",
        topic: "feed-general",
        app: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        data: "0x1234" as `0x${string}`,
      };

      const json = postToJson(post, 0);

      expect(json.data).toBe("0x1234");
    });

    it("should not include data if empty", () => {
      const post: NetMessage = {
        sender: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
        timestamp: BigInt(1706000000),
        text: "Hello",
        topic: "feed-general",
        app: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        data: "0x" as `0x${string}`,
      };

      const json = postToJson(post, 0);

      expect(json.data).toBeUndefined();
    });
  });

  describe("feedToJson", () => {
    it("should convert a feed to JSON format", () => {
      const feed: RegisteredFeed = {
        feedName: "general",
        registrant: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
        timestamp: 1706000000,
      };

      const json = feedToJson(feed, 0);

      expect(json.index).toBe(0);
      expect(json.feedName).toBe("general");
      expect(json.registrant).toBe(
        "0x1234567890abcdef1234567890abcdef12345678"
      );
      expect(json.timestamp).toBe(1706000000);
    });
  });
});
