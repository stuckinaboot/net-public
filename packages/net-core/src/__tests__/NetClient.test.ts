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
