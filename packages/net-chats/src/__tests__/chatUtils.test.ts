import { describe, it, expect } from "vitest";
import { normalizeChatTopic, isChatTopic } from "../utils/chatUtils";

describe("chatUtils", () => {
  describe("normalizeChatTopic", () => {
    it("should add prefix to topic without prefix", () => {
      expect(normalizeChatTopic("general")).toBe("chat-general");
      expect(normalizeChatTopic("random")).toBe("chat-random");
      expect(normalizeChatTopic("tech")).toBe("chat-tech");
    });

    it("should return as-is for topic with prefix", () => {
      expect(normalizeChatTopic("chat-general")).toBe("chat-general");
      expect(normalizeChatTopic("chat-random")).toBe("chat-random");
    });

    it("should normalize case-insensitively", () => {
      expect(normalizeChatTopic("GENERAL")).toBe("chat-general");
      expect(normalizeChatTopic("General")).toBe("chat-general");
    });

    it("should handle already prefixed case-insensitive topics correctly", () => {
      // Critical test: "CHAT-general" should become "chat-general", not "chat-chat-general"
      expect(normalizeChatTopic("CHAT-general")).toBe("chat-general");
      expect(normalizeChatTopic("Chat-General")).toBe("chat-general");
      expect(normalizeChatTopic("CHAT-GENERAL")).toBe("chat-general");
    });

    it("should handle mixed case topics", () => {
      expect(normalizeChatTopic("Chat-General")).toBe("chat-general");
      expect(normalizeChatTopic("ChAt-GeNeRaL")).toBe("chat-general");
    });

    it("should handle empty string", () => {
      expect(normalizeChatTopic("")).toBe("chat-");
    });

    it("should trim whitespace", () => {
      expect(normalizeChatTopic("  general  ")).toBe("chat-general");
      expect(normalizeChatTopic("  chat-general  ")).toBe("chat-general");
      expect(normalizeChatTopic("\tgeneral\n")).toBe("chat-general");
    });

    it("should be idempotent", () => {
      const topic = "general";
      const normalized1 = normalizeChatTopic(topic);
      const normalized2 = normalizeChatTopic(normalized1);
      expect(normalized1).toBe("chat-general");
      expect(normalized2).toBe("chat-general");
      expect(normalized1).toBe(normalized2);
    });

    it("should handle topics with special characters", () => {
      expect(normalizeChatTopic("crypto-news")).toBe("chat-crypto-news");
      expect(normalizeChatTopic("crypto_news")).toBe("chat-crypto_news");
      expect(normalizeChatTopic("crypto.news")).toBe("chat-crypto.news");
    });
  });

  describe("isChatTopic", () => {
    it("should return true for topics starting with chat- prefix", () => {
      expect(isChatTopic("chat-general")).toBe(true);
      expect(isChatTopic("chat-random")).toBe(true);
      expect(isChatTopic("chat-tech")).toBe(true);
    });

    it("should return false for topics without prefix", () => {
      expect(isChatTopic("general")).toBe(false);
      expect(isChatTopic("random")).toBe(false);
      expect(isChatTopic("tech")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(isChatTopic("CHAT-general")).toBe(true);
      expect(isChatTopic("Chat-General")).toBe(true);
      expect(isChatTopic("CHAT-GENERAL")).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isChatTopic("")).toBe(false);
    });

    it("should return false for topics that only partially match", () => {
      expect(isChatTopic("chats-general")).toBe(false);
      expect(isChatTopic("chatgeneral")).toBe(false);
      expect(isChatTopic("mychat-general")).toBe(false);
    });
  });
});
