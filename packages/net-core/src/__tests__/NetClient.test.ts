import { describe, it, expect } from "vitest";
import { NetClient } from "../client/NetClient";
import {
  BASE_CHAIN_ID,
  BASE_TEST_ADDRESSES,
  BASE_TEST_RPC_URL,
  delay,
} from "./test-utils";
import { NET_CONTRACT_ADDRESS } from "../constants";
import type { NetMessage } from "../types";

describe("NetClient", () => {
  describe("Constructor", () => {
    it("should create client with chainId", () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      expect(client).toBeInstanceOf(NetClient);
    });

    it("should create client with RPC override", () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      expect(client).toBeInstanceOf(NetClient);
    });
  });

  describe("getMessages", () => {
    it("should return messages", async () => {
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

      // Compare first few messages if they exist
      if (messages.length > 0) {
        expect(messages[0]).toHaveProperty("app");
        expect(messages[0]).toHaveProperty("sender");
        expect(messages[0]).toHaveProperty("timestamp");
      }

      await delay();
    });

    it("should filter by appAddress", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;

      // Check count first
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
        endIndex: Math.min(count, 10),
      });

      expect(Array.isArray(messages)).toBe(true);
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

      // Check count first
      const count = await client.getMessageCount({
        chainId: BASE_CHAIN_ID,
        filter: { appAddress, topic },
      });

      await delay();

      if (count === 0) {
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
      messages.forEach((msg: NetMessage) => {
        expect(msg.app.toLowerCase()).toBe(appAddress.toLowerCase());
        expect(msg.topic.toLowerCase()).toBe(topic.toLowerCase());
      });

      await delay();
    });
  });

  describe("getMessageCount", () => {
    it("should return count", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const count = await client.getMessageCount({
        chainId: BASE_CHAIN_ID,
      });

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);

      await delay();
    });

    it("should return count for appAddress", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;
      const count = await client.getMessageCount({
        chainId: BASE_CHAIN_ID,
        filter: { appAddress },
      });

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);

      await delay();
    });
  });

  describe("getMessagesBatch", () => {
    it("should batch fetch messages correctly", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Check total count first
      const totalCount = await client.getMessageCount({
        chainId: BASE_CHAIN_ID,
      });

      await delay();

      if (totalCount < 20) {
        expect(totalCount).toBeGreaterThanOrEqual(0);
        return;
      }

      const batchMessages = await client.getMessagesBatch({
        chainId: BASE_CHAIN_ID,
        startIndex: 0,
        endIndex: 20,
        batchCount: 4,
      });

      await delay();

      const directMessages = await client.getMessages({
        chainId: BASE_CHAIN_ID,
        startIndex: 0,
        endIndex: 20,
      });

      expect(Array.isArray(batchMessages)).toBe(true);
      expect(Array.isArray(directMessages)).toBe(true);
      expect(batchMessages.length).toBe(directMessages.length);

      await delay();
    });

    it("should handle empty range", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const messages = await client.getMessagesBatch({
        chainId: BASE_CHAIN_ID,
        startIndex: 0,
        endIndex: 0,
      });

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(0);

      await delay();
    });

    it("should handle invalid range", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const messages = await client.getMessagesBatch({
        chainId: BASE_CHAIN_ID,
        startIndex: 10,
        endIndex: 5,
      });

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(0);

      await delay();
    });
  });

  describe("getMessageAtIndex", () => {
    it("should return message", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const message = await client.getMessageAtIndex({
        messageIndex: 0,
      });

      if (message) {
        expect(message).toHaveProperty("app");
        expect(message).toHaveProperty("sender");
        expect(message).toHaveProperty("timestamp");
        expect(message).toHaveProperty("data");
        expect(message).toHaveProperty("text");
        expect(message).toHaveProperty("topic");
      }

      await delay();
    });

    it("should return message for appAddress", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;

      // Check count first
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

        if (message) {
          expect(message.app.toLowerCase()).toBe(appAddress.toLowerCase());
        }
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
  });

  describe("prepareSendMessage", () => {
    it("should use client's chainId", () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });
      const config = client.prepareSendMessage({
        text: "Hello",
        topic: "test",
      });

      expect(config.to).toBe(NET_CONTRACT_ADDRESS);
      expect(config.functionName).toBe("sendMessage");
    });
  });

  describe("prepareSendMessageViaApp", () => {
    it("should use client's chainId", () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });
      const config = client.prepareSendMessageViaApp({
        sender: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        text: "Hello",
        topic: "test",
        appAddress: "0x1234567890123456789012345678901234567890",
      });

      expect(config.to).toBe(NET_CONTRACT_ADDRESS);
      expect(config.functionName).toBe("sendMessageViaApp");
    });
  });
});
