import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NetMessage } from "@net-protocol/core";

// Mock output formatting
import { formatMessage, messageToJson, printMessages } from "../../../shared/output";

const mockMessages: NetMessage[] = [
  {
    app: "0x1234567890123456789012345678901234567890",
    sender: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    timestamp: BigInt(1706547200), // 2024-01-29 12:00:00 UTC
    data: "0x",
    text: "Hello from topic test!",
    topic: "greetings",
  },
  {
    app: "0x1234567890123456789012345678901234567890",
    sender: "0x9876543210987654321098765432109876543210",
    timestamp: BigInt(1706550800), // 2024-01-29 13:00:00 UTC
    data: "0x48656c6c6f", // "Hello" in hex
    text: "Message with data",
    topic: "data-topic",
  },
  {
    app: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    sender: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    timestamp: BigInt(1706554400), // 2024-01-29 14:00:00 UTC
    data: "0x",
    text: "Different app message",
    topic: "",
  },
];

describe("message read output", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("formatMessage", () => {
    it("should format message with all fields", () => {
      const output = formatMessage(mockMessages[0], 0);

      expect(output).toContain("[0]");
      expect(output).toContain("Sender:");
      expect(output).toContain("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
      expect(output).toContain("App:");
      expect(output).toContain("0x1234567890123456789012345678901234567890");
      expect(output).toContain("Topic:");
      expect(output).toContain("greetings");
      expect(output).toContain("Text:");
      expect(output).toContain("Hello from topic test!");
    });

    it("should include data when present", () => {
      const output = formatMessage(mockMessages[1], 1);

      expect(output).toContain("Data:");
      expect(output).toContain("0x48656c6c6f");
    });

    it("should omit topic when empty", () => {
      const output = formatMessage(mockMessages[2], 2);

      expect(output).not.toContain("Topic:");
    });
  });

  describe("messageToJson", () => {
    it("should convert message to JSON format", () => {
      const json = messageToJson(mockMessages[0], 5);

      expect(json).toEqual({
        index: 5,
        sender: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        app: "0x1234567890123456789012345678901234567890",
        timestamp: 1706547200,
        text: "Hello from topic test!",
        topic: "greetings",
        data: "0x",
      });
    });
  });

  describe("printMessages", () => {
    it("should print messages in human-readable format", () => {
      printMessages([mockMessages[0]], 0, false);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
    });

    it("should print messages in JSON format", () => {
      printMessages([mockMessages[0], mockMessages[1]], 0, true);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].index).toBe(0);
      expect(parsed[1].index).toBe(1);
      expect(parsed[0].topic).toBe("greetings");
      expect(parsed[1].topic).toBe("data-topic");
    });

    it("should handle empty message array", () => {
      printMessages([], 0, false);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain("No messages found");
    });
  });
});

describe("message filtering by topic and sender", () => {
  it("should identify messages by topic", () => {
    const greetingMessages = mockMessages.filter(m => m.topic === "greetings");
    expect(greetingMessages).toHaveLength(1);
    expect(greetingMessages[0].text).toBe("Hello from topic test!");
  });

  it("should identify messages by sender", () => {
    const senderMessages = mockMessages.filter(
      m => m.sender === "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    );
    expect(senderMessages).toHaveLength(1);
    expect(senderMessages[0].text).toBe("Hello from topic test!");
  });

  it("should identify messages by app", () => {
    const appMessages = mockMessages.filter(
      m => m.app === "0x1234567890123456789012345678901234567890"
    );
    expect(appMessages).toHaveLength(2);
  });
});
