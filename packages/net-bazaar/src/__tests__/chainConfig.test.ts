import { describe, it, expect } from "vitest";
import {
  getBazaarChainConfig,
  getBazaarSupportedChainIds,
  isBazaarSupportedOnChain,
  getBazaarAddress,
  getCollectionOffersAddress,
  getSeaportAddress,
  getWrappedNativeCurrency,
  getCurrencySymbol,
} from "../chainConfig";

describe("chainConfig", () => {
  describe("getBazaarSupportedChainIds", () => {
    it("returns array of supported chain IDs", () => {
      const chainIds = getBazaarSupportedChainIds();
      expect(Array.isArray(chainIds)).toBe(true);
      expect(chainIds.length).toBeGreaterThan(0);
      expect(chainIds).toContain(8453); // Base
    });
  });

  describe("isBazaarSupportedOnChain", () => {
    it("returns true for Base", () => {
      expect(isBazaarSupportedOnChain(8453)).toBe(true);
    });

    it("returns false for unsupported chain", () => {
      expect(isBazaarSupportedOnChain(99999)).toBe(false);
    });
  });

  describe("getBazaarChainConfig", () => {
    it("returns config for Base", () => {
      const config = getBazaarChainConfig(8453);
      expect(config).toBeDefined();
      expect(config?.bazaarAddress).toBe("0x000000058f3ade587388daf827174d0e6fc97595");
      expect(config?.nftFeeBps).toBe(0); // 0% on Base
    });

    it("returns undefined for unsupported chain", () => {
      expect(getBazaarChainConfig(99999)).toBeUndefined();
    });
  });

  describe("getBazaarAddress", () => {
    it("returns flexible fee address for Base", () => {
      expect(getBazaarAddress(8453)).toBe("0x000000058f3ade587388daf827174d0e6fc97595");
    });

    it("returns default address for Ham", () => {
      expect(getBazaarAddress(5112)).toBe("0x00000000E3dA5fC031282A39759bDDA78ae7fAE5");
    });
  });

  describe("getCollectionOffersAddress", () => {
    it("returns address for Base", () => {
      expect(getCollectionOffersAddress(8453)).toBe("0x0000000f9c45efcff0f78d8b54aa6a40092d66dc");
    });
  });

  describe("getSeaportAddress", () => {
    it("returns default Seaport address for most chains", () => {
      expect(getSeaportAddress(8453)).toBe("0x0000000000000068F116a894984e2DB1123eB395");
    });

    it("returns custom Seaport address for Ink", () => {
      expect(getSeaportAddress(57073)).toBe("0xD00C96804e9fF35f10C7D2a92239C351Ff3F94e5");
    });
  });

  describe("getWrappedNativeCurrency", () => {
    it("returns WETH for Base", () => {
      const weth = getWrappedNativeCurrency(8453);
      expect(weth?.symbol).toBe("WETH");
      expect(weth?.address).toBe("0x4200000000000000000000000000000000000006");
    });

    it("returns WHYPE for HyperEVM", () => {
      const whype = getWrappedNativeCurrency(999);
      expect(whype?.symbol).toBe("WHYPE");
    });
  });

  describe("getCurrencySymbol", () => {
    it("returns eth for Base", () => {
      expect(getCurrencySymbol(8453)).toBe("eth");
    });

    it("returns hype for HyperEVM", () => {
      expect(getCurrencySymbol(999)).toBe("hype");
    });

    it("returns degen for Degen", () => {
      expect(getCurrencySymbol(666666666)).toBe("degen");
    });
  });
});
