import { describe, it, expect } from "vitest";
import {
  generateAgentChatTopic,
  parseAgentAddressFromTopic,
  isAgentChatTopic,
} from "../dm/topicUtils";

describe("topicUtils", () => {
  const testAddress = "0x1234567890abcdef1234567890abcdef12345678";

  describe("generateAgentChatTopic", () => {
    it("should generate a topic with the correct prefix", () => {
      const topic = generateAgentChatTopic(testAddress as `0x${string}`);
      expect(topic).toMatch(
        /^agent-chat-0x1234567890abcdef1234567890abcdef12345678-/,
      );
    });

    it("should generate unique topics", () => {
      const topic1 = generateAgentChatTopic(testAddress as `0x${string}`);
      const topic2 = generateAgentChatTopic(testAddress as `0x${string}`);
      expect(topic1).not.toBe(topic2);
    });

    it("should include an 8-character nanoid suffix", () => {
      const topic = generateAgentChatTopic(testAddress as `0x${string}`);
      const parts = topic.split("-");
      // "agent", "chat", "0x...", nanoid
      const nanoidPart = parts[parts.length - 1];
      expect(nanoidPart.length).toBe(8);
    });
  });

  describe("parseAgentAddressFromTopic", () => {
    it("should parse agent address from valid topic", () => {
      const topic = `agent-chat-${testAddress}-abc12345`;
      expect(parseAgentAddressFromTopic(topic)).toBe(testAddress);
    });

    it("should return null for non-agent topics", () => {
      expect(parseAgentAddressFromTopic("chat-123-abc")).toBeNull();
      expect(parseAgentAddressFromTopic("feed-general")).toBeNull();
      expect(parseAgentAddressFromTopic("")).toBeNull();
    });

    it("should return null for malformed agent topics", () => {
      expect(parseAgentAddressFromTopic("agent-chat-notanaddress-abc")).toBeNull();
      expect(parseAgentAddressFromTopic("agent-chat-0x123-abc")).toBeNull(); // Too short
    });

    it("should roundtrip with generateAgentChatTopic", () => {
      const topic = generateAgentChatTopic(testAddress as `0x${string}`);
      const parsed = parseAgentAddressFromTopic(topic);
      expect(parsed).toBe(testAddress);
    });
  });

  describe("isAgentChatTopic", () => {
    it("should return true for agent chat topics", () => {
      expect(isAgentChatTopic(`agent-chat-${testAddress}-abc12345`)).toBe(true);
    });

    it("should return false for non-agent topics", () => {
      expect(isAgentChatTopic("chat-123")).toBe(false);
      expect(isAgentChatTopic("feed-general")).toBe(false);
    });
  });
});
