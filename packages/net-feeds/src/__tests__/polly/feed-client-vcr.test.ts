/**
 * Polly.js VCR tests for FeedClient READ operations.
 *
 * These tests record and replay actual RPC calls to the blockchain,
 * allowing tests to run quickly without making real network requests.
 *
 * Run with POLLY_RECORD=true to create new recordings:
 *   POLLY_RECORD=true yarn vitest run src/__tests__/polly/feed-client-vcr.test.ts
 *
 * These tests use NetClient directly to test real blockchain RPC calls,
 * demonstrating Polly.js VCR functionality with actual network requests.
 */
import { describe, it, expect } from "vitest";
import { Polly } from "@pollyjs/core";
import NodeHttpAdapter from "@pollyjs/adapter-node-http";
import FetchAdapter from "@pollyjs/adapter-fetch";
import FSPersister from "@pollyjs/persister-fs";
import path from "path";
import { NetClient, NULL_ADDRESS } from "@net-protocol/core";
import { FeedClient } from "../../client/FeedClient";
import { BASE_CHAIN_ID, BASE_TEST_RPC_URL } from "../test-utils";

// Register Polly adapters and persister
Polly.register(FetchAdapter);
Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);

const RECORDINGS_DIR = path.join(__dirname, "recordings");
const shouldRecord = process.env.POLLY_RECORD === "true";

function createPolly(recordingName: string): Polly {
  return new Polly(recordingName, {
    adapters: ["fetch", "node-http"],
    persister: "fs",
    persisterOptions: { fs: { recordingsDir: RECORDINGS_DIR } },
    mode: shouldRecord ? "record" : "replay",
    recordIfMissing: shouldRecord,
    flushRequestsOnStop: true,
    matchRequestsBy: {
      headers: { exclude: ["user-agent", "accept-encoding", "connection", "host"] },
      body: true,
      order: false,
    },
    logging: false,
  });
}

describe("FeedClient VCR Tests - READ Operations", () => {
  /**
   * Test: getFeedPostCount returns a count for a feed topic
   *
   * This tests the basic ability to query the message count from the
   * Net Protocol contract for a feed topic.
   */
  it("should get feed post count for a topic", async () => {
    const polly = createPolly("feed-client-get-post-count");

    try {
      const client = new FeedClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Query count for any topic - we just care that RPC works
      const count = await client.getFeedPostCount("test-topic");

      // The count should be a non-negative number
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    } finally {
      await polly.stop();
    }
  });

  /**
   * Test: Topic normalization is idempotent
   *
   * Whether we pass "test" or "feed-test", the result should be the same.
   */
  it("should handle already-prefixed topics correctly", async () => {
    const polly = createPolly("feed-client-prefixed-topic");

    try {
      const client = new FeedClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Both should query the same topic
      const count1 = await client.getFeedPostCount("test");
      const count2 = await client.getFeedPostCount("feed-test");

      expect(count1).toBe(count2);
    } finally {
      await polly.stop();
    }
  });

  /**
   * Test: Consistent data across multiple requests
   *
   * When replaying, the same request should return consistent data.
   */
  it("should return consistent data across multiple requests", async () => {
    const polly = createPolly("feed-client-consistent-data");

    try {
      const client = new FeedClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Make the same request twice
      const count1 = await client.getFeedPostCount("test");
      const count2 = await client.getFeedPostCount("test");

      // Should return the same count (from replay)
      expect(count1).toBe(count2);
    } finally {
      await polly.stop();
    }
  });

  /**
   * Test: Query an empty or non-existent feed topic
   *
   * Querying a topic with no messages should return 0 count.
   */
  it("should return zero count for non-existent topics", async () => {
    const polly = createPolly("feed-client-empty-topic-count");

    try {
      const client = new FeedClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Use a unique topic name unlikely to have posts
      const count = await client.getFeedPostCount("nonexistent-test-topic-xyz-12345");

      expect(typeof count).toBe("number");
      expect(count).toBe(0);
    } finally {
      await polly.stop();
    }
  });
});

describe("NetClient VCR Tests - Direct RPC Operations", () => {
  /**
   * Test: Get global message count from Net Protocol contract
   *
   * This demonstrates VCR recording of actual RPC calls to blockchain.
   */
  it("should get total global message count", async () => {
    const polly = createPolly("net-client-global-message-count");

    try {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Get total message count (no filter = all messages)
      const count = await client.getMessageCount({});

      // The global count should be positive (there are messages on the contract)
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThan(0);
    } finally {
      await polly.stop();
    }
  });

  /**
   * Test: Get messages from the global index
   *
   * This tests fetching actual messages from the contract.
   */
  it("should get messages from global index", async () => {
    const polly = createPolly("net-client-get-messages");

    try {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Get first 3 messages globally
      const messages = await client.getMessages({
        startIndex: 0,
        endIndex: 3,
      });

      // Should return an array with messages
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(3);

      // Verify the structure of messages
      const firstMessage = messages[0];
      expect(firstMessage).toHaveProperty("sender");
      expect(firstMessage).toHaveProperty("text");
      expect(firstMessage).toHaveProperty("topic");
      expect(firstMessage).toHaveProperty("timestamp");
      expect(firstMessage).toHaveProperty("data");
      expect(firstMessage).toHaveProperty("app");
    } finally {
      await polly.stop();
    }
  });

  /**
   * Test: Get message at specific index
   *
   * Tests the getMessageAtIndex functionality.
   */
  it("should get message at specific index", async () => {
    const polly = createPolly("net-client-message-at-index");

    try {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Get message at index 0
      const message = await client.getMessageAtIndex({
        messageIndex: 0,
      });

      // Should return a message
      expect(message).not.toBeNull();
      expect(message).toHaveProperty("sender");
      expect(message).toHaveProperty("text");
      expect(message).toHaveProperty("topic");
    } finally {
      await polly.stop();
    }
  });

  /**
   * Test: Get message count for specific app (null address = feed messages)
   *
   * Tests filtering by app address.
   */
  it("should get message count for null app address", async () => {
    const polly = createPolly("net-client-app-message-count");

    try {
      const client = new NetClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Get count for null address app (feed messages)
      const count = await client.getMessageCount({
        filter: {
          appAddress: NULL_ADDRESS as `0x${string}`,
        },
      });

      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    } finally {
      await polly.stop();
    }
  });
});
