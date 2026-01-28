import { describe, it, expect } from "vitest";
import {
  getNetrChainConfig,
  getNetrContract,
  getNetrSupportedChainIds,
  getNetAddress,
  getStorageAddress,
  getWethAddress,
  isNetrSupportedChain,
} from "../chainConfig";

describe("chainConfig", () => {
  const SUPPORTED_CHAIN_IDS = [8453, 9745, 143, 999]; // Base, Plasma, Monad, HyperEVM

  describe("isNetrSupportedChain", () => {
    it("should return true for Base (8453)", () => {
      expect(isNetrSupportedChain(8453)).toBe(true);
    });

    it("should return true for Plasma (9745)", () => {
      expect(isNetrSupportedChain(9745)).toBe(true);
    });

    it("should return true for Monad (143)", () => {
      expect(isNetrSupportedChain(143)).toBe(true);
    });

    it("should return true for HyperEVM (999)", () => {
      expect(isNetrSupportedChain(999)).toBe(true);
    });

    it("should return false for Ethereum mainnet (1)", () => {
      expect(isNetrSupportedChain(1)).toBe(false);
    });

    it("should return false for unknown chain ID", () => {
      expect(isNetrSupportedChain(12345)).toBe(false);
    });
  });

  describe("getNetrSupportedChainIds", () => {
    it("should return all supported chain IDs", () => {
      const chainIds = getNetrSupportedChainIds();

      expect(chainIds).toContain(8453);
      expect(chainIds).toContain(9745);
      expect(chainIds).toContain(143);
      expect(chainIds).toContain(999);
    });

    it("should return array of numbers", () => {
      const chainIds = getNetrSupportedChainIds();

      expect(Array.isArray(chainIds)).toBe(true);
      chainIds.forEach((id) => {
        expect(typeof id).toBe("number");
      });
    });

    it("should have 4 supported chains", () => {
      const chainIds = getNetrSupportedChainIds();
      expect(chainIds.length).toBe(4);
    });
  });

  describe("getNetrChainConfig", () => {
    it("should return config for Base", () => {
      const config = getNetrChainConfig(8453);

      expect(config).toBeDefined();
      expect(config?.name).toBe("Base");
      expect(config?.bangerV4Address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(config?.wethAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(config?.storageAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(config?.netAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it("should return config for Plasma", () => {
      const config = getNetrChainConfig(9745);

      expect(config).toBeDefined();
      expect(config?.name).toBe("Plasma");
    });

    it("should return config for Monad", () => {
      const config = getNetrChainConfig(143);

      expect(config).toBeDefined();
      expect(config?.name).toBe("Monad");
    });

    it("should return config for HyperEVM", () => {
      const config = getNetrChainConfig(999);

      expect(config).toBeDefined();
      expect(config?.name).toBe("HyperEVM");
    });

    it("should return undefined for unsupported chain", () => {
      const config = getNetrChainConfig(1);
      expect(config).toBeUndefined();
    });

    it("should have consistent WETH address across chains", () => {
      const expectedWeth = "0x4200000000000000000000000000000000000006";

      SUPPORTED_CHAIN_IDS.forEach((chainId) => {
        const config = getNetrChainConfig(chainId);
        expect(config?.wethAddress.toLowerCase()).toBe(expectedWeth.toLowerCase());
      });
    });
  });

  describe("getNetrContract", () => {
    it("should return contract info for supported chain", () => {
      const contract = getNetrContract(8453);

      expect(contract.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(Array.isArray(contract.abi)).toBe(true);
      expect(contract.abi.length).toBeGreaterThan(0);
    });

    it("should throw error for unsupported chain", () => {
      expect(() => getNetrContract(1)).toThrow("Netr: Unsupported chain ID: 1");
    });

    it("should throw error for unknown chain", () => {
      expect(() => getNetrContract(99999)).toThrow("Netr: Unsupported chain ID: 99999");
    });

    it("should return ABI with expected functions", () => {
      const contract = getNetrContract(8453);
      const abiNames = contract.abi
        .filter((item: unknown) => (item as { type?: string }).type === "function")
        .map((item: unknown) => (item as { name: string }).name);

      expect(abiNames).toContain("deployToken");
      expect(abiNames).toContain("generateSalt");
    });
  });

  describe("getWethAddress", () => {
    it("should return WETH address for supported chain", () => {
      const address = getWethAddress(8453);

      expect(address).toBeDefined();
      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it("should return undefined for unsupported chain", () => {
      expect(getWethAddress(1)).toBeUndefined();
    });
  });

  describe("getStorageAddress", () => {
    it("should return storage address for supported chain", () => {
      const address = getStorageAddress(8453);

      expect(address).toBeDefined();
      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it("should return undefined for unsupported chain", () => {
      expect(getStorageAddress(1)).toBeUndefined();
    });
  });

  describe("getNetAddress", () => {
    it("should return Net address for supported chain", () => {
      const address = getNetAddress(8453);

      expect(address).toBeDefined();
      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it("should return undefined for unsupported chain", () => {
      expect(getNetAddress(1)).toBeUndefined();
    });
  });
});
