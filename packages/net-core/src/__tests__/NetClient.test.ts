import { describe, it, expect } from "vitest";
import { NetClient } from "../client/NetClient";
import {
  BASE_CHAIN_ID,
  BASE_TEST_ADDRESSES,
  BASE_TEST_RPC_URL,
  delay,
  findAbiFunction,
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
        startIndex: 0,
        endIndex: 10,
      });

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeLessThanOrEqual(10);

      // Compare first few messages if they exist
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

      // Check count first
      const count = await client.getMessageCount({
        filter: { appAddress },
      });

      await delay();

      if (count === 0) {
        expect(count).toBe(0);
        return;
      }

      const messages = await client.getMessages({
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
        filter: { appAddress, topic },
      });

      await delay();

      if (count === 0) {
        expect(count).toBe(0);
        return;
      }

      const messages = await client.getMessages({
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

    it("should handle range queries correctly", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const totalCount = await client.getMessageCount({});

      await delay();

      if (totalCount < 10) {
        // Skip if not enough messages
        expect(totalCount).toBeGreaterThanOrEqual(0);
        return;
      }

      const firstBatch = await client.getMessages({
        startIndex: 0,
        endIndex: 5,
      });

      await delay();

      const secondBatch = await client.getMessages({
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
        filter: { appAddress },
      });

      await delay();

      if (count === 0) {
        expect(count).toBe(0);
        return;
      }

      const messages = await client.getMessages({
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

  describe("getMessageCount", () => {
    it("should return count", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const count = await client.getMessageCount({});

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
        filter: { appAddress },
      });

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);

      await delay();
    });

    it("should return count for appAddress and topic", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;
      const topic = BASE_TEST_ADDRESSES.NULL_ADDRESS;

      const count = await client.getMessageCount({
        filter: { appAddress, topic },
      });

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);

      await delay();
    });

    it("should return count for appAddress, topic, and maker", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;
      const topic = BASE_TEST_ADDRESSES.NULL_ADDRESS;
      const maker = BASE_TEST_ADDRESSES.NULL_ADDRESS; // Using NULL as test maker

      const count = await client.getMessageCount({
        filter: { appAddress, topic, maker },
      });

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);

      await delay();
    });

    it("should return count for UPVOTE_APP", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const count = await client.getMessageCount({
        filter: { appAddress: BASE_TEST_ADDRESSES.UPVOTE_APP },
      });

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);

      await delay();
    });

    it("should return count for SCORE_CONTRACT", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const count = await client.getMessageCount({
        filter: { appAddress: BASE_TEST_ADDRESSES.SCORE_CONTRACT },
      });

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);

      await delay();
    });

    it("should return consistent counts within short time window", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const count1 = await client.getMessageCount({
        filter: { appAddress: BASE_TEST_ADDRESSES.BAZAAR_CONTRACT },
      });

      await delay();

      const count2 = await client.getMessageCount({
        filter: { appAddress: BASE_TEST_ADDRESSES.BAZAAR_CONTRACT },
      });

      // Counts should be the same or count2 should be >= count1 (if new messages were added)
      expect(count2).toBeGreaterThanOrEqual(count1);

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
      const totalCount = await client.getMessageCount({});

      await delay();

      if (totalCount < 20) {
        expect(totalCount).toBeGreaterThanOrEqual(0);
        return;
      }

      const batchMessages = await client.getMessagesBatch({
        startIndex: 0,
        endIndex: 20,
        batchCount: 4,
      });

      await delay();

      const directMessages = await client.getMessages({
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

    it("should return message for appAddress and topic", async () => {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;
      const topic = BASE_TEST_ADDRESSES.NULL_ADDRESS;

      const count = await client.getMessageCount({
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

  describe("prepareSendMessage", () => {
    const createClient = () =>
      new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

    it("should return correct transaction config structure", () => {
      const client = createClient();
      const config = client.prepareSendMessage({
        text: "Hello Net!",
        topic: "greeting",
      });

      // Verify structure
      expect(config).toHaveProperty("to");
      expect(config).toHaveProperty("functionName");
      expect(config).toHaveProperty("args");
      expect(config).toHaveProperty("abi");

      // Verify types
      expect(config.to).toMatch(/^0x[a-fA-F0-9]{40}$/); // Valid address
      expect(config.functionName).toBe("sendMessage");
      expect(Array.isArray(config.args)).toBe(true);
      expect(Array.isArray(config.abi)).toBe(true); // ABI is array

      // Verify contract address matches Net contract
      expect(config.to).toBe(NET_CONTRACT_ADDRESS);
    });

    it("should format args correctly", () => {
      const client = createClient();
      const config = client.prepareSendMessage({
        text: "Test",
        topic: "test",
      });

      expect(config.args).toEqual(["Test", "test", "0x"]);
    });

    it("should convert plain string data to hex", () => {
      const client = createClient();
      const config = client.prepareSendMessage({
        text: "Hello",
        topic: "",
        data: "test",
      });

      expect(config.args[2]).toBe("0x74657374"); // "test" as hex
    });

    it("should use hex string data as-is", () => {
      const client = createClient();
      const config = client.prepareSendMessage({
        text: "Hello",
        topic: "",
        data: "0x1234",
      });

      expect(config.args[2]).toBe("0x1234");
    });

    it("should use empty bytes when data not provided", () => {
      const client = createClient();
      const config = client.prepareSendMessage({
        text: "Hello",
        topic: "",
      });

      expect(config.args[2]).toBe("0x");
    });

    it("should reject empty message (no text or data)", () => {
      const client = createClient();
      expect(() => {
        client.prepareSendMessage({
          text: "",
          topic: "",
        });
      }).toThrow("Message must have non-empty text or data");
    });

    it("should accept message with only text", () => {
      const client = createClient();
      const config = client.prepareSendMessage({
        text: "Hello",
        topic: "",
      });
      expect(config).toBeDefined();
    });

    it("should accept message with only data", () => {
      const client = createClient();
      const config = client.prepareSendMessage({
        text: "",
        topic: "",
        data: "0x1234",
      });
      expect(config).toBeDefined();
    });

    it("should handle unicode characters", () => {
      const client = createClient();
      const config = client.prepareSendMessage({
        text: "Hello 世界",
        topic: "test",
      });

      expect(config.args[0]).toBe("Hello 世界");
    });

    it("should use correct function name", () => {
      const client = createClient();
      const config = client.prepareSendMessage({
        text: "test",
        topic: "test",
      });

      expect(config.functionName).toBe("sendMessage");

      // Verify function exists in ABI
      const sendMessageFunction = findAbiFunction(config.abi, "sendMessage");
      expect(sendMessageFunction).toBeDefined();
      expect(sendMessageFunction!.inputs.length).toBe(3); // text, topic, data
    });
  });

  describe("prepareSendMessageViaApp", () => {
    const createClient = () =>
      new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

    it("should return correct transaction config structure", () => {
      const client = createClient();
      const config = client.prepareSendMessageViaApp({
        sender: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        text: "User action",
        topic: "action",
        appAddress: "0x1234567890123456789012345678901234567890",
      });

      expect(config.to).toBe(NET_CONTRACT_ADDRESS);
      expect(config.functionName).toBe("sendMessageViaApp");
      expect(Array.isArray(config.args)).toBe(true);
      expect(config.args.length).toBe(4); // sender, text, topic, data
    });

    it("should format args correctly", () => {
      const client = createClient();
      const config = client.prepareSendMessageViaApp({
        sender: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        text: "Test",
        topic: "test",
        appAddress: "0x1234567890123456789012345678901234567890",
      });

      expect(config.args[0]).toBe("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb");
      expect(config.args[1]).toBe("Test");
      expect(config.args[2]).toBe("test");
      expect(config.args[3]).toBe("0x");
    });

    it("should reject empty message", () => {
      const client = createClient();
      expect(() => {
        client.prepareSendMessageViaApp({
          sender: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          text: "",
          topic: "",
          appAddress: "0x1234567890123456789012345678901234567890",
        });
      }).toThrow("Message must have non-empty text or data");
    });

    it("should use correct function name", () => {
      const client = createClient();
      const config = client.prepareSendMessageViaApp({
        sender: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        text: "test",
        topic: "test",
        appAddress: "0x1234567890123456789012345678901234567890",
      });

      expect(config.functionName).toBe("sendMessageViaApp");

      // Verify function exists in ABI
      const functionDef = findAbiFunction(config.abi, "sendMessageViaApp");
      expect(functionDef).toBeDefined();
      expect(functionDef!.inputs.length).toBe(4); // sender, text, topic, data
    });
  });
});
