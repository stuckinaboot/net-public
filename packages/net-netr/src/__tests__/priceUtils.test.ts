import { describe, it, expect } from "vitest";
import {
  calculatePriceFromSqrtPriceX96,
  estimateMarketCap,
  formatPrice,
  priceFromTick,
  tickFromPrice,
} from "../utils/priceUtils";
import { TOKEN_DECIMALS } from "../constants";

describe("priceUtils", () => {
  describe("calculatePriceFromSqrtPriceX96", () => {
    it("should calculate price from sqrtPriceX96", () => {
      // sqrtPriceX96 = sqrt(price) * 2^96
      // For price = 1, sqrtPriceX96 = 2^96
      const sqrtPriceX96 = BigInt(2) ** BigInt(96);
      const tick = 0;

      const result = calculatePriceFromSqrtPriceX96(sqrtPriceX96, tick);

      expect(result.priceInWeth).toBeCloseTo(1, 5);
      expect(result.priceInEth).toBeCloseTo(1, 5);
      expect(result.sqrtPriceX96).toBe(sqrtPriceX96);
      expect(result.tick).toBe(tick);
    });

    it("should handle small prices", () => {
      // sqrtPriceX96 for a small price
      const sqrtPriceX96 = BigInt(2) ** BigInt(90); // sqrt(1/64) * 2^96
      const tick = -60000;

      const result = calculatePriceFromSqrtPriceX96(sqrtPriceX96, tick);

      expect(result.priceInWeth).toBeLessThan(1);
      expect(result.priceInWeth).toBeGreaterThan(0);
    });

    it("should handle large prices", () => {
      const sqrtPriceX96 = BigInt(2) ** BigInt(100); // sqrt(16) * 2^96
      const tick = 13863;

      const result = calculatePriceFromSqrtPriceX96(sqrtPriceX96, tick);

      expect(result.priceInWeth).toBeGreaterThan(1);
    });

    it("should return same values for priceInWeth and priceInEth", () => {
      const sqrtPriceX96 = BigInt(2) ** BigInt(96);
      const tick = 0;

      const result = calculatePriceFromSqrtPriceX96(sqrtPriceX96, tick);

      expect(result.priceInWeth).toBe(result.priceInEth);
    });
  });

  describe("estimateMarketCap", () => {
    it("should calculate market cap in ETH", () => {
      const priceInEth = 0.0001;
      const totalSupply = BigInt(100_000_000) * BigInt(10 ** TOKEN_DECIMALS);

      const result = estimateMarketCap(priceInEth, totalSupply);

      expect(result.marketCapEth).toBeCloseTo(10000, 0);
      expect(result.marketCapUsd).toBeUndefined();
    });

    it("should calculate market cap in USD when ETH price provided", () => {
      const priceInEth = 0.0001;
      const totalSupply = BigInt(100_000_000) * BigInt(10 ** TOKEN_DECIMALS);
      const ethPriceUsd = 3000;

      const result = estimateMarketCap(priceInEth, totalSupply, ethPriceUsd);

      expect(result.marketCapEth).toBeCloseTo(10000, 0);
      expect(result.marketCapUsd).toBeCloseTo(30_000_000, 0);
    });

    it("should handle zero price", () => {
      const priceInEth = 0;
      const totalSupply = BigInt(100_000_000) * BigInt(10 ** TOKEN_DECIMALS);

      const result = estimateMarketCap(priceInEth, totalSupply);

      expect(result.marketCapEth).toBe(0);
    });

    it("should handle very small prices", () => {
      const priceInEth = 0.000000001;
      const totalSupply = BigInt(100_000_000_000) * BigInt(10 ** TOKEN_DECIMALS);

      const result = estimateMarketCap(priceInEth, totalSupply);

      expect(result.marketCapEth).toBeCloseTo(100, 1);
    });
  });

  describe("formatPrice", () => {
    it("should format regular price with default significant digits", () => {
      const result = formatPrice(0.001234567);
      expect(result).toBe("0.00123457");
    });

    it("should format zero", () => {
      expect(formatPrice(0)).toBe("0");
    });

    it("should use exponential notation for very small prices", () => {
      const result = formatPrice(0.0000001);
      expect(result).toMatch(/e-/);
    });

    it("should respect custom significant digits", () => {
      const result = formatPrice(0.00123456789, 4);
      expect(result).toBe("0.001235");
    });

    it("should handle price just above threshold", () => {
      const result = formatPrice(0.000001);
      expect(result).not.toMatch(/e-/);
    });

    it("should handle price just below threshold", () => {
      const result = formatPrice(0.0000009);
      expect(result).toMatch(/e-/);
    });
  });

  describe("priceFromTick", () => {
    it("should return 1 for tick 0", () => {
      expect(priceFromTick(0)).toBeCloseTo(1, 10);
    });

    it("should return value > 1 for positive tick", () => {
      expect(priceFromTick(100)).toBeGreaterThan(1);
    });

    it("should return value < 1 for negative tick", () => {
      expect(priceFromTick(-100)).toBeLessThan(1);
    });

    it("should follow formula 1.0001^tick", () => {
      const tick = 1000;
      const expected = Math.pow(1.0001, tick);
      expect(priceFromTick(tick)).toBeCloseTo(expected, 10);
    });

    it("should handle large negative tick (common initial tick)", () => {
      const tick = -230400; // Base initial tick
      const result = priceFromTick(tick);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });
  });

  describe("tickFromPrice", () => {
    it("should return 0 for price 1", () => {
      expect(tickFromPrice(1)).toBe(0);
    });

    it("should return positive tick for price > 1", () => {
      expect(tickFromPrice(2)).toBeGreaterThan(0);
    });

    it("should return negative tick for price < 1", () => {
      expect(tickFromPrice(0.5)).toBeLessThan(0);
    });

    it("should be inverse of priceFromTick", () => {
      const originalTick = 1000;
      const price = priceFromTick(originalTick);
      const recoveredTick = tickFromPrice(price);
      expect(recoveredTick).toBe(originalTick);
    });

    it("should handle very small prices", () => {
      const smallPrice = 0.0000001;
      const tick = tickFromPrice(smallPrice);
      expect(tick).toBeLessThan(-100000);
    });
  });
});
