import { describe, it, expect } from "vitest";
import {
  prepareStoragePut,
  prepareChunkedStoragePut,
  prepareBulkStoragePut,
  prepareXmlStorage,
} from "../client/storageWriting";
import { BASE_CHAIN_ID } from "./test-utils";
import { STORAGE_CONTRACT, CHUNKED_STORAGE_CONTRACT } from "../constants";

describe("storageWriting", () => {
  describe("prepareStoragePut", () => {
    it("should return correct transaction config structure", () => {
      const config = prepareStoragePut({
        key: "my-key",
        text: "",
        value: "Hello, storage!",
        chainId: BASE_CHAIN_ID,
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
      const config = prepareStoragePut({
        key: "my-key",
        text: "",
        value: "value",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.args[0]).toMatch(/^0x[a-fA-F0-9]{64}$/); // 32 bytes = 64 hex chars
    });

    it("should use hex bytes32 key as-is when keyFormat is bytes32", () => {
      const hexKey = "0x" + "a".repeat(64);
      const config = prepareStoragePut({
        key: hexKey,
        text: "",
        value: "value",
        chainId: BASE_CHAIN_ID,
        keyFormat: "bytes32",
      });

      expect(config.args[0]).toBe(hexKey.toLowerCase());
    });

    it("should hash long keys", () => {
      const longKey = "a".repeat(100);
      const config = prepareStoragePut({
        key: longKey,
        text: "",
        value: "value",
        chainId: BASE_CHAIN_ID,
      });

      // Long keys should be hashed to bytes32
      expect(config.args[0]).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(config.args[0]).not.toBe(longKey);
    });

    it("should convert value to hex", () => {
      const config = prepareStoragePut({
        key: "key",
        text: "",
        value: "test",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.args[2]).toBe("0x74657374"); // "test" as hex
    });

    it("should handle empty value", () => {
      const config = prepareStoragePut({
        key: "key",
        text: "",
        value: "",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.args[2]).toBe("0x");
    });

    it("should reject empty storage key", () => {
      expect(() => {
        prepareStoragePut({
          key: "",
          text: "",
          value: "value",
          chainId: BASE_CHAIN_ID,
        });
      }).toThrow("Storage key cannot be empty");
    });

    it("should use correct function name", () => {
      const config = prepareStoragePut({
        key: "key",
        text: "",
        value: "value",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.functionName).toBe("put");

      // Verify function exists in ABI
      const putFunction = config.abi.find(
        (item: any) => item.type === "function" && item.name === "put"
      );
      expect(putFunction).toBeDefined();
      expect(putFunction.inputs.length).toBe(3); // key, text, value
    });
  });

  describe("prepareChunkedStoragePut", () => {
    it("should return correct transaction config structure", () => {
      const config = prepareChunkedStoragePut({
        key: "large-file",
        text: "",
        chunks: ["0x1f8b08", "0x1f8b09"],
        chainId: BASE_CHAIN_ID,
      });

      expect(config.to).toBe(CHUNKED_STORAGE_CONTRACT.address);
      expect(config.functionName).toBe("put");
      expect(Array.isArray(config.args)).toBe(true);
      expect(config.args.length).toBe(3); // key, text, chunks
      expect(Array.isArray(config.args[2])).toBe(true); // chunks is array
    });

    it("should reject empty chunks array", () => {
      expect(() => {
        prepareChunkedStoragePut({
          key: "key",
          text: "",
          chunks: [],
          chainId: BASE_CHAIN_ID,
        });
      }).toThrow("Chunks array cannot be empty");
    });

    it("should reject too many chunks (>255)", () => {
      const chunks = Array(256).fill("0x1234");
      expect(() => {
        prepareChunkedStoragePut({
          key: "key",
          text: "",
          chunks,
          chainId: BASE_CHAIN_ID,
        });
      }).toThrow("Too many chunks");
    });

    it("should validate chunks are hex strings", () => {
      expect(() => {
        prepareChunkedStoragePut({
          key: "key",
          text: "",
          chunks: ["not-hex"],
          chainId: BASE_CHAIN_ID,
        });
      }).toThrow("Invalid chunk format");
    });

    it("should use correct function name", () => {
      const config = prepareChunkedStoragePut({
        key: "key",
        text: "",
        chunks: ["0x1234"],
        chainId: BASE_CHAIN_ID,
      });

      expect(config.functionName).toBe("put");

      // Verify function exists in ABI
      const putFunction = config.abi.find(
        (item: any) => item.type === "function" && item.name === "put"
      );
      expect(putFunction).toBeDefined();
      expect(putFunction.inputs.length).toBe(3); // key, text, chunks
      expect(putFunction.inputs[2].type).toBe("bytes[]"); // chunks is bytes[]
    });
  });

  describe("prepareBulkStoragePut", () => {
    it("should return correct transaction config structure", () => {
      const config = prepareBulkStoragePut({
        entries: [
          { key: "key1", text: "", value: "value1" },
          { key: "key2", text: "", value: "value2" },
        ],
        chainId: BASE_CHAIN_ID,
      });

      expect(config.to).toBe(STORAGE_CONTRACT.address);
      expect(config.functionName).toBe("bulkPut");
      expect(Array.isArray(config.args)).toBe(true);
      expect(config.args.length).toBe(1); // entries array
      expect(Array.isArray(config.args[0])).toBe(true);
      expect(config.args[0].length).toBe(2);
    });

    it("should reject empty entries array", () => {
      expect(() => {
        prepareBulkStoragePut({
          entries: [],
          chainId: BASE_CHAIN_ID,
        });
      }).toThrow("Entries array cannot be empty");
    });

    it("should convert all entries correctly", () => {
      const config = prepareBulkStoragePut({
        entries: [
          { key: "key1", text: "text1", value: "value1" },
          { key: "key2", text: "text2", value: "value2" },
        ],
        chainId: BASE_CHAIN_ID,
      });

      const entries = config.args[0] as any[];
      expect(entries[0].key).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(entries[0].text).toBe("text1");
      expect(entries[0].value).toBe("0x76616c756531"); // "value1" as hex
      expect(entries[1].key).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(entries[1].text).toBe("text2");
      expect(entries[1].value).toBe("0x76616c756532"); // "value2" as hex
    });

    it("should use correct function name", () => {
      const config = prepareBulkStoragePut({
        entries: [{ key: "key1", text: "", value: "value1" }],
        chainId: BASE_CHAIN_ID,
      });

      expect(config.functionName).toBe("bulkPut");

      // Verify function exists in ABI
      const bulkPutFunction = config.abi.find(
        (item: any) => item.type === "function" && item.name === "bulkPut"
      );
      expect(bulkPutFunction).toBeDefined();
    });
  });

  describe("prepareXmlStorage", () => {
    it("should return multiple transaction configs", () => {
      const result = prepareXmlStorage({
        data: "<html>test</html>",
        operatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        chainId: BASE_CHAIN_ID,
      });

      expect(result.transactionConfigs.length).toBeGreaterThan(1);
      expect(result.topLevelHash).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it("should have metadata transaction first", () => {
      const result = prepareXmlStorage({
        data: "<html>test</html>",
        operatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        chainId: BASE_CHAIN_ID,
      });

      const metadataConfig = result.transactionConfigs[0];
      expect(metadataConfig.functionName).toBe("put");
      expect(metadataConfig.to).toBe(STORAGE_CONTRACT.address);
    });

    it("should use ChunkedStorage backend by default", () => {
      const result = prepareXmlStorage({
        data: "<html>test</html>",
        operatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        chainId: BASE_CHAIN_ID,
      });

      // After metadata, should have ChunkedStorage transactions
      if (result.transactionConfigs.length > 1) {
        const chunkConfig = result.transactionConfigs[1];
        expect(chunkConfig.to).toBe(CHUNKED_STORAGE_CONTRACT.address);
        expect(chunkConfig.functionName).toBe("put");
      }
    });

    it("should handle large data", () => {
      const largeData = "a".repeat(100000);
      const result = prepareXmlStorage({
        data: largeData,
        operatorAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        chainId: BASE_CHAIN_ID,
      });

      expect(result.transactionConfigs.length).toBeGreaterThan(1);
      expect(result.topLevelHash).toBeDefined();
    });
  });
});

