import { describe, it, expect, vi, beforeEach } from "vitest";
import { NetrClient } from "../client/NetrClient";
import { DEFAULT_TOTAL_SUPPLY, DEFAULT_INITIAL_TICK, ZERO_ADDRESS } from "../constants";
import type { NetrDeployConfig } from "../types";

// Mock viem/actions
vi.mock("viem/actions", () => ({
  readContract: vi.fn(),
}));

// Mock @net-protocol/core
vi.mock("@net-protocol/core", () => ({
  getChainRpcUrls: vi.fn().mockReturnValue(["https://base-mainnet.public.blastapi.io"]),
  getNetContract: vi.fn().mockReturnValue({
    address: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    abi: [],
  }),
}));

// Mock @net-protocol/storage
vi.mock("@net-protocol/storage", () => ({
  STORAGE_CONTRACT: {
    address: "0x00000000db40fcb9f4466330982372e27fd7bbf5",
    abi: [],
  },
}));

// Mock chainConfig module
vi.mock("../chainConfig", () => ({
  getNetrChainConfig: vi.fn().mockReturnValue({
    name: "Base",
    bangerV4Address: "0x0000000000000000000000000000000000001234",
    wethAddress: "0x4200000000000000000000000000000000000006",
    storageAddress: "0x00000000db40fcb9f4466330982372e27fd7bbf5",
    netAddress: "0x00000000B24D62781dB359b07880a105cD0b64e6",
    initialTick: -230400,
    mintPrice: BigInt("500000000000000"),
  }),
  getNetrContract: vi.fn().mockReturnValue({
    address: "0x0000000000000000000000000000000000001234",
    abi: [
      {
        type: "function",
        name: "deployToken",
        inputs: [],
        outputs: [],
        stateMutability: "payable",
      },
      {
        type: "function",
        name: "generateSalt",
        inputs: [],
        outputs: [],
        stateMutability: "view",
      },
    ],
  }),
  getInitialTick: vi.fn().mockReturnValue(-230400),
}));

// Test constants
const TEST_CHAIN_ID = 8453;
const TEST_DEPLOYER = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" as `0x${string}`;

describe("NetrClient", () => {
  let client: NetrClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new NetrClient({ chainId: TEST_CHAIN_ID });
  });

  describe("constructor", () => {
    it("should create client with chain ID", () => {
      expect(client.getChainId()).toBe(TEST_CHAIN_ID);
    });

    it("should accept custom RPC URLs", () => {
      const customClient = new NetrClient({
        chainId: TEST_CHAIN_ID,
        overrides: { rpcUrls: ["https://custom-rpc.example.com"] },
      });
      expect(customClient.getChainId()).toBe(TEST_CHAIN_ID);
    });
  });

  describe("buildDeployConfig", () => {
    const baseConfig: NetrDeployConfig = {
      name: "Test Token",
      symbol: "TEST",
      image: "https://example.com/image.png",
      deployer: TEST_DEPLOYER,
    };

    const testSalt = "0x" + "a".repeat(64) as `0x${string}`;

    it("should build basic deploy config", () => {
      const result = client.buildDeployConfig(baseConfig, testSalt);

      expect(result.address).toBeDefined();
      expect(result.abi).toBeDefined();
      expect(result.functionName).toBe("deployToken");
      expect(result.chainId).toBe(TEST_CHAIN_ID);
      expect(result.args).toHaveLength(14);
    });

    it("should use DEFAULT_TOTAL_SUPPLY when not specified", () => {
      const result = client.buildDeployConfig(baseConfig, testSalt);

      // First arg is totalSupply
      expect(result.args[0]).toBe(DEFAULT_TOTAL_SUPPLY);
    });

    it("should use custom totalSupply when specified", () => {
      const customSupply = BigInt("500000000000000000000000000");
      const config: NetrDeployConfig = {
        ...baseConfig,
        totalSupply: customSupply,
      };

      const result = client.buildDeployConfig(config, testSalt);

      expect(result.args[0]).toBe(customSupply);
    });

    it("should use chain-specific initial tick for Base", () => {
      const result = client.buildDeployConfig(baseConfig, testSalt);

      // Second arg is initialTick - mocked getInitialTick returns -230400
      expect(result.args[1]).toBe(-230400);
    });

    it("should use custom initialTick when specified", () => {
      const customTick = -250000;
      const config: NetrDeployConfig = {
        ...baseConfig,
        initialTick: customTick,
      };

      const result = client.buildDeployConfig(config, testSalt);

      expect(result.args[1]).toBe(customTick);
    });

    it("should include salt in args", () => {
      const result = client.buildDeployConfig(baseConfig, testSalt);

      // Third arg is salt
      expect(result.args[2]).toBe(testSalt);
    });

    it("should include deployer in args", () => {
      const result = client.buildDeployConfig(baseConfig, testSalt);

      // Fourth arg is deployer
      expect(result.args[3]).toBe(TEST_DEPLOYER);
    });

    it("should use default 0n for mintPrice when not specified", () => {
      const result = client.buildDeployConfig(baseConfig, testSalt);

      // 6th arg (index 5) is mintPrice
      expect(result.args[5]).toBe(0n);
    });

    it("should use default 0n for mintEndTimestamp when not specified", () => {
      const result = client.buildDeployConfig(baseConfig, testSalt);

      // 7th arg (index 6) is mintEndTimestamp
      expect(result.args[6]).toBe(0n);
    });

    it("should use default 0n for maxMintSupply when not specified", () => {
      const result = client.buildDeployConfig(baseConfig, testSalt);

      // 8th arg (index 7) is maxMintSupply
      expect(result.args[7]).toBe(0n);
    });

    it("should use custom mint options when specified", () => {
      const config: NetrDeployConfig = {
        ...baseConfig,
        mintPrice: BigInt("1000000000000000"), // 0.001 ETH
        mintEndTimestamp: BigInt(1735689600), // Some timestamp
        maxMintSupply: BigInt(1000),
      };

      const result = client.buildDeployConfig(config, testSalt);

      expect(result.args[5]).toBe(BigInt("1000000000000000"));
      expect(result.args[6]).toBe(BigInt(1735689600));
      expect(result.args[7]).toBe(BigInt(1000));
    });

    it("should include name, symbol, and image in args", () => {
      const result = client.buildDeployConfig(baseConfig, testSalt);

      // args[8] = name, args[9] = symbol, args[10] = image
      expect(result.args[8]).toBe("Test Token");
      expect(result.args[9]).toBe("TEST");
      expect(result.args[10]).toBe("https://example.com/image.png");
    });

    it("should use empty string for animation when not specified", () => {
      const result = client.buildDeployConfig(baseConfig, testSalt);

      // args[11] = animation
      expect(result.args[11]).toBe("");
    });

    it("should include animation when specified", () => {
      const config: NetrDeployConfig = {
        ...baseConfig,
        animation: "https://example.com/video.mp4",
      };

      const result = client.buildDeployConfig(config, testSalt);

      expect(result.args[11]).toBe("https://example.com/video.mp4");
    });

    it("should use ZERO_ADDRESS for metadataAddress when not specified", () => {
      const result = client.buildDeployConfig(baseConfig, testSalt);

      // args[12] = metadataAddress
      expect(result.args[12]).toBe(ZERO_ADDRESS);
    });

    it("should include metadataAddress when specified", () => {
      const metadataAddr = "0x1234567890123456789012345678901234567890" as `0x${string}`;
      const config: NetrDeployConfig = {
        ...baseConfig,
        metadataAddress: metadataAddr,
      };

      const result = client.buildDeployConfig(config, testSalt);

      expect(result.args[12]).toBe(metadataAddr);
    });

    it("should use empty string for extraStringData when not specified", () => {
      const result = client.buildDeployConfig(baseConfig, testSalt);

      // args[13] = extraStringData
      expect(result.args[13]).toBe("");
    });

    it("should include extraStringData when specified", () => {
      const config: NetrDeployConfig = {
        ...baseConfig,
        extraStringData: "custom data",
      };

      const result = client.buildDeployConfig(config, testSalt);

      expect(result.args[13]).toBe("custom data");
    });

    describe("initialBuy / value handling", () => {
      it("should NOT include value when initialBuy is not specified", () => {
        const result = client.buildDeployConfig(baseConfig, testSalt);

        expect(result.value).toBeUndefined();
      });

      it("should include value when initialBuy is specified", () => {
        const initialBuyAmount = BigInt("1000000000000000"); // 0.001 ETH in wei
        const config: NetrDeployConfig = {
          ...baseConfig,
          initialBuy: initialBuyAmount,
        };

        const result = client.buildDeployConfig(config, testSalt);

        expect(result.value).toBe(initialBuyAmount);
      });

      it("should include value when initialBuy is 0n", () => {
        const config: NetrDeployConfig = {
          ...baseConfig,
          initialBuy: 0n,
        };

        const result = client.buildDeployConfig(config, testSalt);

        // 0n is falsy, so value should NOT be set
        expect(result.value).toBeUndefined();
      });

      it("should handle large initialBuy amounts", () => {
        const largeAmount = BigInt("10000000000000000000"); // 10 ETH in wei
        const config: NetrDeployConfig = {
          ...baseConfig,
          initialBuy: largeAmount,
        };

        const result = client.buildDeployConfig(config, testSalt);

        expect(result.value).toBe(largeAmount);
      });

      it("should handle small initialBuy amounts (like 0.000001 ETH)", () => {
        const smallAmount = BigInt("1000000000000"); // 0.000001 ETH in wei
        const config: NetrDeployConfig = {
          ...baseConfig,
          initialBuy: smallAmount,
        };

        const result = client.buildDeployConfig(config, testSalt);

        expect(result.value).toBe(smallAmount);
      });
    });

    describe("fid handling", () => {
      it("should use 0n for fid when not specified", () => {
        const result = client.buildDeployConfig(baseConfig, testSalt);

        // args[4] = fid
        expect(result.args[4]).toBe(0n);
      });

      it("should include fid when specified", () => {
        const config: NetrDeployConfig = {
          ...baseConfig,
          fid: BigInt(12345),
        };

        const result = client.buildDeployConfig(config, testSalt);

        expect(result.args[4]).toBe(BigInt(12345));
      });
    });
  });

  describe("getChainId", () => {
    it("should return the chain ID", () => {
      expect(client.getChainId()).toBe(TEST_CHAIN_ID);
    });

    it("should return correct chain ID for different chains", () => {
      const plasmaClient = new NetrClient({ chainId: 9745 });
      expect(plasmaClient.getChainId()).toBe(9745);
    });
  });
});
