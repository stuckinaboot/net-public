import { describe, it, expect } from "vitest";
import {
  BANGER_V4_ABI,
  NETR_TOKEN_ABI,
  LP_LOCKER_ABI,
  UNISWAP_V3_POOL_ABI,
  DEFAULT_TOTAL_SUPPLY,
  DEFAULT_INITIAL_TICK,
  POOL_FEE_TIER,
  TOKEN_DECIMALS,
  ZERO_ADDRESS,
  CHAIN_INITIAL_TICKS,
} from "../constants";

describe("constants", () => {
  describe("ABIs", () => {
    it("BANGER_V4_ABI should be a valid ABI array", () => {
      expect(Array.isArray(BANGER_V4_ABI)).toBe(true);
      expect(BANGER_V4_ABI.length).toBeGreaterThan(0);
    });

    it("BANGER_V4_ABI should contain deployToken function", () => {
      const hasDeployToken = BANGER_V4_ABI.some(
        (item: unknown) =>
          (item as { type?: string; name?: string }).type === "function" &&
          (item as { type?: string; name?: string }).name === "deployToken"
      );
      expect(hasDeployToken).toBe(true);
    });

    it("BANGER_V4_ABI should contain generateSalt function", () => {
      const hasGenerateSalt = BANGER_V4_ABI.some(
        (item: unknown) =>
          (item as { type?: string; name?: string }).type === "function" &&
          (item as { type?: string; name?: string }).name === "generateSalt"
      );
      expect(hasGenerateSalt).toBe(true);
    });

    it("NETR_TOKEN_ABI should be a valid ABI array", () => {
      expect(Array.isArray(NETR_TOKEN_ABI)).toBe(true);
      expect(NETR_TOKEN_ABI.length).toBeGreaterThan(0);
    });

    it("NETR_TOKEN_ABI should contain standard ERC20 functions", () => {
      const abiNames = NETR_TOKEN_ABI.filter(
        (item: unknown) => (item as { type?: string }).type === "function"
      ).map((item: unknown) => (item as { name: string }).name);

      expect(abiNames).toContain("name");
      expect(abiNames).toContain("symbol");
      expect(abiNames).toContain("totalSupply");
      expect(abiNames).toContain("decimals");
    });

    it("LP_LOCKER_ABI should be a valid ABI array", () => {
      expect(Array.isArray(LP_LOCKER_ABI)).toBe(true);
      expect(LP_LOCKER_ABI.length).toBeGreaterThan(0);
    });

    it("LP_LOCKER_ABI should contain locker-specific functions", () => {
      const abiNames = LP_LOCKER_ABI.filter(
        (item: unknown) => (item as { type?: string }).type === "function"
      ).map((item: unknown) => (item as { name: string }).name);

      expect(abiNames).toContain("owner");
      expect(abiNames).toContain("duration");
      expect(abiNames).toContain("end");
    });

    it("UNISWAP_V3_POOL_ABI should be a valid ABI array", () => {
      expect(Array.isArray(UNISWAP_V3_POOL_ABI)).toBe(true);
      expect(UNISWAP_V3_POOL_ABI.length).toBeGreaterThan(0);
    });

    it("UNISWAP_V3_POOL_ABI should contain slot0 function", () => {
      const hasSlot0 = UNISWAP_V3_POOL_ABI.some(
        (item: unknown) =>
          (item as { type?: string; name?: string }).type === "function" &&
          (item as { type?: string; name?: string }).name === "slot0"
      );
      expect(hasSlot0).toBe(true);
    });
  });

  describe("numeric constants", () => {
    it("DEFAULT_TOTAL_SUPPLY should be 100 billion tokens (with 18 decimals)", () => {
      // 100 billion = 100_000_000_000 * 10^18
      const expectedSupply = BigInt("100000000000000000000000000000");
      expect(DEFAULT_TOTAL_SUPPLY).toBe(expectedSupply);
    });

    it("DEFAULT_INITIAL_TICK should be negative (token cheaper than WETH)", () => {
      expect(DEFAULT_INITIAL_TICK).toBe(-230400);
      expect(DEFAULT_INITIAL_TICK).toBeLessThan(0);
    });

    it("POOL_FEE_TIER should be 10000 (1%)", () => {
      expect(POOL_FEE_TIER).toBe(10000);
    });

    it("TOKEN_DECIMALS should be 18", () => {
      expect(TOKEN_DECIMALS).toBe(18);
    });
  });

  describe("ZERO_ADDRESS", () => {
    it("should be the zero address", () => {
      expect(ZERO_ADDRESS).toBe("0x0000000000000000000000000000000000000000");
    });

    it("should have correct length", () => {
      expect(ZERO_ADDRESS.length).toBe(42); // 0x + 40 hex chars
    });
  });

  describe("CHAIN_INITIAL_TICKS", () => {
    it("should have tick for Base (8453)", () => {
      expect(CHAIN_INITIAL_TICKS[8453]).toBe(-230400);
    });

    it("should have tick for HyperEVM (999)", () => {
      expect(CHAIN_INITIAL_TICKS[999]).toBe(-177400);
    });

    it("should have tick for Plasma (9745)", () => {
      expect(CHAIN_INITIAL_TICKS[9745]).toBe(-147200);
    });

    it("should have tick for Monad (143)", () => {
      expect(CHAIN_INITIAL_TICKS[143]).toBe(-115000);
    });

    it("all ticks should be negative", () => {
      Object.values(CHAIN_INITIAL_TICKS).forEach((tick) => {
        expect(tick).toBeLessThan(0);
      });
    });

    it("should have 4 chain entries", () => {
      expect(Object.keys(CHAIN_INITIAL_TICKS).length).toBe(4);
    });
  });
});
