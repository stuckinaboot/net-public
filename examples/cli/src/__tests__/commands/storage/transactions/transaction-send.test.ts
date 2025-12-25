import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createWalletClientFromPrivateKey,
  sendTransactionsWithIdempotency,
} from "../../../../commands/storage/transactions/send";
import { StorageClient } from "@net-protocol/storage";
import {
  createMockWalletClient,
  createMockPublicClient,
  createMockStorageClient,
  createMockReceipt,
  MOCK_TX_HASH,
  TEST_CHAIN_ID,
  TEST_PRIVATE_KEY,
  TEST_OPERATOR,
  TEST_STORAGE_KEY_BYTES,
  TEST_CONTENT_SMALL,
} from "../test-utils";
import type { TransactionWithId } from "../../../../commands/storage/types";
import {
  STORAGE_CONTRACT,
  CHUNKED_STORAGE_CONTRACT,
} from "@net-protocol/storage";
import { stringToHex } from "viem";

describe("transaction-send", () => {
  let mockWalletClient: ReturnType<typeof createMockWalletClient>;
  let mockPublicClient: ReturnType<typeof createMockPublicClient>;
  let storageClient: StorageClient;
  let mockStorageClient: ReturnType<typeof createMockStorageClient>;

  beforeEach(() => {
    mockWalletClient = createMockWalletClient();
    mockPublicClient = createMockPublicClient();
    storageClient = new StorageClient({
      chainId: TEST_CHAIN_ID,
    });
    mockStorageClient = createMockStorageClient();
    (storageClient as any).get = mockStorageClient.get;
    (storageClient as any).getChunkedMetadata =
      mockStorageClient.getChunkedMetadata;
  });

  describe("createWalletClientFromPrivateKey", () => {
    it("should create wallet and public clients", () => {
      const result = createWalletClientFromPrivateKey(
        TEST_PRIVATE_KEY,
        TEST_CHAIN_ID
      );

      expect(result.walletClient).toBeDefined();
      expect(result.publicClient).toBeDefined();
      expect(result.operatorAddress).toBeDefined();
      expect(result.operatorAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it("should use custom RPC URL when provided", () => {
      const customRpc = "https://custom-rpc.com";
      const result = createWalletClientFromPrivateKey(
        TEST_PRIVATE_KEY,
        TEST_CHAIN_ID,
        customRpc
      );

      expect(result.publicClient).toBeDefined();
      expect(result.walletClient).toBeDefined();
    });

    it("should return correct operator address", () => {
      const result = createWalletClientFromPrivateKey(
        TEST_PRIVATE_KEY,
        TEST_CHAIN_ID
      );

      // The address should be derived from the private key
      expect(result.operatorAddress).toBeDefined();
      expect(typeof result.operatorAddress).toBe("string");
    });
  });

  describe("sendTransactionsWithIdempotency", () => {
    it("should send transactions sequentially", async () => {
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [TEST_STORAGE_KEY_BYTES, "test1", stringToHex("content1")],
          },
        },
        {
          id: "0x" + "b".repeat(64),
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: ["0x" + "b".repeat(64), "test2", stringToHex("content2")],
          },
        },
      ];

      // Mock: transactions don't exist
      mockStorageClient.get.mockResolvedValue(null);
      // Mock: transactions succeed
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue(
        createMockReceipt()
      );

      const result = await sendTransactionsWithIdempotency(
        storageClient,
        mockWalletClient as any,
        mockPublicClient as any,
        transactions,
        TEST_OPERATOR
      );

      expect(result.transactionsSent).toBe(2);
      expect(result.transactionsSkipped).toBe(0);
      expect(result.transactionsFailed).toBe(0);
      expect(result.success).toBe(true);
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(2);
      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledTimes(
        2
      );
    });

    it("should skip transactions that already exist", async () => {
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [TEST_STORAGE_KEY_BYTES, "test1", stringToHex("content1")],
          },
        },
        {
          id: "0x" + "b".repeat(64),
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: ["0x" + "b".repeat(64), "test2", stringToHex("content2")],
          },
        },
      ];

      // Mock: first exists, second doesn't
      mockStorageClient.get
        .mockResolvedValueOnce({
          text: "test1",
          value: stringToHex("content1") as `0x${string}`,
        })
        .mockResolvedValueOnce(null);

      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue(
        createMockReceipt()
      );

      const result = await sendTransactionsWithIdempotency(
        storageClient,
        mockWalletClient as any,
        mockPublicClient as any,
        transactions,
        TEST_OPERATOR
      );

      expect(result.transactionsSent).toBe(1);
      expect(result.transactionsSkipped).toBe(1);
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1);
    });

    it("should handle transaction failures gracefully", async () => {
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [TEST_STORAGE_KEY_BYTES, "test1", stringToHex("content1")],
          },
        },
        {
          id: "0x" + "b".repeat(64),
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: ["0x" + "b".repeat(64), "test2", stringToHex("content2")],
          },
        },
      ];

      mockStorageClient.get.mockResolvedValue(null);
      // First transaction fails, second succeeds
      mockWalletClient.writeContract
        .mockRejectedValueOnce(new Error("Transaction failed"))
        .mockResolvedValueOnce(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue(
        createMockReceipt()
      );

      const result = await sendTransactionsWithIdempotency(
        storageClient,
        mockWalletClient as any,
        mockPublicClient as any,
        transactions,
        TEST_OPERATOR
      );

      expect(result.transactionsSent).toBe(1);
      expect(result.transactionsFailed).toBe(1);
      expect(result.success).toBe(false);
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(2);
    });

    it("should return final hash from last successful transaction", async () => {
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [TEST_STORAGE_KEY_BYTES, "test1", stringToHex("content1")],
          },
        },
      ];

      mockStorageClient.get.mockResolvedValue(null);
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue(
        createMockReceipt()
      );

      const result = await sendTransactionsWithIdempotency(
        storageClient,
        mockWalletClient as any,
        mockPublicClient as any,
        transactions,
        TEST_OPERATOR
      );

      expect(result.finalHash).toBe(MOCK_TX_HASH);
    });

    it("should skip chunked storage that exists", async () => {
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

      mockStorageClient.getChunkedMetadata.mockResolvedValue({
        chunkCount: 5,
        originalText: "",
      });

      const result = await sendTransactionsWithIdempotency(
        storageClient,
        mockWalletClient as any,
        mockPublicClient as any,
        transactions,
        TEST_OPERATOR
      );

      expect(result.transactionsSent).toBe(0);
      expect(result.transactionsSkipped).toBe(1);
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });

    it("should handle all transactions skipped scenario", async () => {
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [TEST_STORAGE_KEY_BYTES, "test1", stringToHex("content1")],
          },
        },
      ];

      mockStorageClient.get.mockResolvedValue({
        text: "test1",
        value: stringToHex("content1") as `0x${string}`,
      });

      const result = await sendTransactionsWithIdempotency(
        storageClient,
        mockWalletClient as any,
        mockPublicClient as any,
        transactions,
        TEST_OPERATOR
      );

      expect(result.transactionsSent).toBe(0);
      expect(result.transactionsSkipped).toBe(1);
      expect(result.success).toBe(true);
      expect(result.finalHash).toBeUndefined();
    });

    it("should wait for confirmation after each transaction", async () => {
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [TEST_STORAGE_KEY_BYTES, "test1", stringToHex("content1")],
          },
        },
        {
          id: "0x" + "b".repeat(64),
          type: "normal",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: ["0x" + "b".repeat(64), "test2", stringToHex("content2")],
          },
        },
      ];

      mockStorageClient.get.mockResolvedValue(null);
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue(
        createMockReceipt()
      );

      await sendTransactionsWithIdempotency(
        storageClient,
        mockWalletClient as any,
        mockPublicClient as any,
        transactions,
        TEST_OPERATOR
      );

      // Should wait for confirmation after each transaction
      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledTimes(
        2
      );
      expect(
        mockPublicClient.waitForTransactionReceipt
      ).toHaveBeenNthCalledWith(1, { hash: MOCK_TX_HASH });
      expect(
        mockPublicClient.waitForTransactionReceipt
      ).toHaveBeenNthCalledWith(2, { hash: MOCK_TX_HASH });
    });

    it("should handle metadata transaction idempotency", async () => {
      const transactions: TransactionWithId[] = [
        {
          id: TEST_STORAGE_KEY_BYTES,
          type: "metadata",
          transaction: {
            to: STORAGE_CONTRACT.address,
            abi: STORAGE_CONTRACT.abi,
            functionName: "put",
            args: [TEST_STORAGE_KEY_BYTES, "test.txt", stringToHex("<net />")],
          },
        },
      ];

      // Mock: metadata exists
      mockStorageClient.get.mockResolvedValue({
        text: "test.txt",
        value: stringToHex("<net />") as `0x${string}`,
      });

      const result = await sendTransactionsWithIdempotency(
        storageClient,
        mockWalletClient as any,
        mockPublicClient as any,
        transactions,
        TEST_OPERATOR
      );

      expect(result.transactionsSent).toBe(0);
      expect(result.transactionsSkipped).toBe(1);
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });
  });
});
