import { describe, it, expect, beforeEach } from "vitest";
import { StorageClient } from "@net-protocol/storage";
import {
  checkNormalStorageExists,
  checkChunkedStorageExists,
  checkXmlChunksExist,
  checkXmlMetadataExists,
} from "../../../../commands/storage/storage/check";
import {
  createMockStorageClient,
  createMockStorageData,
  createMockChunkedMetadata,
  TEST_STORAGE_KEY,
  TEST_CONTENT_SMALL,
  TEST_OPERATOR,
  TEST_STORAGE_KEY_BYTES,
} from "../test-utils";
import { stringToHex } from "viem";

describe("storage-check", () => {
  let storageClient: StorageClient;
  let mockClient: ReturnType<typeof createMockStorageClient>;

  beforeEach(() => {
    // Create real StorageClient but we'll mock its methods
    storageClient = new StorageClient({
      chainId: 8453,
      overrides: { rpcUrls: ["https://base-mainnet.public.blastapi.io"] },
    });
    mockClient = createMockStorageClient();

    // Replace methods with mocks
    (storageClient as any).get = mockClient.get;
    (storageClient as any).getChunkedMetadata = mockClient.getChunkedMetadata;
  });

  describe("checkNormalStorageExists", () => {
    it("should return exists: false when data doesn't exist", async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await checkNormalStorageExists({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        operatorAddress: TEST_OPERATOR,
        expectedContent: TEST_CONTENT_SMALL,
      });

      expect(result.exists).toBe(false);
      expect(result.matches).toBeUndefined();
    });

    it("should return exists: true, matches: true when content matches", async () => {
      const storedData = createMockStorageData({ text: "test.txt", value: TEST_CONTENT_SMALL });
      mockClient.get.mockResolvedValue(storedData);

      const result = await checkNormalStorageExists({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        operatorAddress: TEST_OPERATOR,
        expectedContent: TEST_CONTENT_SMALL,
      });

      expect(result.exists).toBe(true);
      expect(result.matches).toBe(true);
    });

    it("should return exists: true, matches: false when content doesn't match", async () => {
      const storedData = createMockStorageData({ text: "test.txt", value: "different content" });
      mockClient.get.mockResolvedValue(storedData);

      const result = await checkNormalStorageExists({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        operatorAddress: TEST_OPERATOR,
        expectedContent: TEST_CONTENT_SMALL,
      });

      expect(result.exists).toBe(true);
      expect(result.matches).toBe(false);
    });

    it("should call StorageClient.get with correct parameters", async () => {
      mockClient.get.mockResolvedValue(null);

      await checkNormalStorageExists({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        operatorAddress: TEST_OPERATOR,
        expectedContent: TEST_CONTENT_SMALL,
      });

      expect(mockClient.get).toHaveBeenCalledWith({
        key: TEST_STORAGE_KEY,
        operator: TEST_OPERATOR,
      });
    });

    it("should handle hex-encoded values correctly", async () => {
      const hexValue = stringToHex(TEST_CONTENT_SMALL);
      const storedData = createMockStorageData({ text: "test.txt", value: hexValue });
      mockClient.get.mockResolvedValue(storedData);

      const result = await checkNormalStorageExists({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        operatorAddress: TEST_OPERATOR,
        expectedContent: TEST_CONTENT_SMALL,
      });

      expect(result.exists).toBe(true);
      expect(result.matches).toBe(true);
    });
  });

  describe("checkChunkedStorageExists", () => {
    it("should return true when metadata exists with chunks", async () => {
      mockClient.getChunkedMetadata.mockResolvedValue(
        createMockChunkedMetadata({ chunkCount: 5, originalText: "test.txt" })
      );

      const result = await checkChunkedStorageExists({
        storageClient,
        chunkedHash: TEST_STORAGE_KEY_BYTES,
        operatorAddress: TEST_OPERATOR,
      });

      expect(result).toBe(true);
    });

    it("should return false when metadata doesn't exist", async () => {
      mockClient.getChunkedMetadata.mockResolvedValue(null);

      const result = await checkChunkedStorageExists({
        storageClient,
        chunkedHash: TEST_STORAGE_KEY_BYTES,
        operatorAddress: TEST_OPERATOR,
      });

      expect(result).toBe(false);
    });

    it("should return false when chunkCount is 0", async () => {
      mockClient.getChunkedMetadata.mockResolvedValue(
        createMockChunkedMetadata({ chunkCount: 0, originalText: "" })
      );

      const result = await checkChunkedStorageExists({
        storageClient,
        chunkedHash: TEST_STORAGE_KEY_BYTES,
        operatorAddress: TEST_OPERATOR,
      });

      expect(result).toBe(false);
    });

    it("should call StorageClient.getChunkedMetadata with correct parameters", async () => {
      mockClient.getChunkedMetadata.mockResolvedValue(null);

      await checkChunkedStorageExists({
        storageClient,
        chunkedHash: TEST_STORAGE_KEY_BYTES,
        operatorAddress: TEST_OPERATOR,
      });

      expect(mockClient.getChunkedMetadata).toHaveBeenCalledWith({
        key: TEST_STORAGE_KEY_BYTES,
        operator: TEST_OPERATOR,
      });
    });
  });

  describe("checkXmlChunksExist", () => {
    it("should return Set of existing chunk hashes", async () => {
      const hashes = ["0xhash1", "0xhash2", "0xhash3"];

      // Mock: first two exist, third doesn't
      mockClient.getChunkedMetadata
        .mockResolvedValueOnce(createMockChunkedMetadata({ chunkCount: 5 }))
        .mockResolvedValueOnce(createMockChunkedMetadata({ chunkCount: 3 }))
        .mockResolvedValueOnce(null);

      const result = await checkXmlChunksExist({
        storageClient,
        chunkedHashes: hashes,
        operatorAddress: TEST_OPERATOR,
      });

      expect(result.size).toBe(2);
      expect(result.has("0xhash1")).toBe(true);
      expect(result.has("0xhash2")).toBe(true);
      expect(result.has("0xhash3")).toBe(false);
    });

    it("should check chunks in parallel", async () => {
      const hashes = Array(10)
        .fill(0)
        .map((_, i) => `0xhash${i}`);
      mockClient.getChunkedMetadata.mockResolvedValue(
        createMockChunkedMetadata({ chunkCount: 1 })
      );

      const startTime = Date.now();
      await checkXmlChunksExist({ storageClient, chunkedHashes: hashes, operatorAddress: TEST_OPERATOR });
      const duration = Date.now() - startTime;

      // Parallel checks should be faster than sequential (allowing some overhead)
      expect(duration).toBeLessThan(1000); // Should complete quickly
      expect(mockClient.getChunkedMetadata).toHaveBeenCalledTimes(10);
    });

    it("should return empty Set when no chunks exist", async () => {
      const hashes = ["0xhash1", "0xhash2"];
      mockClient.getChunkedMetadata.mockResolvedValue(null);

      const result = await checkXmlChunksExist({
        storageClient,
        chunkedHashes: hashes,
        operatorAddress: TEST_OPERATOR,
      });

      expect(result.size).toBe(0);
    });

    it("should return Set with all hashes when all chunks exist", async () => {
      const hashes = ["0xhash1", "0xhash2", "0xhash3"];
      mockClient.getChunkedMetadata.mockResolvedValue(
        createMockChunkedMetadata({ chunkCount: 5 })
      );

      const result = await checkXmlChunksExist({
        storageClient,
        chunkedHashes: hashes,
        operatorAddress: TEST_OPERATOR,
      });

      expect(result.size).toBe(3);
      hashes.forEach((hash) => {
        expect(result.has(hash)).toBe(true);
      });
    });
  });

  describe("checkXmlMetadataExists", () => {
    it("should return exists: false when metadata doesn't exist", async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await checkXmlMetadataExists({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        operatorAddress: TEST_OPERATOR,
        expectedMetadata: '<net k="hash" v="0.0.1" />',
      });

      expect(result.exists).toBe(false);
      expect(result.matches).toBeUndefined();
    });

    it("should return exists: true, matches: true when metadata matches", async () => {
      const expectedMetadata = '<net k="hash" v="0.0.1" />';
      const storedData = createMockStorageData({ text: "test.txt", value: expectedMetadata });
      mockClient.get.mockResolvedValue(storedData);

      const result = await checkXmlMetadataExists({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        operatorAddress: TEST_OPERATOR,
        expectedMetadata,
      });

      expect(result.exists).toBe(true);
      expect(result.matches).toBe(true);
    });

    it("should return exists: true, matches: false when metadata doesn't match", async () => {
      const expectedMetadata = '<net k="hash" v="0.0.1" />';
      const differentMetadata = '<net k="other" v="0.0.1" />';
      const storedData = createMockStorageData({ text: "test.txt", value: differentMetadata });
      mockClient.get.mockResolvedValue(storedData);

      const result = await checkXmlMetadataExists({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        operatorAddress: TEST_OPERATOR,
        expectedMetadata,
      });

      expect(result.exists).toBe(true);
      expect(result.matches).toBe(false);
    });

    it("should handle hex-encoded metadata correctly", async () => {
      const expectedMetadata = '<net k="hash" v="0.0.1" />';
      const hexMetadata = stringToHex(expectedMetadata);
      const storedData = createMockStorageData({ text: "test.txt", value: hexMetadata });
      mockClient.get.mockResolvedValue(storedData);

      const result = await checkXmlMetadataExists({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        operatorAddress: TEST_OPERATOR,
        expectedMetadata,
      });

      expect(result.exists).toBe(true);
      expect(result.matches).toBe(true);
    });
  });
});
