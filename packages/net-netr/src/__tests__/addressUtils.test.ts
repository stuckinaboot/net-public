import { describe, it, expect } from "vitest";
import { addressToBytes32, bytes32ToAddress, isValidAddress } from "../utils/addressUtils";

describe("addressUtils", () => {
  describe("addressToBytes32", () => {
    it("should convert a valid address to bytes32", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678";
      const result = addressToBytes32(address);

      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.length).toBe(66);
      expect(result.endsWith("1234567890abcdef1234567890abcdef12345678")).toBe(true);
    });

    it("should handle address without 0x prefix", () => {
      const address = "1234567890abcdef1234567890abcdef12345678";
      const result = addressToBytes32(address);

      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.endsWith("1234567890abcdef1234567890abcdef12345678")).toBe(true);
    });

    it("should handle uppercase address", () => {
      const address = "0x1234567890ABCDEF1234567890ABCDEF12345678";
      const result = addressToBytes32(address);

      expect(result).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should pad with zeros at the beginning", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678";
      const result = addressToBytes32(address);

      expect(result.startsWith("0x000000000000000000000000")).toBe(true);
    });

    it("should throw error for invalid hex", () => {
      const address = "0xinvalidhex!@#$";
      expect(() => addressToBytes32(address)).toThrow("Invalid address format");
    });
  });

  describe("isValidAddress", () => {
    it("should return true for valid address with 0x prefix", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678";
      expect(isValidAddress(address)).toBe(true);
    });

    it("should return true for valid address without 0x prefix", () => {
      const address = "1234567890abcdef1234567890abcdef12345678";
      expect(isValidAddress(address)).toBe(true);
    });

    it("should return true for uppercase address", () => {
      const address = "0x1234567890ABCDEF1234567890ABCDEF12345678";
      expect(isValidAddress(address)).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isValidAddress("")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isValidAddress(null as unknown as string)).toBe(false);
      expect(isValidAddress(undefined as unknown as string)).toBe(false);
    });

    it("should return false for invalid hex characters", () => {
      expect(isValidAddress("0xghijklmnopqrstuvwxyz12345678901234567890")).toBe(false);
    });

    it("should return false for address too short", () => {
      expect(isValidAddress("0x1234567890")).toBe(false);
    });

    it("should return false for address too long", () => {
      expect(isValidAddress("0x1234567890abcdef1234567890abcdef1234567890")).toBe(false);
    });
  });

  describe("bytes32ToAddress", () => {
    it("should convert bytes32 to address", () => {
      const bytes32 = "0x0000000000000000000000001234567890abcdef1234567890abcdef12345678";
      const result = bytes32ToAddress(bytes32);

      expect(result).toBe("0x1234567890abcdef1234567890abcdef12345678");
    });

    it("should extract last 40 characters as address", () => {
      const bytes32 = "0xffffffffffffffffffffffff1234567890abcdef1234567890abcdef12345678";
      const result = bytes32ToAddress(bytes32);

      expect(result).toBe("0x1234567890abcdef1234567890abcdef12345678");
    });

    it("should throw error for string too short", () => {
      const shortBytes = "0x1234";
      expect(() => bytes32ToAddress(shortBytes)).toThrow("Invalid bytes32 format");
    });

    it("should throw error for empty string", () => {
      expect(() => bytes32ToAddress("")).toThrow("Invalid bytes32 format");
    });

    it("should throw error for null/undefined", () => {
      expect(() => bytes32ToAddress(null as unknown as string)).toThrow("Invalid bytes32 format");
      expect(() => bytes32ToAddress(undefined as unknown as string)).toThrow("Invalid bytes32 format");
    });

    it("should be inverse of addressToBytes32", () => {
      const originalAddress = "0x1234567890abcdef1234567890abcdef12345678";
      const bytes32 = addressToBytes32(originalAddress);
      const recoveredAddress = bytes32ToAddress(bytes32);

      expect(recoveredAddress).toBe(originalAddress);
    });
  });
});
