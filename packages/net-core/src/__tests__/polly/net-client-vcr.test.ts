/**
 * Polly.js VCR tests for NetClient READ operations.
 *
 * These tests record HTTP responses from blockchain RPC endpoints and replay them
 * for fast, deterministic testing without hitting live endpoints.
 *
 * To record new fixtures:
 *   POLLY_RECORD=true yarn test
 *
 * Without POLLY_RECORD, tests will replay from recorded fixtures.
 */
import { describe, it, expect } from "vitest";
import { createPolly } from "./setup";
import { NetClient } from "../../client/NetClient";
import { BASE_CHAIN_ID, BASE_TEST_ADDRESSES, BASE_TEST_RPC_URL } from "../test-utils";
import type { NetMessage } from "../../types";

describe("NetClient VCR Tests", () => {
  describe("getMessageCount", () => {
    it("should return total message count", async () => {
      const polly = createPolly("net-client-total-message-count");

      try {
        const client = new NetClient({
          chainId: BASE_CHAIN_ID,
          overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
        });

        const count = await client.getMessageCount({});

        expect(typeof count).toBe("number");
        expect(count).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(count)).toBe(true);
      } finally {
        await polly.stop();
      }
    });

    it("should return message count for Bazaar app", async () => {
      const polly = createPolly("net-client-bazaar-message-count");

      try {
        const client = new NetClient({
          chainId: BASE_CHAIN_ID,
          overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
        });

        const count = await client.getMessageCount({
          filter: { appAddress: BASE_TEST_ADDRESSES.BAZAAR_CONTRACT },
        });

        expect(typeof count).toBe("number");
        expect(count).toBeGreaterThanOrEqual(0);
      } finally {
        await polly.stop();
      }
    });

    it("should return message count for Upvote app", async () => {
      const polly = createPolly("net-client-upvote-message-count");

      try {
        const client = new NetClient({
          chainId: BASE_CHAIN_ID,
          overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
        });

        const count = await client.getMessageCount({
          filter: { appAddress: BASE_TEST_ADDRESSES.UPVOTE_APP },
        });

        expect(typeof count).toBe("number");
        expect(count).toBeGreaterThanOrEqual(0);
      } finally {
        await polly.stop();
      }
    });

    it("should return message count with topic filter", async () => {
      const polly = createPolly("net-client-message-count-with-topic");

      try {
        const client = new NetClient({
          chainId: BASE_CHAIN_ID,
          overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
        });

        const count = await client.getMessageCount({
          filter: {
            appAddress: BASE_TEST_ADDRESSES.BAZAAR_CONTRACT,
            topic: BASE_TEST_ADDRESSES.NULL_ADDRESS,
          },
        });

        expect(typeof count).toBe("number");
        expect(count).toBeGreaterThanOrEqual(0);
      } finally {
        await polly.stop();
      }
    });
  });

  describe("getMessages", () => {
    it("should return messages in range", async () => {
      const polly = createPolly("net-client-get-messages-range");

      try {
        const client = new NetClient({
          chainId: BASE_CHAIN_ID,
          overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
        });

        const messages = await client.getMessages({
          startIndex: 0,
          endIndex: 5,
        });

        expect(Array.isArray(messages)).toBe(true);
        expect(messages.length).toBeLessThanOrEqual(5);

        // Verify message structure if messages exist
        if (messages.length > 0) {
          const msg = messages[0] as NetMessage;
          expect(msg).toHaveProperty("app");
          expect(msg).toHaveProperty("sender");
          expect(msg).toHaveProperty("timestamp");
          expect(msg).toHaveProperty("data");
          expect(msg).toHaveProperty("text");
          expect(msg).toHaveProperty("topic");

          // Verify types
          expect(typeof msg.app).toBe("string");
          expect(msg.app.startsWith("0x")).toBe(true);
          expect(typeof msg.sender).toBe("string");
          expect(msg.sender.startsWith("0x")).toBe(true);
          expect(typeof msg.timestamp).toBe("bigint");
        }
      } finally {
        await polly.stop();
      }
    });

    it("should return messages filtered by app address", async () => {
      const polly = createPolly("net-client-get-messages-by-app");

      try {
        const client = new NetClient({
          chainId: BASE_CHAIN_ID,
          overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
        });

        const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;

        // First get count to know how many messages exist
        const count = await client.getMessageCount({
          filter: { appAddress },
        });

        if (count > 0) {
          const messages = await client.getMessages({
            filter: { appAddress },
            startIndex: 0,
            endIndex: Math.min(count, 5),
          });

          expect(Array.isArray(messages)).toBe(true);

          // All messages should be from the specified app
          messages.forEach((msg: NetMessage) => {
            expect(msg.app.toLowerCase()).toBe(appAddress.toLowerCase());
          });
        }
      } finally {
        await polly.stop();
      }
    });

    it("should return messages filtered by app and topic", async () => {
      const polly = createPolly("net-client-get-messages-by-app-topic");

      try {
        const client = new NetClient({
          chainId: BASE_CHAIN_ID,
          overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
        });

        const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;
        const topic = BASE_TEST_ADDRESSES.NULL_ADDRESS;

        const count = await client.getMessageCount({
          filter: { appAddress, topic },
        });

        if (count > 0) {
          const messages = await client.getMessages({
            filter: { appAddress, topic },
            startIndex: 0,
            endIndex: Math.min(count, 5),
          });

          expect(Array.isArray(messages)).toBe(true);

          messages.forEach((msg: NetMessage) => {
            expect(msg.app.toLowerCase()).toBe(appAddress.toLowerCase());
            expect(msg.topic.toLowerCase()).toBe(topic.toLowerCase());
          });
        }
      } finally {
        await polly.stop();
      }
    });
  });

  describe("getMessageAtIndex", () => {
    it("should return message at specific index", async () => {
      const polly = createPolly("net-client-get-message-at-index");

      try {
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
      } finally {
        await polly.stop();
      }
    });

    it("should return null for invalid index", async () => {
      const polly = createPolly("net-client-get-message-invalid-index");

      try {
        const client = new NetClient({
          chainId: BASE_CHAIN_ID,
          overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
        });

        const message = await client.getMessageAtIndex({
          messageIndex: 999999999,
        });

        expect(message).toBeNull();
      } finally {
        await polly.stop();
      }
    });

    it("should return message at index for specific app", async () => {
      const polly = createPolly("net-client-get-message-at-index-for-app");

      try {
        const client = new NetClient({
          chainId: BASE_CHAIN_ID,
          overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
        });

        const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;

        // Check if there are messages first
        const count = await client.getMessageCount({
          filter: { appAddress },
        });

        if (count > 0) {
          const message = await client.getMessageAtIndex({
            messageIndex: 0,
            appAddress,
          });

          if (message) {
            expect(message.app.toLowerCase()).toBe(appAddress.toLowerCase());
          }
        }
      } finally {
        await polly.stop();
      }
    });
  });

  describe("getMessagesBatch", () => {
    it("should batch fetch messages correctly", async () => {
      const polly = createPolly("net-client-get-messages-batch");

      try {
        const client = new NetClient({
          chainId: BASE_CHAIN_ID,
          overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
        });

        // First check if there are enough messages
        const totalCount = await client.getMessageCount({});

        if (totalCount >= 10) {
          const batchMessages = await client.getMessagesBatch({
            startIndex: 0,
            endIndex: 10,
            batchCount: 2,
          });

          expect(Array.isArray(batchMessages)).toBe(true);
          expect(batchMessages.length).toBeLessThanOrEqual(10);
        }
      } finally {
        await polly.stop();
      }
    });

    it("should handle empty range", async () => {
      const polly = createPolly("net-client-get-messages-batch-empty");

      try {
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
      } finally {
        await polly.stop();
      }
    });
  });

  describe("Replay consistency", () => {
    it("should return consistent data on replay", async () => {
      const polly = createPolly("net-client-replay-consistency");

      try {
        const client = new NetClient({
          chainId: BASE_CHAIN_ID,
          overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
        });

        // Make two identical requests
        const count1 = await client.getMessageCount({});
        const count2 = await client.getMessageCount({});

        // In replay mode, these should be identical
        // In record mode, they might differ slightly if new messages were added
        expect(typeof count1).toBe("number");
        expect(typeof count2).toBe("number");
        expect(count2).toBeGreaterThanOrEqual(count1);
      } finally {
        await polly.stop();
      }
    });
  });
});
