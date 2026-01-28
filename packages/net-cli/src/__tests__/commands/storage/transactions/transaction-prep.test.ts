import { describe, it, expect, beforeEach } from "vitest";
import { StorageClient } from "@net-protocol/storage";
import {
  prepareNormalStorageTransaction,
  prepareXmlStorageTransactions,
} from "../../../../commands/storage/transactions/prep";
import {
  TEST_STORAGE_KEY,
  TEST_CONTENT_SMALL,
  TEST_CONTENT_LARGE,
  TEST_OPERATOR,
  TEST_CHAIN_ID,
  TEST_RPC_URL,
  TEST_STORAGE_KEY_BYTES,
  createNormalStorageArgs,
} from "../test-utils";
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
      const typedArgs = createNormalStorageArgs({
        storageKey: TEST_STORAGE_KEY,
        text: "test.txt",
        content: TEST_CONTENT_SMALL,
      });
      const result = prepareNormalStorageTransaction(
        storageClient,
        typedArgs,
        TEST_STORAGE_KEY
      );

      expect(result.type).toBe("normal");
      expect(result.transaction.functionName).toBe("put");
      expect(result.transaction.to).toBe(STORAGE_CONTRACT.address);
      expect(result.transaction.abi).toBeDefined();
    });

    it("should return transaction with correct ID", () => {
      const typedArgs = createNormalStorageArgs({
        storageKey: TEST_STORAGE_KEY,
        text: "test.txt",
        content: TEST_CONTENT_SMALL,
      });
      const result = prepareNormalStorageTransaction(
        storageClient,
        typedArgs,
        TEST_STORAGE_KEY
      );

      const expectedId = getStorageKeyBytes(TEST_STORAGE_KEY) as `0x${string}`;
      expect(result.id).toBe(expectedId);
      expect(result.id).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should pass correct parameters to preparePut", () => {
      const typedArgs = createNormalStorageArgs({
        storageKey: TEST_STORAGE_KEY,
        text: "test.txt",
        content: TEST_CONTENT_SMALL,
      });
      const result = prepareNormalStorageTransaction(
        storageClient,
        typedArgs,
        TEST_STORAGE_KEY
      );

      expect(result.transaction.args).toBeDefined();
      expect(result.transaction.args.length).toBeGreaterThan(0);
      // Check typed args instead
      expect(result.typedArgs).toBeDefined();
      expect(result.typedArgs.type).toBe("normal");
      if (result.typedArgs.type === "normal") {
        expect(result.typedArgs.args.key).toBeDefined();
      }
    });

    it("should return transaction with correct structure", () => {
      const typedArgs = createNormalStorageArgs({
        storageKey: TEST_STORAGE_KEY,
        text: "test.txt",
        content: TEST_CONTENT_SMALL,
      });
      const result = prepareNormalStorageTransaction(
        storageClient,
        typedArgs,
        TEST_STORAGE_KEY
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
      const result = prepareXmlStorageTransactions({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        text: "test.txt",
        content: TEST_CONTENT_LARGE,
        operatorAddress: TEST_OPERATOR,
      });

      expect(result.length).toBeGreaterThan(1);
      expect(result[0].type).toBe("metadata");
      expect(result[0].transaction.functionName).toBe("put");
      expect(result[0].transaction.to).toBe(STORAGE_CONTRACT.address);
    });

    it("should return chunk transactions after metadata", () => {
      const result = prepareXmlStorageTransactions({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        text: "test.txt",
        content: TEST_CONTENT_LARGE,
        operatorAddress: TEST_OPERATOR,
      });

      for (let i = 1; i < result.length; i++) {
        expect(result[i].type).toBe("chunked");
        expect(result[i].transaction.functionName).toBe("put");
        expect(result[i].transaction.to).toBe(CHUNKED_STORAGE_CONTRACT.address);
      }
    });

    it("should extract chunkedStorage hash IDs correctly", () => {
      const result = prepareXmlStorageTransactions({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        text: "test.txt",
        content: TEST_CONTENT_LARGE,
        operatorAddress: TEST_OPERATOR,
      });

      const chunkTxs = result.filter((tx) => tx.type === "chunked");
      chunkTxs.forEach((tx) => {
        expect(tx.id).toMatch(/^0x[0-9a-f]{64}$/);
        expect(tx.typedArgs.type).toBe("chunked");
        if (tx.typedArgs.type === "chunked") {
          expect(tx.typedArgs.args.hash).toBe(tx.id); // Hash should match ID
        }
      });
    });

    it("should use storageKeyBytes for metadata transaction ID", () => {
      const result = prepareXmlStorageTransactions({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        text: "test.txt",
        content: TEST_CONTENT_LARGE,
        operatorAddress: TEST_OPERATOR,
      });

      const expectedId = getStorageKeyBytes(TEST_STORAGE_KEY) as `0x${string}`;
      expect(result[0].id).toBe(expectedId);
      expect(result[0].type).toBe("metadata");
    });

    it("should return transactions with correct structure", () => {
      const result = prepareXmlStorageTransactions({
        storageClient,
        storageKey: TEST_STORAGE_KEY,
        text: "test.txt",
        content: TEST_CONTENT_LARGE,
        operatorAddress: TEST_OPERATOR,
      });

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
      const result = prepareXmlStorageTransactions({
        storageClient,
        storageKey: differentKey,
        text: "test.txt",
        content: TEST_CONTENT_LARGE,
        operatorAddress: TEST_OPERATOR,
      });

      const expectedId = getStorageKeyBytes(differentKey) as `0x${string}`;
      expect(result[0].id).toBe(expectedId);
    });
  });
});
