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
  DEFAULT_MINT_DURATION_SECONDS,
  DEFAULT_MINT_PRICE,
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

  describe("NFT mint defaults", () => {
    it("DEFAULT_MINT_DURATION_SECONDS should be 24 hours", () => {
      expect(DEFAULT_MINT_DURATION_SECONDS).toBe(60 * 60 * 24);
      expect(DEFAULT_MINT_DURATION_SECONDS).toBe(86400);
    });

    it("DEFAULT_MINT_PRICE should be 0.0005 ETH in wei", () => {
      expect(DEFAULT_MINT_PRICE).toBe(BigInt("500000000000000"));
    });
  });
});
