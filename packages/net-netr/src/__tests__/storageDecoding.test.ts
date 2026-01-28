import { describe, it, expect } from "vitest";
import {
  decodeBangerStorageData,
  extractAddressesFromMessageData,
  completeStorageData,
} from "../utils/storageDecoding";

describe("storageDecoding", () => {
  describe("decodeBangerStorageData", () => {
    it("should return null for undefined input", () => {
      expect(decodeBangerStorageData(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(decodeBangerStorageData("")).toBeNull();
    });

    it("should return null for string too short", () => {
      expect(decodeBangerStorageData("0x1234")).toBeNull();
    });

    it("should decode minimal storage data (66 chars)", () => {
      // 66 chars = messageIndex only (0x + 64 hex chars)
      const storageValue = "0x" + "00".repeat(31) + "05"; // messageIndex = 5

      const result = decodeBangerStorageData(storageValue);

      expect(result).not.toBeNull();
      expect(result?.messageIndex).toBe(5n);
      expect(result?.dropIndex).toBeUndefined();
      expect(result?.dropAddress).toBeUndefined();
      expect(result?.poolAddress).toBeUndefined();
      expect(result?.lockerAddress).toBeUndefined();
    });

    it("should decode storage data with dropIndex (130 chars)", () => {
      // First 64 hex = messageIndex, next 64 hex = dropIndex
      const messageIndexHex = "00".repeat(31) + "0a"; // messageIndex = 10
      const dropIndexHex = "00".repeat(31) + "03"; // dropIndex = 3
      const storageValue = "0x" + messageIndexHex + dropIndexHex;

      const result = decodeBangerStorageData(storageValue);

      expect(result).not.toBeNull();
      expect(result?.messageIndex).toBe(10n);
      expect(result?.dropIndex).toBe(3n);
    });

    it("should not set dropIndex if it is zero", () => {
      const messageIndexHex = "00".repeat(31) + "05";
      const dropIndexHex = "00".repeat(32); // dropIndex = 0
      const storageValue = "0x" + messageIndexHex + dropIndexHex;

      const result = decodeBangerStorageData(storageValue);

      expect(result?.dropIndex).toBeUndefined();
    });

    it("should decode storage data with dropAddress (170+ chars)", () => {
      const messageIndexHex = "00".repeat(31) + "05";
      const dropIndexHex = "00".repeat(31) + "01"; // dropIndex = 1 (must be non-zero)
      const paddingHex = "00".repeat(12); // 24 hex chars padding
      const dropAddressHex = "1234567890abcdef1234567890abcdef12345678"; // 40 hex chars
      const storageValue = "0x" + messageIndexHex + dropIndexHex + paddingHex + dropAddressHex;

      const result = decodeBangerStorageData(storageValue);

      expect(result).not.toBeNull();
      expect(result?.messageIndex).toBe(5n);
      expect(result?.dropIndex).toBe(1n);
      expect(result?.dropAddress?.toLowerCase()).toBe(
        "0x1234567890abcdef1234567890abcdef12345678"
      );
    });

    it("should not set dropAddress if zero address", () => {
      const messageIndexHex = "00".repeat(31) + "05";
      const dropIndexHex = "00".repeat(31) + "01";
      const paddingHex = "00".repeat(12);
      const dropAddressHex = "0".repeat(40); // zero address
      const storageValue = "0x" + messageIndexHex + dropIndexHex + paddingHex + dropAddressHex;

      const result = decodeBangerStorageData(storageValue);

      expect(result?.dropAddress).toBeUndefined();
    });

    it("should not set dropAddress if dropIndex is undefined", () => {
      const messageIndexHex = "00".repeat(31) + "05";
      const dropIndexHex = "00".repeat(32); // dropIndex = 0, so undefined
      const paddingHex = "00".repeat(12);
      const dropAddressHex = "1234567890abcdef1234567890abcdef12345678";
      const storageValue = "0x" + messageIndexHex + dropIndexHex + paddingHex + dropAddressHex;

      const result = decodeBangerStorageData(storageValue);

      expect(result?.dropIndex).toBeUndefined();
      expect(result?.dropAddress).toBeUndefined();
    });
  });

  describe("extractAddressesFromMessageData", () => {
    it("should return undefined for both if messageData is undefined", () => {
      const result = extractAddressesFromMessageData(undefined);

      expect(result.poolAddress).toBeUndefined();
      expect(result.lockerAddress).toBeUndefined();
    });

    it("should return undefined for both if messageData is too short", () => {
      const result = extractAddressesFromMessageData("0x1234");

      expect(result.poolAddress).toBeUndefined();
      expect(result.lockerAddress).toBeUndefined();
    });

    it("should extract poolAddress from message data", () => {
      // Pool address is at positions 90-130 (40 hex chars)
      const padding = "00".repeat(45); // 90 hex chars before pool
      const poolAddressHex = "abcdef1234567890abcdef1234567890abcdef12";
      const messageData = padding + poolAddressHex;

      const result = extractAddressesFromMessageData(messageData);

      expect(result.poolAddress?.toLowerCase()).toBe(
        "0xabcdef1234567890abcdef1234567890abcdef12"
      );
    });

    it("should extract both poolAddress and lockerAddress", () => {
      const padding = "00".repeat(45); // 90 hex chars
      const poolAddressHex = "abcdef1234567890abcdef1234567890abcdef12";
      const lockerAddressHex = "1234567890abcdef1234567890abcdef12345678";
      const messageData = padding + poolAddressHex + lockerAddressHex;

      const result = extractAddressesFromMessageData(messageData);

      expect(result.poolAddress?.toLowerCase()).toBe(
        "0xabcdef1234567890abcdef1234567890abcdef12"
      );
      expect(result.lockerAddress?.toLowerCase()).toBe(
        "0x1234567890abcdef1234567890abcdef12345678"
      );
    });

    it("should return undefined poolAddress if zero address", () => {
      const padding = "00".repeat(45);
      const poolAddressHex = "0".repeat(40); // zero address
      const messageData = padding + poolAddressHex;

      const result = extractAddressesFromMessageData(messageData);

      expect(result.poolAddress).toBeUndefined();
    });

    it("should return undefined lockerAddress if zero address", () => {
      const padding = "00".repeat(45);
      const poolAddressHex = "abcdef1234567890abcdef1234567890abcdef12";
      const lockerAddressHex = "0".repeat(40); // zero address
      const messageData = padding + poolAddressHex + lockerAddressHex;

      const result = extractAddressesFromMessageData(messageData);

      expect(result.poolAddress).not.toBeUndefined();
      expect(result.lockerAddress).toBeUndefined();
    });
  });

  describe("completeStorageData", () => {
    it("should return null if storageData is null", () => {
      const result = completeStorageData(null, "0x1234");
      expect(result).toBeNull();
    });

    it("should add addresses from messageData to storageData", () => {
      const storageData = {
        messageIndex: 5n,
        dropIndex: undefined,
        dropAddress: undefined,
        poolAddress: undefined,
        lockerAddress: undefined,
      };

      const padding = "00".repeat(45);
      const poolAddressHex = "abcdef1234567890abcdef1234567890abcdef12";
      const lockerAddressHex = "1234567890abcdef1234567890abcdef12345678";
      const messageData = padding + poolAddressHex + lockerAddressHex;

      const result = completeStorageData(storageData, messageData);

      expect(result).not.toBeNull();
      expect(result?.messageIndex).toBe(5n);
      expect(result?.poolAddress?.toLowerCase()).toBe(
        "0xabcdef1234567890abcdef1234567890abcdef12"
      );
      expect(result?.lockerAddress?.toLowerCase()).toBe(
        "0x1234567890abcdef1234567890abcdef12345678"
      );
    });

    it("should preserve existing storageData fields", () => {
      const storageData = {
        messageIndex: 10n,
        dropIndex: 3n,
        dropAddress: "0xdrop00000000000000000000000000000000add" as `0x${string}`,
        poolAddress: undefined,
        lockerAddress: undefined,
      };

      const result = completeStorageData(storageData, undefined);

      expect(result?.messageIndex).toBe(10n);
      expect(result?.dropIndex).toBe(3n);
      expect(result?.dropAddress).toBe("0xdrop00000000000000000000000000000000add");
    });

    it("should handle undefined messageData", () => {
      const storageData = {
        messageIndex: 5n,
        dropIndex: undefined,
        dropAddress: undefined,
        poolAddress: undefined,
        lockerAddress: undefined,
      };

      const result = completeStorageData(storageData, undefined);

      expect(result).not.toBeNull();
      expect(result?.poolAddress).toBeUndefined();
      expect(result?.lockerAddress).toBeUndefined();
    });
  });
});
