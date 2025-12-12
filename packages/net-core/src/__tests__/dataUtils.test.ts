import { describe, it, expect } from "vitest";
import { normalizeData, normalizeDataOrEmpty } from "../utils/dataUtils";

describe("dataUtils", () => {
  describe("normalizeData", () => {
    it("should convert plain string to hex", () => {
      const result = normalizeData("test");
      expect(result).toMatch(/^0x/);
      expect(result).toBe("0x74657374"); // "test" as hex
    });

    it("should use hex string as-is", () => {
      const result = normalizeData("0x1234");
      expect(result).toBe("0x1234");
    });

    it("should validate hex string length", () => {
      expect(() => {
        normalizeData("0x123"); // Odd length
      }).toThrow("Invalid hex string: odd length");
    });

    it("should handle empty string", () => {
      const result = normalizeData("");
      expect(result).toBe("0x");
    });
  });

  describe("normalizeDataOrEmpty", () => {
    it("should return empty bytes when data is undefined", () => {
      const result = normalizeDataOrEmpty();
      expect(result).toBe("0x");
    });

    it("should return empty bytes when data is empty string", () => {
      const result = normalizeDataOrEmpty("");
      expect(result).toBe("0x");
    });

    it("should normalize when data is provided", () => {
      const result = normalizeDataOrEmpty("test");
      expect(result).toBe("0x74657374");
    });

    it("should use hex string as-is", () => {
      const result = normalizeDataOrEmpty("0x1234");
      expect(result).toBe("0x1234");
    });
  });
});

