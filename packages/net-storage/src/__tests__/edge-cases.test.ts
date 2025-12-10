import { describe, it, expect } from "vitest";
import { StorageClient } from "../client/StorageClient";
import { BASE_CHAIN_ID, BASE_TEST_RPC_URL, delay } from "./test-utils";

describe("StorageClient Edge Cases", () => {
  describe("Invalid Chain ID", () => {
    it("should throw error for unsupported chain ID", () => {
      expect(() => {
        new StorageClient({
          chainId: 999999,
          overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
        });
      }).toThrow();
    });
  });

  describe("Invalid RPC URLs", () => {
    it("should handle invalid RPC URL gracefully", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: ["https://invalid-rpc-url.com"] },
      });

      // Should either throw or return null/empty results
      try {
        const result = await client.get({
          key: "test",
          operator: "0x" + "0".repeat(40),
        });
        // If it doesn't throw, result should be null
        expect(result).toBeNull();
      } catch (error) {
        // Error is acceptable for invalid RPC
        expect(error).toBeDefined();
      }

      await delay();
    });
  });

  describe("Invalid Inputs", () => {
    it("should handle empty key", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const result = await client.get({
        key: "",
        operator: "0x" + "0".repeat(40),
      });

      // Empty key should either return null or valid data
      expect(result === null || Array.isArray(result)).toBe(true);
      await delay();
    });

    it("should handle invalid operator address format", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Invalid address should either throw or return null
      try {
        const result = await client.get({
          key: "test",
          operator: "invalid-address",
        });
        expect(result).toBeNull();
      } catch (error) {
        // Error is acceptable for invalid address
        expect(error).toBeDefined();
      }

      await delay();
    });

    it("should handle negative index", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Negative index should return null or throw
      try {
        const result = await client.getValueAtIndex({
          key: "test",
          operator: "0x" + "0".repeat(40),
          index: -1,
        });
        expect(result).toBeNull();
      } catch (error) {
        // Error is acceptable for negative index
        expect(error).toBeDefined();
      }

      await delay();
    });
  });

  describe("Boundary Conditions", () => {
    it("should handle very large index", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const result = await client.getValueAtIndex({
        key: "test",
        operator: "0x" + "0".repeat(40),
        index: Number.MAX_SAFE_INTEGER,
      });

      expect(result).toBeNull();
      await delay();
    });

    it("should handle very long key", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const longKey = "a".repeat(10000);
      const result = await client.get({
        key: longKey,
        operator: "0x" + "0".repeat(40),
      });

      // Should handle long keys (they get hashed)
      expect(result === null || Array.isArray(result)).toBe(true);
      await delay();
    });
  });

  describe("RPC URL Overrides", () => {
    it("should use custom RPC URL when provided", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Should work with custom RPC
      const result = await client.get({
        key: "test",
        operator: "0x" + "0".repeat(40),
      });

      expect(result === null || Array.isArray(result)).toBe(true);
      await delay();
    });

    it("should handle multiple RPC URLs", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: {
          rpcUrls: [BASE_TEST_RPC_URL, "https://mainnet.base.org"],
        },
      });

      const result = await client.get({
        key: "test",
        operator: "0x" + "0".repeat(40),
      });

      expect(result === null || Array.isArray(result)).toBe(true);
      await delay();
    });
  });
});
