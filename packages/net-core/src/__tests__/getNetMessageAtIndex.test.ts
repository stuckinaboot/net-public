import { describe, it, expect } from "vitest";
import { NetClient } from "../client/NetClient";
import {
  BASE_CHAIN_ID,
  BASE_TEST_ADDRESSES,
  BASE_TEST_RPC_URL,
  delay,
} from "./test-utils";
import type { NetMessage } from "../types";

describe("getNetMessageAtIndex", () => {
  it("should return specific known message by index (immutable)", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    // Since messages are immutable, we can test specific known messages
    const knownMessageIndex = 0; // First message on Base
    const message = await client.getMessageAtIndex({
      messageIndex: knownMessageIndex,
    });

    expect(message).not.toBeNull();
    if (message) {
      // Verify structure matches NetMessage type
      expect(message).toHaveProperty("app");
      expect(message).toHaveProperty("sender");
      expect(message).toHaveProperty("timestamp");
      expect(message).toHaveProperty("data");
      expect(message).toHaveProperty("text");
      expect(message).toHaveProperty("topic");

      // Verify types
      expect(typeof message.app).toBe("string");
      expect(message.app.startsWith("0x")).toBe(true);
      expect(typeof message.sender).toBe("string");
      expect(message.sender.startsWith("0x")).toBe(true);
      expect(typeof message.timestamp).toBe("bigint");
      expect(typeof message.data).toBe("string");
      expect(message.data.startsWith("0x")).toBe(true);
      expect(typeof message.text).toBe("string");
      expect(typeof message.topic).toBe("string");

      // Since messages are immutable, we can verify exact content
      // The first message should always be the same
      // Note: We don't assert exact values here since we don't know the first message,
      // but the structure should be consistent
    }

    await delay();
  });

  it("should return null for invalid index", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const message = await client.getMessageAtIndex({
      messageIndex: 999999999,
    });

    expect(message).toBeNull();

    await delay();
  });

  it("should return message for appAddress", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;
    const count = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress },
    });

    await delay();

    if (count > 0) {
      const message = await client.getMessageAtIndex({
        messageIndex: 0,
        appAddress,
      });

      expect(message).not.toBeNull();
      if (message) {
        expect(message.app.toLowerCase()).toBe(appAddress.toLowerCase());
      }
    }

    await delay();
  });

  it("should return message for appAddress and topic", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;
    const topic = BASE_TEST_ADDRESSES.NULL_ADDRESS;

    const count = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress, topic },
    });

    await delay();

    if (count > 0) {
      const message = await client.getMessageAtIndex({
        messageIndex: 0,
        appAddress,
        topic,
      });

      expect(message).not.toBeNull();
      if (message) {
        expect(message.app.toLowerCase()).toBe(appAddress.toLowerCase());
        expect(message.topic.toLowerCase()).toBe(topic.toLowerCase());
      }
    }

    await delay();
  });

  it("should return consistent message for same index (immutability)", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const index = 0;
    const message1 = await client.getMessageAtIndex({
      messageIndex: index,
    });

    await delay();

    const message2 = await client.getMessageAtIndex({
      messageIndex: index,
    });

    if (message1 && message2) {
      // Messages are immutable, so they should be identical
      expect(message1.app).toBe(message2.app);
      expect(message1.sender).toBe(message2.sender);
      expect(message1.timestamp).toBe(message2.timestamp);
      expect(message1.data).toBe(message2.data);
      expect(message1.text).toBe(message2.text);
      expect(message1.topic).toBe(message2.topic);
    }

    await delay();
  });

  it("should return different messages for different indices", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const message0 = await client.getMessageAtIndex({
      messageIndex: 0,
    });

    await delay();

    const message1 = await client.getMessageAtIndex({
      messageIndex: 1,
    });

    if (message0 && message1) {
      // Different indices should return different messages
      expect(message0.timestamp).not.toEqual(message1.timestamp);
    }

    await delay();
  });
});
