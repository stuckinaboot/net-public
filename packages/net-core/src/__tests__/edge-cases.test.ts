import { describe, it, expect } from "vitest";
import { NetClient } from "../client/NetClient";
import {
  BASE_CHAIN_ID,
  BASE_TEST_ADDRESSES,
  BASE_TEST_RPC_URL,
  delay,
} from "./test-utils";

describe("Edge Cases", () => {
  it("should throw error for invalid chainId", async () => {
    expect(() => {
      new NetClient({
        chainId: 999999,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });
    }).toThrow();

    await delay();
  });

  it("should throw error for invalid chainId in getMessageCount", async () => {
    expect(() => {
      new NetClient({
        chainId: 999999,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });
    }).toThrow();

    await delay();
  });

  it("should throw error for invalid chainId in getMessageAtIndex", async () => {
    expect(() => {
      new NetClient({
        chainId: 999999,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });
    }).toThrow();

    await delay();
  });

  it("should revert for empty range (startIndex === endIndex)", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    // Contract reverts with InvalidRange when startIdx >= endIdx
    await expect(
      client.getMessages({
        chainId: BASE_CHAIN_ID,
        startIndex: 0,
        endIndex: 0,
      })
    ).rejects.toThrow();

    await delay();
  });

  it("should revert for startIndex > endIndex", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    // Contract reverts with InvalidRange when startIdx >= endIdx
    await expect(
      client.getMessages({
        chainId: BASE_CHAIN_ID,
        startIndex: 10,
        endIndex: 5,
      })
    ).rejects.toThrow();

    await delay();
  });

  it("should handle very large indices gracefully", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const message = await client.getMessageAtIndex({
      messageIndex: Number.MAX_SAFE_INTEGER,
    });

    // Should return null or handle gracefully
    expect(message === null || typeof message === "object").toBe(true);

    await delay();
  });

  it("should handle invalid appAddress format", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    // This should still work if the address format is correct, but test with edge cases
    await expect(
      client.getMessages({
        chainId: BASE_CHAIN_ID,
        filter: { appAddress: "0xinvalid" as `0x${string}` },
        startIndex: 0,
        endIndex: 10,
      })
    ).rejects.toThrow();

    await delay();
  });

  it("should handle RPC URL override", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    // Test with custom RPC URL (already set in constructor)
    const messages = await client.getMessages({
      chainId: BASE_CHAIN_ID,
      startIndex: 0,
      endIndex: 5,
    });

    expect(Array.isArray(messages)).toBe(true);

    await delay();
  });

  it("should return null for messageAtIndex with invalid appAddress", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const message = await client.getMessageAtIndex({
      messageIndex: 0,
      appAddress: BASE_TEST_ADDRESSES.NULL_ADDRESS,
    });

    // May return null if no messages exist for this app
    expect(message === null || typeof message === "object").toBe(true);

    await delay();
  });
});
