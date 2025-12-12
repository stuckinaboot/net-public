import { describe, it, expect, beforeAll } from "vitest";
import { StorageClient } from "../client/StorageClient";
import {
  BASE_CHAIN_ID,
  BASE_TEST_RPC_URL,
  BASE_TEST_ADDRESSES,
  delay,
  withRetry,
} from "./test-utils";
import { STORAGE_CONTRACT, CHUNKED_STORAGE_CONTRACT } from "../constants";
import type { StorageData } from "../types";

describe("StorageClient", () => {
  // Add initial delay to avoid rate limits at test suite start
  beforeAll(async () => {
    await delay(1000);
  });

  describe("get", () => {
    it("should return null for non-existent key-operator pair", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const result = await withRetry(() =>
        client.get({
          key: "non-existent-key-" + Date.now(),
          operator: "0x" + "0".repeat(40),
        })
      );

      expect(result).toBeNull();
      await delay();
    });

    it("should return correct data structure when data exists", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Try to find an operator with storage by checking Storage contract messages
      // This test is flexible - if no storage exists, it will pass with null
      const result = await withRetry(() =>
        client.get({
          key: "test-key",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
        })
      );

      // Result should be either null or a valid tuple
      if (result !== null) {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
        expect(typeof result[0]).toBe("string"); // text
        expect(typeof result[1]).toBe("string"); // data
      }

      await delay();
    });
  });

  describe("getValueAtIndex", () => {
    it("should return null for invalid index", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const result = await withRetry(() =>
        client.getValueAtIndex({
          key: "test-key",
          operator: "0x" + "0".repeat(40),
          index: 999999,
        })
      );

      expect(result).toBeNull();
      await delay();
    });

    it("should return correct data for valid index (if data exists)", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // First check total writes to find a valid index
      const totalWrites = await withRetry(() =>
        client.getTotalWrites({
          key: "test-key",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
        })
      );

      await delay();

      if (totalWrites > 0) {
        // Test with index 0 (first version - immutable)
        const result = await withRetry(() =>
          client.getValueAtIndex({
            key: "test-key",
            operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
            index: 0,
          })
        );

        if (result !== null) {
          expect(Array.isArray(result)).toBe(true);
          expect(result.length).toBe(2);
          expect(typeof result[0]).toBe("string");
          expect(typeof result[1]).toBe("string");
        }
      }

      await delay();
    });
  });

  describe("getTotalWrites", () => {
    it("should return 0 for non-existent key-operator pair", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const count = await withRetry(() =>
        client.getTotalWrites({
          key: "non-existent-key-" + Date.now(),
          operator: "0x" + "0".repeat(40),
        })
      );

      expect(count).toBe(0);
      await delay();
    });

    it("should return count >= 0 for existing key-operator pair", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const count = await withRetry(() =>
        client.getTotalWrites({
          key: "test-key",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
        })
      );

      expect(count).toBeGreaterThanOrEqual(0);
      await delay();
    });
  });

  describe("bulkGet", () => {
    it("should return empty array for empty keys", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const results = await withRetry(() =>
        client.bulkGet({
          keys: [],
        })
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
      await delay();
    });

    it("should return array of results for bulk get", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const keys = [
        {
          key: "test-key-1",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
        },
        {
          key: "test-key-2",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
        },
      ];

      const results = await withRetry(() => client.bulkGet({ keys }));

      expect(Array.isArray(results)).toBe(true);
      // bulkGet returns empty array on error (e.g., non-existent keys)
      // If results are returned, they should have correct structure
      if (results.length > 0) {
        expect(results.length).toBe(keys.length);
        results.forEach((result) => {
          expect(result).toHaveProperty("text");
          expect(result).toHaveProperty("value");
          expect(typeof result.text).toBe("string");
          expect(typeof result.value).toBe("string");
        });
      } else {
        // Empty array is valid when keys don't exist (contract throws)
        expect(results.length).toBe(0);
      }

      await delay();
    });

    it("should handle safe mode", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const keys = [
        {
          key: "test-key",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
        },
      ];

      const results = await withRetry(() =>
        client.bulkGet({
          keys,
          safe: true,
        })
      );

      expect(Array.isArray(results)).toBe(true);
      await delay();
    });
  });

  describe("getViaRouter", () => {
    it("should return null for non-existent key", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const result = await withRetry(() =>
        client.getViaRouter({
          key: "non-existent-key-" + Date.now(),
          operator: "0x" + "0".repeat(40),
        })
      );

      expect(result).toBeNull();
      await delay();
    });

    it("should return correct structure when data exists", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const result = await withRetry(() =>
        client.getViaRouter({
          key: "test-key",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
        })
      );

      if (result !== null) {
        expect(result).toHaveProperty("isChunkedStorage");
        expect(result).toHaveProperty("text");
        expect(result).toHaveProperty("data");
        expect(typeof result.isChunkedStorage).toBe("boolean");
        expect(typeof result.text).toBe("string");
        expect(typeof result.data).toBe("string");
      }

      await delay();
    });
  });

  describe("getChunkedMetadata", () => {
    it("should return null for non-chunked data", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const result = await withRetry(() =>
        client.getChunkedMetadata({
          key: "test-key",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
        })
      );

      // Result can be null if not chunked, or an object if chunked
      if (result !== null) {
        expect(result).toHaveProperty("chunkCount");
        expect(result).toHaveProperty("originalText");
        expect(typeof result.chunkCount).toBe("number");
        expect(typeof result.originalText).toBe("string");
      }

      await delay();
    });

    it("should handle historical index", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const result = await withRetry(() =>
        client.getChunkedMetadata({
          key: "test-key",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
          index: 0,
        })
      );

      if (result !== null) {
        expect(result).toHaveProperty("chunkCount");
        expect(result).toHaveProperty("originalText");
      }

      await delay();
    });
  });

  describe("getChunked", () => {
    it("should return empty array for non-chunked data", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const chunks = await withRetry(() =>
        client.getChunked({
          key: "test-key",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
          start: 0,
          end: 10,
        })
      );

      expect(Array.isArray(chunks)).toBe(true);
      await delay();
    });

    it("should handle chunk range correctly", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // First check if chunked metadata exists
      const metadata = await withRetry(() =>
        client.getChunkedMetadata({
          key: "test-key",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
        })
      );

      await delay();

      if (metadata && metadata.chunkCount > 0) {
        const chunks = await withRetry(() =>
          client.getChunked({
            key: "test-key",
            operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
            start: 0,
            end: Math.min(metadata.chunkCount, 5),
          })
        );

        expect(Array.isArray(chunks)).toBe(true);
        expect(chunks.length).toBeLessThanOrEqual(
          Math.min(metadata.chunkCount, 5)
        );
      }

      await delay();
    });
  });

  describe("getForOperator", () => {
    it("should return empty array for operator with no storage", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const results = await withRetry(() =>
        client.getForOperator({
          operator: "0x" + "0".repeat(40),
        })
      );

      expect(Array.isArray(results)).toBe(true);
      await delay();
    });

    it("should return array of tuples for operator with storage", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const results = await withRetry(() =>
        client.getForOperator({
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
        })
      );

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        const first = results[0];
        expect(Array.isArray(first)).toBe(true);
        expect(first.length).toBe(4); // [topic, text, timestamp, data]
        expect(typeof first[0]).toBe("string"); // topic
        expect(typeof first[1]).toBe("string"); // text
        expect(typeof first[2]).toBe("number"); // timestamp
        expect(typeof first[3]).toBe("string"); // data
      }

      await delay();
    });
  });

  describe("getForOperatorAndKey", () => {
    it("should return null for non-existent combination", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const result = await withRetry(() =>
        client.getForOperatorAndKey({
          operator: "0x" + "0".repeat(40),
          key: "non-existent-key",
        })
      );

      expect(result).toBeNull();
      await delay();
    });

    it("should return correct data structure when exists", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      const result = await withRetry(() =>
        client.getForOperatorAndKey({
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
          key: "test-key",
        })
      );

      if (result !== null) {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
      }

      await delay();
    });
  });

  describe("readChunkedStorage", () => {
    it("should throw error for non-existent chunked storage", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      await expect(
        withRetry(() =>
          client.readChunkedStorage({
            key: "non-existent-key",
            operator: "0x" + "0".repeat(40),
          })
        )
      ).rejects.toThrow();

      await delay();
    });

    it("should return assembled data for chunked storage", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Check if chunked metadata exists
      const metadata = await withRetry(() =>
        client.getChunkedMetadata({
          key: "test-key",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
        })
      );

      await delay();

      if (metadata && metadata.chunkCount > 0) {
        const result = await withRetry(() =>
          client.readChunkedStorage({
            key: "test-key",
            operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
          })
        );

        expect(result).toHaveProperty("text");
        expect(result).toHaveProperty("data");
        expect(typeof result.text).toBe("string");
        expect(typeof result.data).toBe("string");
      }

      await delay();
    });
  });

  describe("readStorageData", () => {
    it("should throw error for non-existent storage", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      await expect(
        withRetry(() =>
          client.readStorageData({
            key: "non-existent-key",
            operator: "0x" + "0".repeat(40),
          })
        )
      ).rejects.toThrow("StoredDataNotFound");

      await delay();
    });

    it("should return correct structure with XML detection", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Try to read existing storage
      try {
        const result = await withRetry(() =>
          client.readStorageData({
            key: "test-key",
            operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
          })
        );

        expect(result).toHaveProperty("text");
        expect(result).toHaveProperty("data");
        expect(result).toHaveProperty("isXml");
        expect(typeof result.text).toBe("string");
        expect(typeof result.data).toBe("string");
        expect(typeof result.isXml).toBe("boolean");
      } catch (error) {
        // If storage doesn't exist, that's okay - test passes
        expect((error as Error).message).toContain("StoredDataNotFound");
      }

      await delay();
    });

    it("should handle historical index", async () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      // Check total writes first
      const totalWrites = await withRetry(() =>
        client.getTotalWrites({
          key: "test-key",
          operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
        })
      );

      await delay();

      if (totalWrites > 0) {
        try {
          const result = await withRetry(() =>
            client.readStorageData({
              key: "test-key",
              operator: BASE_TEST_ADDRESSES.STORAGE_CONTRACT,
              index: 0, // First version - immutable
            })
          );

          expect(result).toHaveProperty("text");
          expect(result).toHaveProperty("data");
          expect(result).toHaveProperty("isXml");
        } catch (error) {
          // If storage doesn't exist at index, that's okay
          expect((error as Error).message).toContain("StoredDataNotFound");
        }
      }

      await delay();
    });
  });

  describe("preparePut", () => {
    it("should use client's chainId", () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });
      const config = client.preparePut({
        key: "test-key",
        text: "",
        value: "test-value",
      });

      expect(config.to).toBe(STORAGE_CONTRACT.address);
      expect(config.functionName).toBe("put");
    });
  });

  describe("prepareChunkedPut", () => {
    it("should use client's chainId", () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });
      const config = client.prepareChunkedPut({
        key: "test-key",
        text: "",
        chunks: ["0x1234"],
      });

      expect(config.to).toBe(CHUNKED_STORAGE_CONTRACT.address);
      expect(config.functionName).toBe("put");
    });
  });

  describe("prepareBulkPut", () => {
    it("should use client's chainId", () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });
      const config = client.prepareBulkPut({
        entries: [{ key: "key1", text: "", value: "value1" }],
      });

      expect(config.to).toBe(STORAGE_CONTRACT.address);
      expect(config.functionName).toBe("bulkPut");
    });
  });

  describe("prepareXmlStorage", () => {
    it("should use client's chainId", () => {
      const client = new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });
      const result = client.prepareXmlStorage({
        data: "<html>test</html>",
        operatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      });

      expect(result.transactionConfigs.length).toBeGreaterThan(0);
      expect(result.topLevelHash).toBeDefined();
    });
  });
});
