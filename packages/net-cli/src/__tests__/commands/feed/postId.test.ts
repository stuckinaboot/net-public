import { describe, it, expect } from "vitest";
import { createPostId, parsePostId } from "../../../shared/postId";
import type { NetMessage } from "@net-protocol/feeds";

describe("postId utilities", () => {
  describe("createPostId", () => {
    it("should create a post ID from a message", () => {
      const post: NetMessage = {
        sender: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
        timestamp: BigInt(1706000000),
        text: "Hello world",
        topic: "feed-general",
        app: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        data: "0x" as `0x${string}`,
      };

      const postId = createPostId(post);
      expect(postId).toBe(
        "0x1234567890abcdef1234567890abcdef12345678:1706000000"
      );
    });
  });

  describe("parsePostId", () => {
    it("should parse a valid post ID", () => {
      const postId =
        "0x1234567890abcdef1234567890abcdef12345678:1706000000";
      const result = parsePostId(postId);

      expect(result.sender).toBe(
        "0x1234567890abcdef1234567890abcdef12345678"
      );
      expect(result.timestamp).toBe(BigInt(1706000000));
    });

    it("should throw on invalid format (missing colon)", () => {
      expect(() =>
        parsePostId("0x1234567890abcdef1234567890abcdef12345678")
      ).toThrow("Invalid post ID format");
    });

    it("should throw on invalid sender address (wrong length)", () => {
      expect(() => parsePostId("0x1234:1706000000")).toThrow(
        "Invalid sender address"
      );
    });

    it("should throw on invalid sender address (missing 0x)", () => {
      expect(() =>
        parsePostId("1234567890abcdef1234567890abcdef12345678:1706000000")
      ).toThrow("Invalid sender address");
    });

    it("should throw on invalid timestamp", () => {
      expect(() =>
        parsePostId("0x1234567890abcdef1234567890abcdef12345678:0")
      ).toThrow("Invalid timestamp");
    });

    it("should throw on negative timestamp", () => {
      expect(() =>
        parsePostId("0x1234567890abcdef1234567890abcdef12345678:-1")
      ).toThrow();
    });
  });
});
