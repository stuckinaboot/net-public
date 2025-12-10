import { describe, it, expect, beforeAll } from "vitest";
import { NetClient } from "../client/NetClient";
import {
  BASE_CHAIN_ID,
  BASE_TEST_ADDRESSES,
  BASE_TEST_RPC_URL,
  delay,
} from "./test-utils";
import type { NetMessage } from "../types";

describe("getNetMessages", () => {
  // Add initial delay to avoid rate limits at test suite start
  beforeAll(async () => {
    await delay(1000); // 1 second delay before starting tests
  });

  it("should return array of messages with no filter", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const messages = await client.getMessages({
      chainId: BASE_CHAIN_ID,
      startIndex: 0,
      endIndex: 10,
    });

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeLessThanOrEqual(10);

    if (messages.length > 0) {
      const msg = messages[0];
      expect(msg).toHaveProperty("app");
      expect(msg).toHaveProperty("sender");
      expect(msg).toHaveProperty("timestamp");
      expect(msg).toHaveProperty("data");
      expect(msg).toHaveProperty("text");
      expect(msg).toHaveProperty("topic");

      // Verify types match NetMessage
      expect(typeof msg.app).toBe("string");
      expect(msg.app.startsWith("0x")).toBe(true);
      expect(typeof msg.sender).toBe("string");
      expect(msg.sender.startsWith("0x")).toBe(true);
      expect(typeof msg.timestamp).toBe("bigint");
      expect(typeof msg.data).toBe("string");
      expect(msg.data.startsWith("0x")).toBe(true);
      expect(typeof msg.text).toBe("string");
      expect(typeof msg.topic).toBe("string");
    }

    await delay();
  });

  it("should revert for invalid range (out of bounds)", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    // Contract reverts with InvalidStartIndex when startIdx + 1 > querySetLength
    await expect(
      client.getMessages({
        chainId: BASE_CHAIN_ID,
        startIndex: 1000000,
        endIndex: 1000010,
      })
    ).rejects.toThrow();

    await delay();
  });

  it("should filter by appAddress", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;

    // First check if there are messages for this app
    const count = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress },
    });

    await delay();

    if (count === 0) {
      // Skip test if no messages exist
      expect(count).toBe(0);
      return;
    }

    const messages = await client.getMessages({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress },
      startIndex: 0,
      endIndex: Math.min(count, 10),
    });

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeLessThanOrEqual(Math.min(count, 10));

    messages.forEach((msg: NetMessage) => {
      expect(msg.app.toLowerCase()).toBe(appAddress.toLowerCase());
    });

    await delay();
  });

  it("should filter by appAddress and topic", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;
    const topic = BASE_TEST_ADDRESSES.NULL_ADDRESS;

    // First check if there are messages for this app+topic
    const count = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress, topic },
    });

    await delay();

    if (count === 0) {
      // Skip test if no messages exist
      expect(count).toBe(0);
      return;
    }

    const messages = await client.getMessages({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress, topic },
      startIndex: 0,
      endIndex: Math.min(count, 10),
    });

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeLessThanOrEqual(Math.min(count, 10));

    messages.forEach((msg: NetMessage) => {
      expect(msg.app.toLowerCase()).toBe(appAddress.toLowerCase());
      expect(msg.topic.toLowerCase()).toBe(topic.toLowerCase());
    });

    await delay();
  });

  it("should handle range queries correctly", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const totalCount = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
    });

    await delay();

    if (totalCount < 10) {
      // Skip if not enough messages
      expect(totalCount).toBeGreaterThanOrEqual(0);
      return;
    }

    const firstBatch = await client.getMessages({
      chainId: BASE_CHAIN_ID,
      startIndex: 0,
      endIndex: 5,
    });

    await delay();

    const secondBatch = await client.getMessages({
      chainId: BASE_CHAIN_ID,
      startIndex: 5,
      endIndex: 10,
    });

    expect(Array.isArray(firstBatch)).toBe(true);
    expect(Array.isArray(secondBatch)).toBe(true);

    // If both batches have messages, they should be different
    if (firstBatch.length > 0 && secondBatch.length > 0) {
      expect(firstBatch[0].timestamp).not.toEqual(secondBatch[0].timestamp);
    }

    await delay();
  });

  it("should work with UPVOTE_APP filter", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const appAddress = BASE_TEST_ADDRESSES.UPVOTE_APP;

    // First check if there are messages
    const count = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress },
    });

    await delay();

    if (count === 0) {
      expect(count).toBe(0);
      return;
    }

    const messages = await client.getMessages({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress },
      startIndex: 0,
      endIndex: Math.min(count, 5),
    });

    expect(Array.isArray(messages)).toBe(true);
    messages.forEach((msg: NetMessage) => {
      expect(msg.app.toLowerCase()).toBe(appAddress.toLowerCase());
    });

    await delay();
  });
});
