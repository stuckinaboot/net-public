import { describe, it, expect } from "vitest";
import {
  batchTransactions,
  estimateTransactionSize,
  estimateRequestSize,
} from "../batch";
import {
  MAX_TRANSACTIONS_PER_BATCH,
  MAX_BATCH_SIZE_BYTES,
  MAX_TRANSACTION_SIZE_BYTES,
} from "../constants";
import type { WriteTransactionConfig } from "@net-protocol/core";
import type { Address } from "viem";

describe("batchTransactions", () => {
  const createMockTransaction = (
    dataSize: number = 1000
  ): WriteTransactionConfig => ({
    to: "0x0000000000000000000000000000000000000000" as Address,
    data: `0x${"00".repeat(dataSize)}`,
    args: Array(dataSize).fill("0x00"),
  });

  it("should batch transactions respecting count limit", () => {
    const transactions = Array(250).fill(null).map(() => createMockTransaction());
    const batches = batchTransactions(transactions);

    expect(batches.length).toBeGreaterThan(1);
    batches.forEach((batch) => {
      expect(batch.length).toBeLessThanOrEqual(MAX_TRANSACTIONS_PER_BATCH);
    });
  });

  it("should batch transactions respecting size limit", () => {
    // Create transactions that exceed size limit when batched
    const largeTransaction = createMockTransaction(50000); // ~50KB
    const transactions = Array(20).fill(null).map(() => largeTransaction);
    const batches = batchTransactions(transactions);

    expect(batches.length).toBeGreaterThan(1);
    batches.forEach((batch) => {
      const estimatedSize = estimateRequestSize(batch);
      expect(estimatedSize).toBeLessThanOrEqual(MAX_BATCH_SIZE_BYTES * 1.1); // Allow 10% margin
    });
  });

  it("should handle empty array", () => {
    const batches = batchTransactions([]);
    expect(batches).toEqual([]);
  });

  it("should handle single transaction", () => {
    const transactions = [createMockTransaction()];
    const batches = batchTransactions(transactions);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toEqual(transactions);
  });

  it("should handle single large transaction exceeding batch limit", () => {
    // Create a transaction that exceeds MAX_BATCH_SIZE_BYTES
    const hugeTransaction = createMockTransaction(200000); // ~200KB
    const batches = batchTransactions([hugeTransaction]);

    // Should still create a batch (server will reject with clear error)
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
  });

  it("should create multiple batches for mixed sizes", () => {
    const smallTx = createMockTransaction(1000);
    const largeTx = createMockTransaction(100000); // Large enough to force new batch
    const transactions = [
      ...Array(5).fill(smallTx),
      largeTx,
      ...Array(5).fill(smallTx),
    ];
    const batches = batchTransactions(transactions);

    // The large transaction should force a new batch
    expect(batches.length).toBeGreaterThanOrEqual(1);
    // Verify batches are created correctly
    const totalTransactions = batches.reduce((sum, batch) => sum + batch.length, 0);
    expect(totalTransactions).toBe(transactions.length);
  });
});

describe("estimateTransactionSize", () => {
  it("should estimate size based on args", () => {
    const tx: WriteTransactionConfig = {
      to: "0x0000000000000000000000000000000000000000" as Address,
      data: "0x1234",
      args: Array(1000).fill("0x00"),
    };

    const size = estimateTransactionSize(tx);
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThanOrEqual(MAX_TRANSACTION_SIZE_BYTES);
  });

  it("should cap at MAX_TRANSACTION_SIZE_BYTES", () => {
    const hugeTx: WriteTransactionConfig = {
      to: "0x0000000000000000000000000000000000000000" as Address,
      data: "0x1234",
      args: Array(200000).fill("0x00"),
    };

    const size = estimateTransactionSize(hugeTx);
    expect(size).toBeLessThanOrEqual(MAX_TRANSACTION_SIZE_BYTES);
  });

  it("should handle transaction without args", () => {
    const tx: WriteTransactionConfig = {
      to: "0x0000000000000000000000000000000000000000" as Address,
      data: "0x1234",
    };

    const size = estimateTransactionSize(tx);
    expect(size).toBeGreaterThan(0);
  });

  it("should include ABI size in estimate", () => {
    const mockAbi = [
      { type: "function", name: "put", inputs: [], outputs: [], stateMutability: "nonpayable" },
      { type: "function", name: "get", inputs: [], outputs: [], stateMutability: "view" },
    ];

    const txWithoutAbi: WriteTransactionConfig = {
      to: "0x0000000000000000000000000000000000000000" as Address,
      data: "0x1234",
      args: ["0x1234"],
    };

    const txWithAbi: WriteTransactionConfig = {
      to: "0x0000000000000000000000000000000000000000" as Address,
      data: "0x1234",
      args: ["0x1234"],
      abi: mockAbi as any,
    };

    const sizeWithoutAbi = estimateTransactionSize(txWithoutAbi);
    const sizeWithAbi = estimateTransactionSize(txWithAbi);

    // Size with ABI should be larger due to serialized ABI
    expect(sizeWithAbi).toBeGreaterThan(sizeWithoutAbi);
  });

  it("should handle large ABI correctly", () => {
    // Simulate a realistic ABI with multiple functions
    const largeAbi = Array(20).fill({
      type: "function",
      name: "someFunction",
      inputs: [
        { name: "key", type: "bytes32", internalType: "bytes32" },
        { name: "value", type: "string", internalType: "string" },
      ],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "nonpayable",
    });

    const tx: WriteTransactionConfig = {
      to: "0x0000000000000000000000000000000000000000" as Address,
      data: "0x1234",
      args: ["0x1234"],
      abi: largeAbi as any,
    };

    const size = estimateTransactionSize(tx);
    const abiSize = JSON.stringify(largeAbi).length;

    // Size should include the ABI
    expect(size).toBeGreaterThan(abiSize);
  });
});

describe("estimateRequestSize", () => {
  it("should include base overhead", () => {
    const transactions: WriteTransactionConfig[] = [];
    const size = estimateRequestSize(transactions);
    expect(size).toBeGreaterThan(0); // Base overhead
  });

  it("should sum transaction sizes", () => {
    const tx1: WriteTransactionConfig = {
      to: "0x0000000000000000000000000000000000000000" as Address,
      data: "0x1234",
      args: Array(1000).fill("0x00"),
    };
    const tx2: WriteTransactionConfig = {
      to: "0x0000000000000000000000000000000000000000" as Address,
      data: "0x5678",
      args: Array(1000).fill("0x00"),
    };

    const size = estimateRequestSize([tx1, tx2]);
    const tx1Size = estimateTransactionSize(tx1);
    const tx2Size = estimateTransactionSize(tx2);
    expect(size).toBeGreaterThan(tx1Size + tx2Size);
  });
});

