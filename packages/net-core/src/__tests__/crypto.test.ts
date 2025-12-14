import { describe, it, expect } from "vitest";
import { toBytes32, keccak256HashString } from "../utils/crypto";

describe("crypto utilities", () => {
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
});

