import { describe, it, expect } from "vitest";
import {
  generatePostHash,
  getCommentTopic,
  parseCommentData,
  encodeCommentData,
  isCommentTopic,
} from "../utils/commentUtils";
import type { NetMessage, CommentData } from "../types";

const createMockPost = (overrides: Partial<NetMessage> = {}): NetMessage => ({
  app: "0x0000000000000000000000000000000000000000",
  sender: "0x1234567890123456789012345678901234567890",
  timestamp: BigInt(1234567890),
  data: "0x",
  text: "Test post",
  topic: "feed-crypto",
  ...overrides,
});

describe("commentUtils", () => {
  describe("generatePostHash", () => {
    it("should generate a deterministic hash for a post", () => {
      const post = createMockPost();
      const hash1 = generatePostHash(post);
      const hash2 = generatePostHash(post);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should generate different hashes for different posts", () => {
      const post1 = createMockPost({ text: "Post 1" });
      const post2 = createMockPost({ text: "Post 2" });

      const hash1 = generatePostHash(post1);
      const hash2 = generatePostHash(post2);

      expect(hash1).not.toBe(hash2);
    });

    it("should include sender in hash computation", () => {
      const post1 = createMockPost({
        sender: "0x1111111111111111111111111111111111111111",
      });
      const post2 = createMockPost({
        sender: "0x2222222222222222222222222222222222222222",
      });

      const hash1 = generatePostHash(post1);
      const hash2 = generatePostHash(post2);

      expect(hash1).not.toBe(hash2);
    });

    it("should include timestamp in hash computation", () => {
      const post1 = createMockPost({ timestamp: BigInt(1000) });
      const post2 = createMockPost({ timestamp: BigInt(2000) });

      const hash1 = generatePostHash(post1);
      const hash2 = generatePostHash(post2);

      expect(hash1).not.toBe(hash2);
    });

    it("should include topic in hash computation", () => {
      const post1 = createMockPost({ topic: "feed-crypto" });
      const post2 = createMockPost({ topic: "feed-art" });

      const hash1 = generatePostHash(post1);
      const hash2 = generatePostHash(post2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("getCommentTopic", () => {
    it("should generate comment topic with correct format", () => {
      const post = createMockPost({ topic: "feed-crypto" });
      const commentTopic = getCommentTopic(post);

      expect(commentTopic).toMatch(/^feed-crypto:comments:0x[a-fA-F0-9]{64}$/);
    });

    it("should normalize topic before generating comment topic", () => {
      const post = createMockPost({ topic: "CRYPTO" }); // Not normalized
      const commentTopic = getCommentTopic(post);

      expect(commentTopic).toMatch(/^feed-crypto:comments:0x[a-fA-F0-9]{64}$/);
    });

    it("should generate same comment topic for same post", () => {
      const post = createMockPost();
      const topic1 = getCommentTopic(post);
      const topic2 = getCommentTopic(post);

      expect(topic1).toBe(topic2);
    });

    it("should generate different comment topics for different posts", () => {
      const post1 = createMockPost({ text: "Post 1" });
      const post2 = createMockPost({ text: "Post 2" });

      const topic1 = getCommentTopic(post1);
      const topic2 = getCommentTopic(post2);

      expect(topic1).not.toBe(topic2);
    });
  });

  describe("encodeCommentData and parseCommentData", () => {
    it("should round-trip basic comment data", () => {
      const data: CommentData = {
        parentTopic: "feed-crypto",
        parentSender: "0x1234567890123456789012345678901234567890",
        parentTimestamp: 1234567890,
      };

      const encoded = encodeCommentData(data);
      const decoded = parseCommentData(encoded);

      expect(decoded).toEqual(data);
    });

    it("should round-trip comment data with replyTo", () => {
      const data: CommentData = {
        parentTopic: "feed-crypto",
        parentSender: "0x1234567890123456789012345678901234567890",
        parentTimestamp: 1234567890,
        replyTo: {
          sender: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          timestamp: 1234567891,
        },
      };

      const encoded = encodeCommentData(data);
      const decoded = parseCommentData(encoded);

      expect(decoded).toEqual(data);
    });

    it("should return hex string from encodeCommentData", () => {
      const data: CommentData = {
        parentTopic: "feed-crypto",
        parentSender: "0x1234567890123456789012345678901234567890",
        parentTimestamp: 1234567890,
      };

      const encoded = encodeCommentData(data);
      expect(encoded).toMatch(/^0x/);
    });
  });

  describe("parseCommentData", () => {
    it("should return null for empty data", () => {
      expect(parseCommentData("0x")).toBeNull();
    });

    it("should return null for invalid JSON", () => {
      // Encode invalid JSON-like string
      const invalidHex = "0x" + Buffer.from("not json").toString("hex");
      expect(parseCommentData(invalidHex as `0x${string}`)).toBeNull();
    });

    it("should return null for missing required fields", () => {
      const incomplete = JSON.stringify({ parentTopic: "feed-crypto" });
      const hex = ("0x" +
        Buffer.from(incomplete).toString("hex")) as `0x${string}`;
      expect(parseCommentData(hex)).toBeNull();
    });

    it("should return null for invalid parentSender format", () => {
      const data = JSON.stringify({
        parentTopic: "feed-crypto",
        parentSender: "invalid-address", // Missing 0x prefix
        parentTimestamp: 1234567890,
      });
      const hex = ("0x" + Buffer.from(data).toString("hex")) as `0x${string}`;
      expect(parseCommentData(hex)).toBeNull();
    });

    it("should ignore invalid replyTo and still parse base data", () => {
      const data = JSON.stringify({
        parentTopic: "feed-crypto",
        parentSender: "0x1234567890123456789012345678901234567890",
        parentTimestamp: 1234567890,
        replyTo: {
          sender: "invalid", // Invalid format
          timestamp: 1234567891,
        },
      });
      const hex = ("0x" + Buffer.from(data).toString("hex")) as `0x${string}`;
      const parsed = parseCommentData(hex);

      expect(parsed).not.toBeNull();
      expect(parsed?.parentTopic).toBe("feed-crypto");
      expect(parsed?.replyTo).toBeUndefined(); // Invalid replyTo should be ignored
    });
  });

  describe("isCommentTopic", () => {
    it("should return true for comment topics", () => {
      expect(
        isCommentTopic("feed-crypto:comments:0x1234567890abcdef")
      ).toBe(true);
    });

    it("should return false for regular feed topics", () => {
      expect(isCommentTopic("feed-crypto")).toBe(false);
    });

    it("should return false for topics with similar patterns", () => {
      expect(isCommentTopic("feed-comments-discussion")).toBe(false);
    });
  });
});
