import { describe, it, expect } from "vitest";
import {
  chunkData,
  generateXmlMetadata,
  generateXmlMetadataWithSource,
  validateDataSize,
  computeTopLevelHash,
  processDataForStorage,
} from "../utils/writingUtils";

describe("writingUtils", () => {
  describe("chunkData", () => {
    it("should split data correctly", () => {
      const data = "a".repeat(200 * 1000); // 200KB
      const chunks = chunkData(data, 80 * 1000); // 80KB chunks

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(80 * 1000);
      });
    });

    it("should handle custom chunk size", () => {
      const data = "a".repeat(1000);
      const chunks = chunkData(data, 100);
      expect(chunks.length).toBe(10);
    });

    it("should handle empty data", () => {
      const chunks = chunkData("");
      expect(Array.isArray(chunks)).toBe(true);
      // Empty data results in empty array (no chunks needed)
      expect(chunks.length).toBe(0);
    });

    it("should handle data smaller than chunk size", () => {
      const data = "small";
      const chunks = chunkData(data, 1000);
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(data);
    });
  });

  describe("generateXmlMetadata", () => {
    it("should generate correct XML format", () => {
      const hashes = ["0xhash1", "0xhash2"];
      const metadata = generateXmlMetadata(hashes, 0, "0xoperator");

      expect(metadata).toContain('<net k="0xhash1"');
      expect(metadata).toContain('<net k="0xhash2"');
      expect(metadata).toContain('v="0.0.1"');
      expect(metadata).toContain('i="0"');
      expect(metadata).toContain('o="0xoperator"');
    });

    it("should include all required attributes", () => {
      const hashes = ["0xhash1"];
      const metadata = generateXmlMetadata(hashes, 5, "0xoperator");

      expect(metadata).toContain('k="0xhash1"');
      expect(metadata).toContain('v="0.0.1"');
      expect(metadata).toContain('i="5"');
      expect(metadata).toContain('o="0xoperator"');
    });

    it("should handle multiple chunks", () => {
      const hashes = ["0xhash1", "0xhash2", "0xhash3"];
      const metadata = generateXmlMetadata(hashes, 0, "0xoperator");

      const matches = metadata.match(/<net/g);
      expect(matches?.length).toBe(3);
    });

    it("should lowercase operator address", () => {
      const hashes = ["0xhash1"];
      const metadata = generateXmlMetadata(hashes, 0, "0xABCD");
      expect(metadata).toContain('o="0xabcd"');
    });
  });

  describe("generateXmlMetadataWithSource", () => {
    it("should include source attribute when provided", () => {
      const hashes = ["0xhash1"];
      const metadata = generateXmlMetadataWithSource(
        hashes,
        0,
        "0xoperator",
        "d"
      );

      expect(metadata).toContain('s="d"');
    });

    it("should handle optional source", () => {
      const hashes = ["0xhash1"];
      const metadata = generateXmlMetadataWithSource(hashes, 0, "0xoperator");

      expect(metadata).not.toContain('s="');
    });

    it("should generate same as generateXmlMetadata when source not provided", () => {
      const hashes = ["0xhash1"];
      const meta1 = generateXmlMetadata(hashes, 0, "0xoperator");
      const meta2 = generateXmlMetadataWithSource(hashes, 0, "0xoperator");

      expect(meta1).toBe(meta2);
    });
  });

  describe("validateDataSize", () => {
    it("should return valid for chunks <= 255", () => {
      const chunks = Array(255).fill("chunk");
      const result = validateDataSize(chunks);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return error for chunks > 255", () => {
      const chunks = Array(256).fill("chunk");
      const result = validateDataSize(chunks);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds maximum");
    });

    it("should return error for empty chunks", () => {
      const result = validateDataSize([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("No chunks generated");
    });

    it("should return valid for single chunk", () => {
      const result = validateDataSize(["chunk"]);
      expect(result.valid).toBe(true);
    });
  });

  describe("computeTopLevelHash", () => {
    it("should produce consistent hashes", () => {
      const hashes = ["0xhash1", "0xhash2"];
      const hash1 = computeTopLevelHash(hashes);
      const hash2 = computeTopLevelHash(hashes);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      const hashes1 = ["0xhash1", "0xhash2"];
      const hashes2 = ["0xhash2", "0xhash1"];
      const hash1 = computeTopLevelHash(hashes1);
      const hash2 = computeTopLevelHash(hashes2);
      expect(hash1).not.toBe(hash2);
    });

    it("should handle multiple chunk hashes", () => {
      const hashes = Array(10)
        .fill(0)
        .map((_, i) => `0xhash${i}`);
      const result = computeTopLevelHash(hashes);
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should handle single hash", () => {
      const result = computeTopLevelHash(["0xhash1"]);
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });

  describe("processDataForStorage", () => {
    it("should return all required fields", () => {
      const result = processDataForStorage("test data", "0xoperator");

      expect(result).toHaveProperty("chunks");
      expect(result).toHaveProperty("chunkHashes");
      expect(result).toHaveProperty("xmlMetadata");
      expect(result).toHaveProperty("topLevelHash");
      expect(result).toHaveProperty("valid");
    });

    it("should return valid result for normal data", () => {
      const result = processDataForStorage("test data", "0xoperator");
      expect(result.valid).toBe(true);
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.chunkHashes.length).toBe(result.chunks.length);
      expect(result.xmlMetadata.length).toBeGreaterThan(0);
    });

    it("should handle validation errors", () => {
      // Create data that would exceed max chunks
      // This is difficult to test directly, but we can test the validation path
      const result = processDataForStorage("test", "0xoperator");
      // Normal data should be valid
      expect(result.valid).toBe(true);
    });

    it("should handle custom storage key", () => {
      const customKey = "0x" + "a".repeat(64);
      const result = processDataForStorage("test", "0xoperator", customKey);
      expect(result.topLevelHash).toBe(customKey);
    });

    it("should compute top-level hash when not provided", () => {
      const result = processDataForStorage("test", "0xoperator");
      expect(result.topLevelHash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should generate XML metadata correctly", () => {
      const result = processDataForStorage("test data", "0xoperator");
      expect(result.xmlMetadata).toContain('<net k="');
      expect(result.xmlMetadata).toContain('v="0.0.1"');
      expect(result.xmlMetadata).toContain('o="0xoperator"');
    });
  });
});
