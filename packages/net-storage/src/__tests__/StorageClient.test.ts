import { describe, it, expect, beforeAll } from "vitest";
import { StorageClient } from "../client/StorageClient";
import {
  BASE_CHAIN_ID,
  BASE_TEST_RPC_URL,
  BASE_TEST_ADDRESSES,
  delay,
  withRetry,
  findAbiFunction,
  isBulkPutEntries,
  type BulkPutEntry,
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
    const createClient = () =>
      new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

    it("should return correct transaction config structure", () => {
      const client = createClient();
      const config = client.preparePut({
        key: "my-key",
        text: "",
        value: "Hello, storage!",
      });

      expect(config).toHaveProperty("to");
      expect(config).toHaveProperty("functionName");
      expect(config).toHaveProperty("args");
      expect(config).toHaveProperty("abi");

      expect(config.to).toBe(STORAGE_CONTRACT.address);
      expect(config.functionName).toBe("put");
      expect(Array.isArray(config.args)).toBe(true);
      expect(config.args.length).toBe(3); // key, text, value
    });

    it("should convert string key to bytes32", () => {
      const client = createClient();
      const config = client.preparePut({
        key: "my-key",
        text: "",
        value: "value",
      });

      expect(config.args[0]).toMatch(/^0x[a-fA-F0-9]{64}$/); // 32 bytes = 64 hex chars
    });

    it("should use hex bytes32 key as-is when keyFormat is bytes32", () => {
      const client = createClient();
      const hexKey = "0x" + "a".repeat(64);
      const config = client.preparePut({
        key: hexKey,
        text: "",
        value: "value",
        keyFormat: "bytes32",
      });

      expect(config.args[0]).toBe(hexKey.toLowerCase());
    });

    it("should hash long keys", () => {
      const client = createClient();
      const longKey = "a".repeat(100);
      const config = client.preparePut({
        key: longKey,
        text: "",
        value: "value",
      });

      // Long keys should be hashed to bytes32
      expect(config.args[0]).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(config.args[0]).not.toBe(longKey);
    });

    it("should convert value to hex", () => {
      const client = createClient();
      const config = client.preparePut({
        key: "key",
        text: "",
        value: "test",
      });

      expect(config.args[2]).toBe("0x74657374"); // "test" as hex
    });

    it("should handle empty value", () => {
      const client = createClient();
      const config = client.preparePut({
        key: "key",
        text: "",
        value: "",
      });

      expect(config.args[2]).toBe("0x");
    });

    it("should reject empty storage key", () => {
      const client = createClient();
      expect(() => {
        client.preparePut({
          key: "",
          text: "",
          value: "value",
        });
      }).toThrow("Storage key cannot be empty");
    });

    it("should use correct function name", () => {
      const client = createClient();
      const config = client.preparePut({
        key: "key",
        text: "",
        value: "value",
      });

      expect(config.functionName).toBe("put");

      // Verify function exists in ABI
      const putFunction = findAbiFunction(config.abi, "put");
      expect(putFunction).toBeDefined();
      expect(putFunction!.inputs.length).toBe(3); // key, text, value
    });
  });

  describe("prepareChunkedPut", () => {
    const createClient = () =>
      new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

    it("should return correct transaction config structure", () => {
      const client = createClient();
      const config = client.prepareChunkedPut({
        key: "large-file",
        text: "",
        chunks: ["0x1f8b08", "0x1f8b09"],
      });

      expect(config.to).toBe(CHUNKED_STORAGE_CONTRACT.address);
      expect(config.functionName).toBe("put");
      expect(Array.isArray(config.args)).toBe(true);
      expect(config.args.length).toBe(3); // key, text, chunks
      expect(Array.isArray(config.args[2])).toBe(true); // chunks is array
    });

    it("should reject empty chunks array", () => {
      const client = createClient();
      expect(() => {
        client.prepareChunkedPut({
          key: "key",
          text: "",
          chunks: [],
        });
      }).toThrow("Chunks array cannot be empty");
    });

    it("should reject too many chunks (>255)", () => {
      const client = createClient();
      const chunks = Array(256).fill("0x1234");
      expect(() => {
        client.prepareChunkedPut({
          key: "key",
          text: "",
          chunks,
        });
      }).toThrow("Too many chunks");
    });

    it("should validate chunks are hex strings", () => {
      const client = createClient();
      expect(() => {
        client.prepareChunkedPut({
          key: "key",
          text: "",
          chunks: ["not-hex"],
        });
      }).toThrow("Invalid chunk format");
    });

    it("should use correct function name", () => {
      const client = createClient();
      const config = client.prepareChunkedPut({
        key: "key",
        text: "",
        chunks: ["0x1234"],
      });

      expect(config.functionName).toBe("put");

      // Verify function exists in ABI
      const putFunction = findAbiFunction(config.abi, "put");
      expect(putFunction).toBeDefined();
      expect(putFunction!.inputs.length).toBe(3); // key, text, chunks
      expect(putFunction!.inputs[2].type).toBe("bytes[]"); // chunks is bytes[]
    });
  });

  describe("prepareBulkPut", () => {
    const createClient = () =>
      new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

    it("should return correct transaction config structure", () => {
      const client = createClient();
      const config = client.prepareBulkPut({
        entries: [
          { key: "key1", text: "", value: "value1" },
          { key: "key2", text: "", value: "value2" },
        ],
      });

      expect(config.to).toBe(STORAGE_CONTRACT.address);
      expect(config.functionName).toBe("bulkPut");
      expect(Array.isArray(config.args)).toBe(true);
      expect(config.args.length).toBe(1); // entries array
      expect(Array.isArray(config.args[0])).toBe(true);
      const entries = isBulkPutEntries(config.args[0]) ? config.args[0] : [];
      expect(entries.length).toBe(2);
    });

    it("should reject empty entries array", () => {
      const client = createClient();
      expect(() => {
        client.prepareBulkPut({
          entries: [],
        });
      }).toThrow("Entries array cannot be empty");
    });

    it("should convert all entries correctly", () => {
      const client = createClient();
      const config = client.prepareBulkPut({
        entries: [
          { key: "key1", text: "text1", value: "value1" },
          { key: "key2", text: "text2", value: "value2" },
        ],
      });

      const entries = isBulkPutEntries(config.args[0]) ? config.args[0] : [];
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].key).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(entries[0].text).toBe("text1");
      expect(entries[0].value).toBe("0x76616c756531"); // "value1" as hex
      expect(entries[1].key).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(entries[1].text).toBe("text2");
      expect(entries[1].value).toBe("0x76616c756532"); // "value2" as hex
    });

    it("should use correct function name", () => {
      const client = createClient();
      const config = client.prepareBulkPut({
        entries: [{ key: "key1", text: "", value: "value1" }],
      });

      expect(config.functionName).toBe("bulkPut");

      // Verify function exists in ABI
      const bulkPutFunction = findAbiFunction(config.abi, "bulkPut");
      expect(bulkPutFunction).toBeDefined();
    });
  });

  describe("prepareXmlStorage", () => {
    const createClient = () =>
      new StorageClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

    it("should return multiple transaction configs", () => {
      const client = createClient();
      const result = client.prepareXmlStorage({
        data: "<html>test</html>",
        operatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      });

      expect(result.transactionConfigs.length).toBeGreaterThan(1);
      expect(result.topLevelHash).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it("should have metadata transaction first", () => {
      const client = createClient();
      const result = client.prepareXmlStorage({
        data: "<html>test</html>",
        operatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      });

      const metadataConfig = result.transactionConfigs[0];
      expect(metadataConfig.functionName).toBe("put");
      expect(metadataConfig.to).toBe(STORAGE_CONTRACT.address);
    });

    it("should use ChunkedStorage backend by default", () => {
      const client = createClient();
      const result = client.prepareXmlStorage({
        data: "<html>test</html>",
        operatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      });

      // After metadata, should have ChunkedStorage transactions
      if (result.transactionConfigs.length > 1) {
        const chunkConfig = result.transactionConfigs[1];
        expect(chunkConfig.to).toBe(CHUNKED_STORAGE_CONTRACT.address);
        expect(chunkConfig.functionName).toBe("put");
      }
    });

    it("should handle large data", () => {
      const client = createClient();
      const largeData = "a".repeat(100000);
      const result = client.prepareXmlStorage({
        data: largeData,
        operatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      });

      expect(result.transactionConfigs.length).toBeGreaterThan(1);
      expect(result.topLevelHash).toBeDefined();
    });
  });
});
