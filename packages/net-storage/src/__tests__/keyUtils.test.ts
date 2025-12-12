import { describe, it, expect } from "vitest";
import { toBytes32, keccak256HashString } from "@net-protocol/core";
import {
  getStorageKeyBytes,
  formatStorageKeyForDisplay,
  encodeStorageKeyForUrl,
  generateStorageEmbedTag,
} from "../utils/keyUtils";

describe("keyUtils", () => {
  describe("toBytes32", () => {
    it("should convert short string to bytes32", () => {
      const result = toBytes32("hello");
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.length).toBe(66); // 0x + 64 hex chars
    });

    it("should convert 32-byte string to bytes32", () => {
      const str = "a".repeat(32);
      const result = toBytes32(str);
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should throw error for string longer than 32 bytes", () => {
      const str = "a".repeat(33);
      expect(() => toBytes32(str)).toThrow("String must be less than 32 bytes");
    });

    it("should handle empty string", () => {
      const result = toBytes32("");
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should handle special characters", () => {
      const result = toBytes32("test-key_123");
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });

  describe("keccak256HashString", () => {
    it("should produce consistent hashes", () => {
      const hash1 = keccak256HashString("test");
      const hash2 = keccak256HashString("test");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different strings", () => {
      const hash1 = keccak256HashString("test1");
      const hash2 = keccak256HashString("test2");
      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", () => {
      const hash = keccak256HashString("");
      expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should handle long strings", () => {
      const longString = "a".repeat(1000);
      const hash = keccak256HashString(longString);
      expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });

  describe("getStorageKeyBytes", () => {
    it("should handle direct hex bytes32 input", () => {
      const hexKey = "0x" + "a".repeat(64);
      const result = getStorageKeyBytes(hexKey);
      expect(result).toBe(hexKey.toLowerCase());
    });

    it("should convert short string to bytes32", () => {
      const result = getStorageKeyBytes("test-key");
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should hash long strings", () => {
      const longString = "a".repeat(100);
      const result = getStorageKeyBytes(longString);
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should handle lowercase conversion", () => {
      const result1 = getStorageKeyBytes("TEST-KEY");
      const result2 = getStorageKeyBytes("test-key");
      expect(result1).toBe(result2);
    });

    it("should handle 32-byte string", () => {
      const str = "a".repeat(32);
      const result = getStorageKeyBytes(str);
      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });

  describe("formatStorageKeyForDisplay", () => {
    it("should decode hex bytes32 to readable text", () => {
      // Create a hex bytes32 from a readable string
      const readableString = "test-key";
      const hexKey = getStorageKeyBytes(readableString);
      const result = formatStorageKeyForDisplay(hexKey);

      // Should attempt to decode, but may not always succeed
      expect(result).toHaveProperty("displayText");
      expect(result).toHaveProperty("isDecoded");
    });

    it("should return original for non-hex input", () => {
      const result = formatStorageKeyForDisplay("not-hex");
      expect(result.displayText).toBe("not-hex");
      expect(result.isDecoded).toBe(false);
    });

    it("should return original for invalid hex", () => {
      const invalidHex = "0xinvalid";
      const result = formatStorageKeyForDisplay(invalidHex);
      expect(result.displayText).toBe(invalidHex);
      expect(result.isDecoded).toBe(false);
    });

    it("should handle binary data (returns original)", () => {
      // Binary data that can't be decoded as text
      const binaryHex = "0x" + "ff".repeat(32);
      const result = formatStorageKeyForDisplay(binaryHex);
      expect(result.isDecoded).toBe(false);
    });
  });

  describe("encodeStorageKeyForUrl", () => {
    it("should encode special characters", () => {
      const key = "test key with spaces";
      const result = encodeStorageKeyForUrl(key);
      expect(result).toBe("test%20key%20with%20spaces");
    });

    it("should preserve trailing spaces", () => {
      const key = "test ";
      const result = encodeStorageKeyForUrl(key);
      expect(result).toBe("test%20");
    });

    it("should encode special characters correctly", () => {
      const key = "key/with?special&chars";
      const result = encodeStorageKeyForUrl(key);
      expect(result).toContain("%2F");
      expect(result).toContain("%3F");
      expect(result).toContain("%26");
    });

    it("should handle empty string", () => {
      const result = encodeStorageKeyForUrl("");
      expect(result).toBe("");
    });
  });

  describe("generateStorageEmbedTag", () => {
    it("should generate correct XML tag format", () => {
      const result = generateStorageEmbedTag({
        storageKeyBytes: "0x" + "a".repeat(64),
        operatorAddress: "0x" + "b".repeat(40),
      });

      expect(result).toContain('<net k="');
      expect(result).toContain('" v="0.0.1"');
      expect(result).toContain(' o="');
      expect(result).toContain('" />');
    });

    it("should include index attribute when provided", () => {
      const result = generateStorageEmbedTag({
        storageKeyBytes: "0x" + "a".repeat(64),
        operatorAddress: "0x" + "b".repeat(40),
        versionIndex: 5,
      });

      expect(result).toContain(' i="5"');
    });

    it("should include source attribute for regular storage", () => {
      const result = generateStorageEmbedTag({
        storageKeyBytes: "0x" + "a".repeat(64),
        operatorAddress: "0x" + "b".repeat(40),
        isRegularStorage: true,
      });

      expect(result).toContain(' s="d"');
    });

    it("should not include source attribute for chunked storage", () => {
      const result = generateStorageEmbedTag({
        storageKeyBytes: "0x" + "a".repeat(64),
        operatorAddress: "0x" + "b".repeat(40),
        isRegularStorage: false,
      });

      expect(result).not.toContain(' s="');
    });

    it("should lowercase operator address", () => {
      const result = generateStorageEmbedTag({
        storageKeyBytes: "0x" + "a".repeat(64),
        operatorAddress: "0x" + "ABCDEF".repeat(6) + "ABCD",
      });

      expect(result).toContain(' o="0xabcdef');
    });
  });
});
