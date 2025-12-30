/**
 * Integration tests for large file batching in uploadRelay
 * 
 * Tests that batching logic correctly handles files that exceed limits
 */

import { describe, it, expect } from "vitest";
import { batchTransactions } from "../../../../commands/storage/core/uploadRelay";
import { STORAGE_CONTRACT } from "@net-protocol/storage";
import { stringToHex } from "viem";
import { toBytes32 } from "@net-protocol/core";
import type { WriteTransactionConfig } from "@net-protocol/core";

function createValidTransaction(index: number = 0): WriteTransactionConfig {
  return {
    to: STORAGE_CONTRACT.address,
    abi: STORAGE_CONTRACT.abi,
    functionName: "put",
    args: [
      toBytes32(`test-key-${index}`),
      `Test transaction ${index}`,
      stringToHex(`Test content ${index}`),
    ],
  };
}

describe("Large File Batching", () => {
  describe("Batching Logic", () => {
    it("should batch transactions when count exceeds 100", () => {
      // Create 101 transactions (exceeds limit)
      const transactions = Array.from({ length: 101 }, (_, i) =>
        createValidTransaction(i)
      );

      const batches = batchTransactions(transactions);

      // Should split into 2 batches: 100 + 1
      expect(batches.length).toBe(2);
      expect(batches[0].length).toBe(100);
      expect(batches[1].length).toBe(1);
    });

    it("should batch transactions when size exceeds 900KB", () => {
      // Create transactions with large args to trigger size-based batching
      // With 100KB per transaction estimate, 10 transactions = ~1MB (over 900KB limit)
      const transactions = Array.from({ length: 10 }, (_, i) => {
        const tx = createValidTransaction(i);
        // Make args large enough to trigger size limit
        // Each transaction needs ~100KB to exceed 900KB total with 10 transactions
        const largeValue = "0x" + "a".repeat(100000); // ~100KB hex string
        return {
          ...tx,
          args: [tx.args[0], tx.args[1], largeValue],
        };
      });

      const batches = batchTransactions(transactions);

      // Should batch based on size limit (9 transactions per batch @ 100KB each)
      // 10 transactions should split into 2 batches: 9 + 1
      expect(batches.length).toBeGreaterThan(1);
      // First batch should be at or under size limit
      expect(batches[0].length).toBeLessThanOrEqual(9);
    });
  });
});

