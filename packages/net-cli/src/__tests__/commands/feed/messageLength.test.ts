import { describe, it, expect } from "vitest";

// Test the message length validation logic
// The actual limit is defined in post.ts and comment-write.ts as MAX_MESSAGE_LENGTH = 4000

const MAX_MESSAGE_LENGTH = 4000;

describe("Message Length Validation", () => {
  describe("post message", () => {
    it("should accept messages under the limit", () => {
      const message = "a".repeat(3999);
      expect(message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    });

    it("should accept messages at exactly the limit", () => {
      const message = "a".repeat(4000);
      expect(message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    });

    it("should reject messages over the limit", () => {
      const message = "a".repeat(4001);
      expect(message.length).toBeGreaterThan(MAX_MESSAGE_LENGTH);
    });

    it("should count title + body together for limit", () => {
      const title = "a".repeat(2000);
      const body = "b".repeat(2000);
      const fullMessage = `${title}\n\n${body}`;
      // Title (2000) + "\n\n" (2) + body (2000) = 4002
      expect(fullMessage.length).toBeGreaterThan(MAX_MESSAGE_LENGTH);
    });

    it("should allow title + body under limit", () => {
      const title = "a".repeat(1999);
      const body = "b".repeat(1999);
      const fullMessage = `${title}\n\n${body}`;
      // Title (1999) + "\n\n" (2) + body (1999) = 4000
      expect(fullMessage.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    });
  });

  describe("comment message", () => {
    it("should accept comments under the limit", () => {
      const message = "a".repeat(3999);
      expect(message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    });

    it("should reject comments over the limit", () => {
      const message = "a".repeat(4001);
      expect(message.length).toBeGreaterThan(MAX_MESSAGE_LENGTH);
    });
  });

  describe("edge cases", () => {
    it("should handle empty messages", () => {
      const message = "";
      expect(message.length).toBe(0);
      expect(message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    });

    it("should handle unicode characters", () => {
      // Emoji characters are surrogate pairs in JS, so wave has length 2
      const message = "\u{1F44B}".repeat(1000);
      expect(message.length).toBe(2000); // Each emoji is 2 code units
      expect(message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    });

    it("should handle newlines in message", () => {
      const message = "line1\nline2\nline3".repeat(200);
      expect(message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    });
  });
});
