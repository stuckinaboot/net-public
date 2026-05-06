import { describe, it, expect, vi, beforeEach } from "vitest";
import { stringToHex } from "viem";

const readContractMock = vi.fn();
vi.mock("viem/actions", () => ({
  readContract: (...args: unknown[]) => readContractMock(...args),
}));

import {
  listConversations,
  getConversationHistory,
} from "../dm/history";

const fakeClient = {} as unknown as Parameters<typeof getConversationHistory>[0];
const chatContract = "0x0000000000000000000000000000000000000aaa" as const;
const userAddress = "0x000000000000000000000000000000000000beef" as const;

// Helpers to build envelope strings exactly as the contract emits them:
// [version byte][marker byte][optional metadata]. version = 0x01 always.
const VERSION = 0x01;
const MARKER_HUMAN = 0x00;
const MARKER_AI = 0x01;
const MARKER_ENCRYPTED_HUMAN = 0x02;
const envelope = (marker: number, suffix = "") =>
  String.fromCharCode(VERSION, marker) + suffix;

beforeEach(() => {
  readContractMock.mockReset();
});

describe("getConversationHistory — field swap (Issue #14)", () => {
  it("classifies AI messages by reading the marker from the on-chain `text` field", async () => {
    // Per the contract, `text` carries the envelope (version + marker +
    // optional metadata) as a raw string, and `data` carries the raw
    // plaintext bytes as hex.
    const humanEnvelope = envelope(MARKER_HUMAN);
    const aiEnvelope = envelope(MARKER_AI, "gemini-3.1-flash-lite");
    const humanPlaintext = stringToHex("Hello, are you there?");
    const aiPlaintext = stringToHex("Aye, I hear ye loud and clear.");

    readContractMock.mockResolvedValueOnce(BigInt(2)); // total message count
    readContractMock.mockResolvedValueOnce([
      {
        text: humanEnvelope,
        data: humanPlaintext,
        sender: userAddress,
        timestamp: BigInt(1_777_000_000),
      },
      {
        text: aiEnvelope,
        data: aiPlaintext,
        sender: userAddress,
        timestamp: BigInt(1_777_000_001),
      },
    ]);

    const result = await getConversationHistory(
      fakeClient,
      chatContract,
      userAddress,
      "agent-chat-test-topic",
    );

    expect(result).toHaveLength(2);

    expect(result[0].sender).toBe("user");
    expect(result[0].text).toBe("Hello, are you there?");
    expect(result[0].encrypted).toBe(false);
    expect(result[0].envelope).toBe(humanEnvelope);
    expect(result[0].data).toBe(humanPlaintext);

    expect(result[1].sender).toBe("ai");
    expect(result[1].text).toBe("Aye, I hear ye loud and clear.");
    expect(result[1].encrypted).toBe(false);
    expect(result[1].envelope).toBe(aiEnvelope);
    expect(result[1].data).toBe(aiPlaintext);
  });

  it("marks encrypted messages and leaves text empty (does not attempt to decode bytes)", async () => {
    const encryptedHumanEnvelope = envelope(MARKER_ENCRYPTED_HUMAN);
    const opaqueData = "0xdeadbeef" as `0x${string}`;

    readContractMock.mockResolvedValueOnce(BigInt(1));
    readContractMock.mockResolvedValueOnce([
      {
        text: encryptedHumanEnvelope,
        data: opaqueData,
        sender: userAddress,
        timestamp: BigInt(1_777_000_000),
      },
    ]);

    const result = await getConversationHistory(
      fakeClient,
      chatContract,
      userAddress,
      "agent-chat-test-topic",
    );

    expect(result).toHaveLength(1);
    expect(result[0].encrypted).toBe(true);
    expect(result[0].text).toBe(""); // not decoded — encrypted
    expect(result[0].data).toBe(opaqueData);
  });

  it("returns [] when message count is zero", async () => {
    readContractMock.mockResolvedValueOnce(BigInt(0));
    const result = await getConversationHistory(
      fakeClient,
      chatContract,
      userAddress,
      "agent-chat-empty",
    );
    expect(result).toEqual([]);
  });
});

describe("listConversations — field swap (Issue #14)", () => {
  it("uses the on-chain `text` for encryption detection and decodes preview from `data`", async () => {
    const aiEnvelope = envelope(MARKER_AI, "gemini-3.1-flash-lite");
    const aiPlaintext = stringToHex("I am currently sailing the digital seas.");

    readContractMock.mockResolvedValueOnce([
      [
        {
          messageCount: BigInt(4),
          lastMessageTimestamp: BigInt(1_777_000_100),
          lastMessageData: aiPlaintext,
          lastMessageText: aiEnvelope,
        },
      ],
      ["agent-chat-test-topic"],
    ]);

    const result = await listConversations(
      fakeClient,
      chatContract,
      userAddress,
    );

    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe("agent-chat-test-topic");
    expect(result[0].messageCount).toBe(4);
    expect(result[0].isEncrypted).toBe(false);
    expect(result[0].lastMessage).toBe(
      "I am currently sailing the digital seas.",
    );
  });

  it("filters out conversations with messageCount === 0", async () => {
    readContractMock.mockResolvedValueOnce([
      [
        {
          messageCount: BigInt(0),
          lastMessageTimestamp: BigInt(0),
          lastMessageData: "0x",
          lastMessageText: "",
        },
      ],
      ["agent-chat-empty"],
    ]);

    const result = await listConversations(
      fakeClient,
      chatContract,
      userAddress,
    );
    expect(result).toEqual([]);
  });
});
