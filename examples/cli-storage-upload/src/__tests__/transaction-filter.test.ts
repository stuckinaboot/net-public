import { describe, it, expect, beforeEach } from "vitest";
import { StorageClient } from "@net-protocol/storage";
import {
  filterExistingTransactions,
  filterXmlStorageTransactions,
} from "../transaction-filter";
import {
  createMockStorageClient,
  createMockStorageData,
  createMockChunkedMetadata,
  TEST_STORAGE_KEY,
  TEST_CONTENT_SMALL,
  TEST_OPERATOR,
  TEST_STORAGE_KEY_BYTES,
} from "./test-utils";
import type { TransactionWithId } from "../types";
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
        },
      ];

      // Mock: data exists and matches
      mockClient.get.mockResolvedValue(
        createMockStorageData("test.txt", TEST_CONTENT_SMALL)
      );

      const result = await filterExistingTransactions(
        storageClient,
        transactions,
        TEST_OPERATOR,
        TEST_CONTENT_SMALL
      );

      expect(result.toSend.length).toBe(0);
      expect(result.skipped.length).toBe(1);
      expect(result.skipped[0].id).toBe(TEST_STORAGE_KEY_BYTES);
    });

    it("should keep transactions that don't exist", async () => {
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
        },
      ];

      mockClient.get.mockResolvedValue(null);

      const result = await filterExistingTransactions(
        storageClient,
        transactions,
        TEST_OPERATOR,
        TEST_CONTENT_SMALL
      );

      expect(result.toSend.length).toBe(1);
      expect(result.skipped.length).toBe(0);
      expect(result.toSend[0].id).toBe(TEST_STORAGE_KEY_BYTES);
    });

    it("should keep transactions when content doesn't match", async () => {
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
        },
      ];

      // Mock: data exists but doesn't match
      mockClient.get.mockResolvedValue(
        createMockStorageData("test.txt", "different content")
      );

      const result = await filterExistingTransactions(
        storageClient,
        transactions,
        TEST_OPERATOR,
        TEST_CONTENT_SMALL
      );

      expect(result.toSend.length).toBe(1);
      expect(result.skipped.length).toBe(0);
    });

    it("should filter out existing chunked storage", async () => {
      const chunkedHash = "0x" + "a".repeat(64);
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
        },
      ];

      mockClient.getChunkedMetadata.mockResolvedValue(
        createMockChunkedMetadata(5)
      );

      const result = await filterExistingTransactions(
        storageClient,
        transactions,
        TEST_OPERATOR
      );

      expect(result.toSend.length).toBe(0);
      expect(result.skipped.length).toBe(1);
    });

    it("should keep chunked storage that doesn't exist", async () => {
      const chunkedHash = "0x" + "a".repeat(64);
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
        },
      ];

      mockClient.getChunkedMetadata.mockResolvedValue(null);

      const result = await filterExistingTransactions(
        storageClient,
        transactions,
        TEST_OPERATOR
      );

      expect(result.toSend.length).toBe(1);
      expect(result.skipped.length).toBe(0);
    });

    it("should filter out existing metadata transactions", async () => {
      const metadata = '<net k="hash" v="0.0.1" />';
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
        },
      ];

      // Mock: metadata exists and matches
      mockClient.get.mockResolvedValue(
        createMockStorageData("test.txt", metadata)
      );

      const result = await filterExistingTransactions(
        storageClient,
        transactions,
        TEST_OPERATOR
      );

      expect(result.toSend.length).toBe(0);
      expect(result.skipped.length).toBe(1);
    });

    it("should handle mixed transaction types", async () => {
      const chunkedHash = "0x" + "a".repeat(64);
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
        },
      ];

      // First exists, second doesn't
      mockClient.get.mockResolvedValueOnce(
        createMockStorageData("test.txt", TEST_CONTENT_SMALL)
      );
      mockClient.getChunkedMetadata.mockResolvedValueOnce(null);

      const result = await filterExistingTransactions(
        storageClient,
        transactions,
        TEST_OPERATOR,
        TEST_CONTENT_SMALL
      );

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
        })),
      ];

      // Mock: first two chunks exist, third doesn't
      mockClient.getChunkedMetadata
        .mockResolvedValueOnce(createMockChunkedMetadata(5))
        .mockResolvedValueOnce(createMockChunkedMetadata(3))
        .mockResolvedValueOnce(null);

      const result = await filterXmlStorageTransactions(
        storageClient,
        transactions,
        TEST_OPERATOR,
        chunkedHashes
      );

      expect(result.toSend.length).toBe(2); // Metadata + one chunk
      expect(result.skipped.length).toBe(2); // Two chunks
      expect(result.toSend[0].type).toBe("metadata"); // Metadata first
      expect(result.toSend[1].type).toBe("chunked");
    });

    it("should skip metadata when all chunks exist and metadata matches", async () => {
      const chunkedHashes = ["0xhash1", "0xhash2"];
      const metadata =
        '<net k="0xhash1" v="0.0.1" /><net k="0xhash2" v="0.0.1" />';
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
        })),
      ];

      // All chunks exist
      mockClient.getChunkedMetadata.mockResolvedValue(
        createMockChunkedMetadata(5)
      );
      // Metadata exists and matches
      mockClient.get.mockResolvedValue(
        createMockStorageData("test.txt", metadata)
      );

      const result = await filterXmlStorageTransactions(
        storageClient,
        transactions,
        TEST_OPERATOR,
        chunkedHashes
      );

      expect(result.toSend.length).toBe(0);
      expect(result.skipped.length).toBe(3); // Metadata + 2 chunks
    });

    it("should keep metadata when chunks are missing", async () => {
      const chunkedHashes = ["0xhash1", "0xhash2"];
      const metadata = '<net k="0xhash1" v="0.0.1" />';
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
        })),
      ];

      // No chunks exist
      mockClient.getChunkedMetadata.mockResolvedValue(null);

      const result = await filterXmlStorageTransactions(
        storageClient,
        transactions,
        TEST_OPERATOR,
        chunkedHashes
      );

      expect(result.toSend.length).toBe(3); // Metadata + 2 chunks
      expect(result.skipped.length).toBe(0);
      expect(result.toSend[0].type).toBe("metadata");
    });

    it("should keep metadata when metadata doesn't match", async () => {
      const chunkedHashes = ["0xhash1", "0xhash2"];
      const expectedMetadata = '<net k="0xhash1" v="0.0.1" />';
      const differentMetadata = '<net k="0xhash1" v="0.0.2" />';
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
        })),
      ];

      // All chunks exist
      mockClient.getChunkedMetadata.mockResolvedValue(
        createMockChunkedMetadata(5)
      );
      // Metadata exists but doesn't match
      mockClient.get.mockResolvedValue(
        createMockStorageData("test.txt", differentMetadata)
      );

      const result = await filterXmlStorageTransactions(
        storageClient,
        transactions,
        TEST_OPERATOR,
        chunkedHashes
      );

      expect(result.toSend.length).toBe(1); // Only metadata
      expect(result.skipped.length).toBe(2); // Both chunks
      expect(result.toSend[0].type).toBe("metadata");
    });

    it("should preserve transaction order (metadata first)", async () => {
      const chunkedHashes = ["0xhash1"];
      const metadata = '<net k="0xhash1" v="0.0.1" />';
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
        },
      ];

      mockClient.getChunkedMetadata.mockResolvedValue(null);

      const result = await filterXmlStorageTransactions(
        storageClient,
        transactions,
        TEST_OPERATOR,
        chunkedHashes
      );

      expect(result.toSend[0].type).toBe("metadata");
      expect(result.toSend[1].type).toBe("chunked");
    });
  });
});
