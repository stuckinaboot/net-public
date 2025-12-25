import { describe, it, expect, beforeEach } from "vitest";
import { StorageClient } from "@net-protocol/storage";
import {
  filterExistingTransactions,
  filterXmlStorageTransactions,
} from "../../../../commands/storage/transactions/filter";
import {
  createMockStorageClient,
  createMockStorageData,
  createMockChunkedMetadata,
  createNormalStorageTypedArgs,
  createChunkedStorageTypedArgs,
  createMetadataStorageTypedArgs,
  TEST_STORAGE_KEY,
  TEST_CONTENT_SMALL,
  TEST_OPERATOR,
  TEST_STORAGE_KEY_BYTES,
} from "../test-utils";
import type { TransactionWithId } from "../../../../commands/storage/types";
import {
  STORAGE_CONTRACT,
  CHUNKED_STORAGE_CONTRACT,
} from "@net-protocol/storage";
import { stringToHex } from "viem";

describe("transaction-filter", () => {
  let storageClient: StorageClient;
  let mockClient: ReturnType<typeof createMockStorageClient>;

  beforeEach(() => {
    storageClient = new StorageClient({
      chainId: 8453,
      overrides: { rpcUrls: ["https://base-mainnet.public.blastapi.io"] },
    });
    mockClient = createMockStorageClient();
    (storageClient as any).get = mockClient.get;
    (storageClient as any).getChunkedMetadata = mockClient.getChunkedMetadata;
  });

  describe("filterExistingTransactions", () => {
    it("should filter out existing normal storage", async () => {
      const typedArgs = createNormalStorageTypedArgs(
        TEST_STORAGE_KEY_BYTES,
        "test.txt",
        TEST_CONTENT_SMALL
      );
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [
              TEST_STORAGE_KEY_BYTES,
              "test.txt",
              stringToHex(TEST_CONTENT_SMALL),
            ],
          },
          typedArgs,
        },
      ];

      // Mock: data exists and matches
      mockClient.get.mockResolvedValue(
        createMockStorageData({ text: "test.txt", value: TEST_CONTENT_SMALL })
      );

      const result = await filterExistingTransactions({
        storageClient,
        transactions,
        operatorAddress: TEST_OPERATOR,
        expectedContent: TEST_CONTENT_SMALL,
      });

      expect(result.toSend.length).toBe(0);
      expect(result.skipped.length).toBe(1);
      expect(result.skipped[0].id).toBe(TEST_STORAGE_KEY_BYTES);
    });

    it("should keep transactions that don't exist", async () => {
      const typedArgs = createNormalStorageTypedArgs(
        TEST_STORAGE_KEY_BYTES,
        "test.txt",
        TEST_CONTENT_SMALL
      );
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [
              TEST_STORAGE_KEY_BYTES,
              "test.txt",
              stringToHex(TEST_CONTENT_SMALL),
            ],
          },
          typedArgs,
        },
      ];

      mockClient.get.mockResolvedValue(null);

      const result = await filterExistingTransactions({
        storageClient,
        transactions,
        operatorAddress: TEST_OPERATOR,
        expectedContent: TEST_CONTENT_SMALL,
      });

      expect(result.toSend.length).toBe(1);
      expect(result.skipped.length).toBe(0);
      expect(result.toSend[0].id).toBe(TEST_STORAGE_KEY_BYTES);
    });

    it("should keep transactions when content doesn't match", async () => {
      const typedArgs = createNormalStorageTypedArgs(
        TEST_STORAGE_KEY_BYTES,
        "test.txt",
        TEST_CONTENT_SMALL
      );
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [
              TEST_STORAGE_KEY_BYTES,
              "test.txt",
              stringToHex(TEST_CONTENT_SMALL),
            ],
          },
          typedArgs,
        },
      ];

      // Mock: data exists but doesn't match
      mockClient.get.mockResolvedValue(
        createMockStorageData({ text: "test.txt", value: "different content" })
      );

      const result = await filterExistingTransactions({
        storageClient,
        transactions,
        operatorAddress: TEST_OPERATOR,
        expectedContent: TEST_CONTENT_SMALL,
      });

      expect(result.toSend.length).toBe(1);
      expect(result.skipped.length).toBe(0);
    });

    it("should filter out existing chunked storage", async () => {
      const chunkedHash = "0x" + "a".repeat(64) as `0x${string}`;
      const typedArgs = createChunkedStorageTypedArgs(chunkedHash);
      const transactions: TransactionWithId[] = [
        {
          id: chunkedHash,
          type: "chunked",
          transaction: {
            to: CHUNKED_STORAGE_CONTRACT.address,
            abi: CHUNKED_STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [chunkedHash, "", []],
          },
          typedArgs,
        },
      ];

      mockClient.getChunkedMetadata.mockResolvedValue(
        createMockChunkedMetadata({ chunkCount: 5 })
      );

      const result = await filterExistingTransactions({
        storageClient,
        transactions,
        operatorAddress: TEST_OPERATOR,
      });

      expect(result.toSend.length).toBe(0);
      expect(result.skipped.length).toBe(1);
    });

    it("should keep chunked storage that doesn't exist", async () => {
      const chunkedHash = "0x" + "a".repeat(64) as `0x${string}`;
      const typedArgs = createChunkedStorageTypedArgs(chunkedHash);
      const transactions: TransactionWithId[] = [
        {
          id: chunkedHash,
          type: "chunked",
          transaction: {
            to: CHUNKED_STORAGE_CONTRACT.address,
            abi: CHUNKED_STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [chunkedHash, "", []],
          },
          typedArgs,
        },
      ];

      mockClient.getChunkedMetadata.mockResolvedValue(null);

      const result = await filterExistingTransactions({
        storageClient,
        transactions,
        operatorAddress: TEST_OPERATOR,
      });

      expect(result.toSend.length).toBe(1);
      expect(result.skipped.length).toBe(0);
    });

    it("should filter out existing metadata transactions", async () => {
      const metadata = '<net k="hash" v="0.0.1" />';
      const typedArgs = createMetadataStorageTypedArgs(
        TEST_STORAGE_KEY_BYTES,
        "test.txt",
        metadata
      );
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "metadata",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [TEST_STORAGE_KEY_BYTES, "test.txt", stringToHex(metadata)],
          },
          typedArgs,
        },
      ];

      // Mock: metadata exists and matches
      mockClient.get.mockResolvedValue(
        createMockStorageData({ text: "test.txt", value: metadata })
      );

      const result = await filterExistingTransactions({
        storageClient,
        transactions,
        operatorAddress: TEST_OPERATOR,
      });

      expect(result.toSend.length).toBe(0);
      expect(result.skipped.length).toBe(1);
    });

    it("should handle mixed transaction types", async () => {
      const chunkedHash = "0x" + "a".repeat(64) as `0x${string}`;
      const normalTypedArgs = createNormalStorageTypedArgs(
        TEST_STORAGE_KEY_BYTES,
        "test.txt",
        TEST_CONTENT_SMALL
      );
      const chunkedTypedArgs = createChunkedStorageTypedArgs(chunkedHash);
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [
              TEST_STORAGE_KEY_BYTES,
              "test.txt",
              stringToHex(TEST_CONTENT_SMALL),
            ],
          },
          typedArgs: normalTypedArgs,
        },
        {
          id: chunkedHash,
          type: "chunked",
          transaction: {
            to: CHUNKED_STORAGE_CONTRACT.address,
            abi: CHUNKED_STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [chunkedHash, "", []],
          },
          typedArgs: chunkedTypedArgs,
        },
      ];

      // First exists, second doesn't
      mockClient.get.mockResolvedValueOnce(
        createMockStorageData({ text: "test.txt", value: TEST_CONTENT_SMALL })
      );
      mockClient.getChunkedMetadata.mockResolvedValueOnce(null);

      const result = await filterExistingTransactions({
        storageClient,
        transactions,
        operatorAddress: TEST_OPERATOR,
        expectedContent: TEST_CONTENT_SMALL,
      });

      expect(result.toSend.length).toBe(1);
      expect(result.skipped.length).toBe(1);
      expect(result.toSend[0].type).toBe("chunked");
      expect(result.skipped[0].type).toBe("normal");
    });
  });

  describe("filterXmlStorageTransactions", () => {
    it("should filter chunks efficiently", async () => {
      const chunkedHashes = ["0xhash1", "0xhash2", "0xhash3"];
      const metadata = '<net k="0xhash1" v="0.0.1" />';
      const metadataTypedArgs = createMetadataStorageTypedArgs(
        TEST_STORAGE_KEY_BYTES,
        "test.txt",
        metadata
      );
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "metadata",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [TEST_STORAGE_KEY_BYTES, "test.txt", stringToHex(metadata)],
          },
          typedArgs: metadataTypedArgs,
        },
        ...chunkedHashes.map((hash) => ({
          id: hash,
          type: "chunked" as const,
          transaction: {
            to: CHUNKED_STORAGE_CONTRACT.address,
            abi: CHUNKED_STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [hash, "", []],
          },
          typedArgs: createChunkedStorageTypedArgs(hash as `0x${string}`),
        })),
      ];

      // Mock: first two chunks exist, third doesn't
      mockClient.getChunkedMetadata
        .mockResolvedValueOnce(createMockChunkedMetadata({ chunkCount: 5 }))
        .mockResolvedValueOnce(createMockChunkedMetadata({ chunkCount: 3 }))
        .mockResolvedValueOnce(null);

      const result = await filterXmlStorageTransactions({
        storageClient,
        transactions,
        operatorAddress: TEST_OPERATOR,
        chunkedHashes,
      });

      expect(result.toSend.length).toBe(2); // Metadata + one chunk
      expect(result.skipped.length).toBe(2); // Two chunks
      expect(result.toSend[0].type).toBe("metadata"); // Metadata first
      expect(result.toSend[1].type).toBe("chunked");
    });

    it("should skip metadata when all chunks exist and metadata matches", async () => {
      const chunkedHashes = ["0xhash1", "0xhash2"];
      const metadata =
        '<net k="0xhash1" v="0.0.1" /><net k="0xhash2" v="0.0.1" />';
      const metadataTypedArgs = createMetadataStorageTypedArgs(
        TEST_STORAGE_KEY_BYTES,
        "test.txt",
        metadata
      );
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "metadata",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [TEST_STORAGE_KEY_BYTES, "test.txt", stringToHex(metadata)],
          },
          typedArgs: metadataTypedArgs,
        },
        ...chunkedHashes.map((hash) => ({
          id: hash,
          type: "chunked" as const,
          transaction: {
            to: CHUNKED_STORAGE_CONTRACT.address,
            abi: CHUNKED_STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [hash, "", []],
          },
          typedArgs: createChunkedStorageTypedArgs(hash as `0x${string}`),
        })),
      ];

      // All chunks exist
      mockClient.getChunkedMetadata.mockResolvedValue(
        createMockChunkedMetadata({ chunkCount: 5 })
      );
      // Metadata exists and matches
      mockClient.get.mockResolvedValue(
        createMockStorageData({ text: "test.txt", value: metadata })
      );

      const result = await filterXmlStorageTransactions({
        storageClient,
        transactions,
        operatorAddress: TEST_OPERATOR,
        chunkedHashes,
      });

      expect(result.toSend.length).toBe(0);
      expect(result.skipped.length).toBe(3); // Metadata + 2 chunks
    });

    it("should keep metadata when chunks are missing", async () => {
      const chunkedHashes = ["0xhash1", "0xhash2"];
      const metadata = '<net k="0xhash1" v="0.0.1" />';
      const metadataTypedArgs = createMetadataStorageTypedArgs(
        TEST_STORAGE_KEY_BYTES,
        "test.txt",
        metadata
      );
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "metadata",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [TEST_STORAGE_KEY_BYTES, "test.txt", stringToHex(metadata)],
          },
          typedArgs: metadataTypedArgs,
        },
        ...chunkedHashes.map((hash) => ({
          id: hash,
          type: "chunked" as const,
          transaction: {
            to: CHUNKED_STORAGE_CONTRACT.address,
            abi: CHUNKED_STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [hash, "", []],
          },
          typedArgs: createChunkedStorageTypedArgs(hash as `0x${string}`),
        })),
      ];

      // No chunks exist
      mockClient.getChunkedMetadata.mockResolvedValue(null);

      const result = await filterXmlStorageTransactions({
        storageClient,
        transactions,
        operatorAddress: TEST_OPERATOR,
        chunkedHashes,
      });

      expect(result.toSend.length).toBe(3); // Metadata + 2 chunks
      expect(result.skipped.length).toBe(0);
      expect(result.toSend[0].type).toBe("metadata");
    });

    it("should keep metadata when metadata doesn't match", async () => {
      const chunkedHashes = ["0xhash1", "0xhash2"];
      const expectedMetadata = '<net k="0xhash1" v="0.0.1" />';
      const differentMetadata = '<net k="0xhash1" v="0.0.2" />';
      const metadataTypedArgs = createMetadataStorageTypedArgs(
        TEST_STORAGE_KEY_BYTES,
        "test.txt",
        expectedMetadata
      );
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "metadata",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [
              TEST_STORAGE_KEY_BYTES,
              "test.txt",
              stringToHex(expectedMetadata),
            ],
          },
          typedArgs: metadataTypedArgs,
        },
        ...chunkedHashes.map((hash) => ({
          id: hash,
          type: "chunked" as const,
          transaction: {
            to: CHUNKED_STORAGE_CONTRACT.address,
            abi: CHUNKED_STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [hash, "", []],
          },
          typedArgs: createChunkedStorageTypedArgs(hash as `0x${string}`),
        })),
      ];

      // All chunks exist
      mockClient.getChunkedMetadata.mockResolvedValue(
        createMockChunkedMetadata({ chunkCount: 5 })
      );
      // Metadata exists but doesn't match
      mockClient.get.mockResolvedValue(
        createMockStorageData({ text: "test.txt", value: differentMetadata })
      );

      const result = await filterXmlStorageTransactions({
        storageClient,
        transactions,
        operatorAddress: TEST_OPERATOR,
        chunkedHashes,
      });

      expect(result.toSend.length).toBe(1); // Only metadata
      expect(result.skipped.length).toBe(2); // Both chunks
      expect(result.toSend[0].type).toBe("metadata");
    });

    it("should preserve transaction order (metadata first)", async () => {
      const chunkedHashes = ["0xhash1"];
      const metadata = '<net k="0xhash1" v="0.0.1" />';
      const metadataTypedArgs = createMetadataStorageTypedArgs(
        TEST_STORAGE_KEY_BYTES,
        "test.txt",
        metadata
      );
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "metadata",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [TEST_STORAGE_KEY_BYTES, "test.txt", stringToHex(metadata)],
          },
          typedArgs: metadataTypedArgs,
        },
        {
          id: chunkedHashes[0],
          type: "chunked",
          transaction: {
            to: CHUNKED_STORAGE_CONTRACT.address,
            abi: CHUNKED_STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [chunkedHashes[0], "", []],
          },
          typedArgs: createChunkedStorageTypedArgs(chunkedHashes[0] as `0x${string}`),
        },
      ];

      mockClient.getChunkedMetadata.mockResolvedValue(null);

      const result = await filterXmlStorageTransactions({
        storageClient,
        transactions,
        operatorAddress: TEST_OPERATOR,
        chunkedHashes,
      });

      expect(result.toSend[0].type).toBe("metadata");
      expect(result.toSend[1].type).toBe("chunked");
    });
  });
});
