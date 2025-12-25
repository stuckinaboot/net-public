import { describe, it, expect, beforeEach } from "vitest";
import { StorageClient } from "@net-protocol/storage";
import {
  prepareNormalStorageTransaction,
  prepareXmlStorageTransactions,
} from "../transactions/prep";
import {
  TEST_STORAGE_KEY,
  TEST_CONTENT_SMALL,
  TEST_CONTENT_LARGE,
  TEST_OPERATOR,
  TEST_CHAIN_ID,
  TEST_RPC_URL,
} from "./test-utils";
import {
  STORAGE_CONTRACT,
  CHUNKED_STORAGE_CONTRACT,
} from "@net-protocol/storage";
import { getStorageKeyBytes } from "@net-protocol/storage";

describe("transaction-prep", () => {
  let storageClient: StorageClient;

  beforeEach(() => {
    // Create real StorageClient (not mocked) - we want to test actual preparation
    storageClient = new StorageClient({
      chainId: TEST_CHAIN_ID,
      overrides: { rpcUrls: [TEST_RPC_URL] },
    });
  });

  describe("prepareNormalStorageTransaction", () => {
    it("should use StorageClient.preparePut()", () => {
      const result = prepareNormalStorageTransaction(
        storageClient,
        TEST_STORAGE_KEY,
        "test.txt",
        TEST_CONTENT_SMALL
      );

      expect(result.type).toBe("normal");
      expect(result.transaction.functionName).toBe("put");
      expect(result.transaction.to).toBe(STORAGE_CONTRACT.address);
      expect(result.transaction.abi).toBeDefined();
    });

    it("should return transaction with correct ID", () => {
      const result = prepareNormalStorageTransaction(
        storageClient,
        TEST_STORAGE_KEY,
        "test.txt",
        TEST_CONTENT_SMALL
      );

      const expectedId = getStorageKeyBytes(TEST_STORAGE_KEY) as `0x${string}`;
      expect(result.id).toBe(expectedId);
      expect(result.id).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should pass correct parameters to preparePut", () => {
      const result = prepareNormalStorageTransaction(
        storageClient,
        TEST_STORAGE_KEY,
        "test.txt",
        TEST_CONTENT_SMALL
      );

      expect(result.transaction.args).toBeDefined();
      expect(result.transaction.args.length).toBeGreaterThan(0);
      // First arg should be the storage key
      expect(result.transaction.args[0]).toBeDefined();
    });

    it("should return transaction with correct structure", () => {
      const result = prepareNormalStorageTransaction(
        storageClient,
        TEST_STORAGE_KEY,
        "test.txt",
        TEST_CONTENT_SMALL
      );

      expect(result.transaction).toHaveProperty("to");
      expect(result.transaction).toHaveProperty("abi");
      expect(result.transaction).toHaveProperty("functionName");
      expect(result.transaction).toHaveProperty("args");
      expect(result.transaction.functionName).toBe("put");
    });
  });

  describe("prepareXmlStorageTransactions", () => {
    it("should return metadata transaction first", () => {
      const result = prepareXmlStorageTransactions(
        storageClient,
        TEST_STORAGE_KEY,
        "test.txt",
        TEST_CONTENT_LARGE,
        TEST_OPERATOR
      );

      expect(result.length).toBeGreaterThan(1);
      expect(result[0].type).toBe("metadata");
      expect(result[0].transaction.functionName).toBe("put");
      expect(result[0].transaction.to).toBe(STORAGE_CONTRACT.address);
    });

    it("should return chunk transactions after metadata", () => {
      const result = prepareXmlStorageTransactions(
        storageClient,
        TEST_STORAGE_KEY,
        "test.txt",
        TEST_CONTENT_LARGE,
        TEST_OPERATOR
      );

      for (let i = 1; i < result.length; i++) {
        expect(result[i].type).toBe("chunked");
        expect(result[i].transaction.functionName).toBe("put");
        expect(result[i].transaction.to).toBe(CHUNKED_STORAGE_CONTRACT.address);
      }
    });

    it("should extract chunkedStorage hash IDs correctly", () => {
      const result = prepareXmlStorageTransactions(
        storageClient,
        TEST_STORAGE_KEY,
        "test.txt",
        TEST_CONTENT_LARGE,
        TEST_OPERATOR
      );

      const chunkTxs = result.filter((tx) => tx.type === "chunked");
      chunkTxs.forEach((tx) => {
        expect(tx.id).toMatch(/^0x[0-9a-f]{64}$/);
        expect(tx.transaction.args[0]).toBe(tx.id); // First arg should be the hash
      });
    });

    it("should use storageKeyBytes for metadata transaction ID", () => {
      const result = prepareXmlStorageTransactions(
        storageClient,
        TEST_STORAGE_KEY,
        "test.txt",
        TEST_CONTENT_LARGE,
        TEST_OPERATOR
      );

      const expectedId = getStorageKeyBytes(TEST_STORAGE_KEY) as `0x${string}`;
      expect(result[0].id).toBe(expectedId);
      expect(result[0].type).toBe("metadata");
    });

    it("should return transactions with correct structure", () => {
      const result = prepareXmlStorageTransactions(
        storageClient,
        TEST_STORAGE_KEY,
        "test.txt",
        TEST_CONTENT_LARGE,
        TEST_OPERATOR
      );

      result.forEach((tx) => {
        expect(tx.transaction).toHaveProperty("to");
        expect(tx.transaction).toHaveProperty("abi");
        expect(tx.transaction).toHaveProperty("functionName");
        expect(tx.transaction).toHaveProperty("args");
        expect(tx.id).toBeDefined();
        expect(tx.type).toMatch(/^(metadata|chunked)$/);
      });
    });

    it("should handle different storage keys correctly", () => {
      const differentKey = "different-key";
      const result = prepareXmlStorageTransactions(
        storageClient,
        differentKey,
        "test.txt",
        TEST_CONTENT_LARGE,
        TEST_OPERATOR
      );

      const expectedId = getStorageKeyBytes(differentKey) as `0x${string}`;
      expect(result[0].id).toBe(expectedId);
    });
  });
});
