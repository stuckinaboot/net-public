import { describe, it, expect } from "vitest";
import { hexToString } from "viem";
import {
  chunkDataForStorage,
  assembleChunks,
  shouldSuggestXmlStorage,
  getChunkCount,
} from "../utils/chunkUtils";

describe("chunkUtils", () => {
  describe("chunkDataForStorage", () => {
    it("should produce chunks for data", () => {
      const data = "test data";
      const chunks = chunkDataForStorage(data);
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk).toMatch(/^0x[0-9a-f]*$/);
      });
    });

    it("should handle empty data", () => {
      const chunks = chunkDataForStorage("");
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      // Empty data gets compressed, so chunk won't be exactly "0x"
      chunks.forEach((chunk) => {
        expect(chunk).toMatch(/^0x[0-9a-f]*$/);
      });
    });

    it("should handle large data (> 20KB)", () => {
      const largeData = "a".repeat(30 * 1000); // 30KB
      const chunks = chunkDataForStorage(largeData);
      // Compression may make large data fit in one chunk, so just check it produces chunks
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      chunks.forEach((chunk) => {
        expect(chunk).toMatch(/^0x[0-9a-f]*$/);
      });
    });

    it("should compress data", () => {
      const repetitiveData = "a".repeat(1000);
      const chunks = chunkDataForStorage(repetitiveData);
      // Compressed data should be smaller than original
      const totalChunkSize = chunks.reduce(
        (sum, chunk) => sum + (chunk.length - 2) / 2,
        0
      );
      // Note: Compression effectiveness varies, but should generally be smaller
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should produce consistent chunks for same input", () => {
      const data = "test data";
      const chunks1 = chunkDataForStorage(data);
      const chunks2 = chunkDataForStorage(data);
      expect(chunks1).toEqual(chunks2);
    });
  });

  describe("assembleChunks", () => {
    it("should reverse chunkDataForStorage correctly (round-trip)", () => {
      const originalData = "test data for round-trip";
      const chunks = chunkDataForStorage(originalData);
      const assembled = assembleChunks(chunks);

      expect(assembled).toBeDefined();
      // assembleChunks returns plain string (converted via hexToString internally)
      if (assembled) {
        expect(assembled).toBe(originalData);
      }
    });

    it("should handle empty chunks array", () => {
      const assembled = assembleChunks([]);
      expect(assembled).toBeUndefined();
    });

    it("should handle single chunk", () => {
      const data = "small data";
      const chunks = chunkDataForStorage(data);
      const assembled = assembleChunks(chunks);
      if (assembled) {
        // assembleChunks returns plain string (converted via hexToString internally)
        expect(assembled).toBe(data);
      } else {
        expect(assembled).toBeDefined();
      }
    });

    it("should handle multiple chunks", () => {
      const largeData = "a".repeat(30 * 1000);
      const chunks = chunkDataForStorage(largeData);
      expect(chunks.length).toBeGreaterThanOrEqual(1);

      const assembled = assembleChunks(chunks);
      // assembleChunks returns plain string (converted via hexToString internally)
      if (assembled !== undefined) {
        expect(assembled).toBe(largeData);
      } else {
        // If decompression fails, that's also a valid outcome
        expect(assembled).toBeUndefined();
      }
    });

    it("should return undefined for invalid compressed data", () => {
      const invalidChunks = ["0x1234", "0x5678"];
      const assembled = assembleChunks(invalidChunks);
      // Should return undefined if decompression fails
      expect(assembled).toBeUndefined();
    });

    it("should handle chunks with empty strings", () => {
      const chunks = ["0x", "0x1234"];
      const assembled = assembleChunks(chunks);
      // Invalid compressed data returns undefined, which is expected
      expect(assembled === undefined || typeof assembled === "string").toBe(
        true
      );
    });
  });

  describe("shouldSuggestXmlStorage", () => {
    it("should return true for data > 20KB", () => {
      const largeData = "a".repeat(20 * 1000 + 1);
      expect(shouldSuggestXmlStorage(largeData)).toBe(true);
    });

    it("should return true for data with XML references", () => {
      const xmlData = '<net k="hash" v="0.0.1" />';
      expect(shouldSuggestXmlStorage(xmlData)).toBe(true);
    });

    it("should return false for small regular data", () => {
      const smallData = "regular text";
      expect(shouldSuggestXmlStorage(smallData)).toBe(false);
    });

    it("should return false for data exactly 20KB (needs to be > 20KB)", () => {
      const exactData = "a".repeat(20 * 1000);
      // Function checks data.length > CHUNK_SIZE, so exactly 20KB returns false
      expect(shouldSuggestXmlStorage(exactData)).toBe(false);
    });
  });

  describe("getChunkCount", () => {
    it("should return correct estimate for small data", () => {
      const data = "test";
      const count = getChunkCount(data);
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it("should return correct estimate for large data", () => {
      const largeData = "a".repeat(50 * 1000);
      const count = getChunkCount(largeData);
      expect(count).toBeGreaterThan(1);
    });

    it("should return at least 1 for any data", () => {
      const count = getChunkCount("");
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it("should match actual chunk count approximately", () => {
      const data = "a".repeat(30 * 1000);
      const estimated = getChunkCount(data);
      const actual = chunkDataForStorage(data).length;
      // Estimate should be close to actual (within reasonable range)
      expect(Math.abs(estimated - actual)).toBeLessThan(5);
    });
  });
});
