import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TEST_CHAIN_ID,
  TEST_PRIVATE_KEY,
  TEST_TOKEN_ADDRESS,
  MOCK_TX_HASH,
  createMockSaltResult,
  createMockDeployTxConfig,
} from "./test-utils";
import type { TokenDeployOptions } from "../../../commands/token/types";

// Mock viem
vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    encodeFunctionData: vi.fn().mockReturnValue("0xencoded"),
    createWalletClient: vi.fn().mockReturnValue({
      sendTransaction: vi.fn().mockResolvedValue(MOCK_TX_HASH),
    }),
    http: vi.fn().mockReturnValue({}),
    parseEther: (actual as any).parseEther,
  };
});

// Mock viem/accounts
vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn().mockReturnValue({
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  }),
}));

// Mock @net-protocol/netr
const mockGenerateSalt = vi.fn();
const mockBuildDeployConfig = vi.fn();

vi.mock("@net-protocol/netr", () => ({
  NetrClient: vi.fn().mockImplementation(() => ({
    generateSalt: mockGenerateSalt,
    buildDeployConfig: mockBuildDeployConfig,
  })),
  isNetrSupportedChain: vi.fn().mockReturnValue(true),
}));

// Mock @net-protocol/core
vi.mock("@net-protocol/core", () => ({
  getChainRpcUrls: vi.fn().mockReturnValue(["https://base-mainnet.public.blastapi.io"]),
}));

// Mock cli/shared
vi.mock("../../../cli/shared", () => ({
  parseCommonOptions: vi.fn().mockImplementation((opts) => ({
    privateKey: opts.privateKey || TEST_PRIVATE_KEY,
    chainId: opts.chainId || TEST_CHAIN_ID,
    rpcUrl: opts.rpcUrl,
  })),
  parseReadOnlyOptions: vi.fn().mockImplementation((opts) => ({
    chainId: opts.chainId || TEST_CHAIN_ID,
    rpcUrl: opts.rpcUrl,
  })),
}));

// Mock console.log
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

// Import after mocks
import { executeTokenDeploy } from "../../../commands/token/deploy";

describe("executeTokenDeploy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateSalt.mockResolvedValue(createMockSaltResult());
    mockBuildDeployConfig.mockReturnValue(createMockDeployTxConfig());
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  describe("standard deployment", () => {
    const baseOptions: TokenDeployOptions = {
      name: "Test Token",
      symbol: "TEST",
      image: "https://example.com/image.png",
      privateKey: TEST_PRIVATE_KEY,
      chainId: TEST_CHAIN_ID,
    };

    it("should deploy token successfully", async () => {
      await executeTokenDeploy(baseOptions);

      // Should call generateSalt
      expect(mockGenerateSalt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Token",
          symbol: "TEST",
          image: "https://example.com/image.png",
        })
      );

      // Should call buildDeployConfig
      expect(mockBuildDeployConfig).toHaveBeenCalled();

      // Should log success message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Token deployed successfully")
      );
    });

    it("should include animation when specified", async () => {
      const options: TokenDeployOptions = {
        ...baseOptions,
        animation: "https://example.com/video.mp4",
      };

      await executeTokenDeploy(options);

      expect(mockGenerateSalt).toHaveBeenCalledWith(
        expect.objectContaining({
          animation: "https://example.com/video.mp4",
        })
      );
    });

    it("should include fid when specified", async () => {
      const options: TokenDeployOptions = {
        ...baseOptions,
        fid: "12345",
      };

      await executeTokenDeploy(options);

      expect(mockGenerateSalt).toHaveBeenCalledWith(
        expect.objectContaining({
          fid: BigInt(12345),
        })
      );
    });
  });

  describe("initialBuy handling", () => {
    it("should pass initialBuy to buildDeployConfig when specified", async () => {
      const options: TokenDeployOptions = {
        name: "Test Token",
        symbol: "TEST",
        image: "https://example.com/image.png",
        privateKey: TEST_PRIVATE_KEY,
        chainId: TEST_CHAIN_ID,
        initialBuy: "0.001",
      };

      // Mock buildDeployConfig to return config with value
      const configWithValue = createMockDeployTxConfig({ value: BigInt("1000000000000000") });
      mockBuildDeployConfig.mockReturnValue(configWithValue);

      await executeTokenDeploy(options);

      // Check that buildDeployConfig was called with initialBuy
      expect(mockBuildDeployConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          initialBuy: BigInt("1000000000000000"), // 0.001 ETH in wei
        }),
        expect.any(String)
      );

      // Should log message about initial buy
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("0.001 ETH initial buy")
      );
    });

    it("should NOT pass initialBuy when not specified", async () => {
      const options: TokenDeployOptions = {
        name: "Test Token",
        symbol: "TEST",
        image: "https://example.com/image.png",
        privateKey: TEST_PRIVATE_KEY,
        chainId: TEST_CHAIN_ID,
      };

      await executeTokenDeploy(options);

      expect(mockBuildDeployConfig).toHaveBeenCalledWith(
        expect.not.objectContaining({
          initialBuy: expect.anything(),
        }),
        expect.any(String)
      );
    });
  });

  describe("encode-only mode", () => {
    it("should output JSON instead of deploying", async () => {
      const options: TokenDeployOptions = {
        name: "Test Token",
        symbol: "TEST",
        image: "https://example.com/image.png",
        chainId: TEST_CHAIN_ID,
        encodeOnly: true,
      };

      await executeTokenDeploy(options);

      // Should output JSON
      const jsonOutputCall = consoleSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.predictedAddress && parsed.transaction;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      expect(output.predictedAddress).toBe(TEST_TOKEN_ADDRESS);
      expect(output.transaction).toBeDefined();
      expect(output.transaction.chainId).toBe(TEST_CHAIN_ID);
    });

    it("should include salt in encode-only output", async () => {
      const options: TokenDeployOptions = {
        name: "Test Token",
        symbol: "TEST",
        image: "https://example.com/image.png",
        chainId: TEST_CHAIN_ID,
        encodeOnly: true,
      };

      await executeTokenDeploy(options);

      const jsonOutputCall = consoleSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.salt !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      expect(output.salt).toBeDefined();
    });

    it("should include initialBuy in config when specified with encode-only", async () => {
      const options: TokenDeployOptions = {
        name: "Test Token",
        symbol: "TEST",
        image: "https://example.com/image.png",
        chainId: TEST_CHAIN_ID,
        encodeOnly: true,
        initialBuy: "0.001",
      };

      // Mock buildDeployConfig to return config with value
      mockBuildDeployConfig.mockReturnValue(
        createMockDeployTxConfig({ value: BigInt("1000000000000000") })
      );

      await executeTokenDeploy(options);

      const jsonOutputCall = consoleSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.config !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      expect(output.config.initialBuy).toBe("0.001");
    });

    it("should use placeholder address when no private key in encode-only mode", async () => {
      const options: TokenDeployOptions = {
        name: "Test Token",
        symbol: "TEST",
        image: "https://example.com/image.png",
        chainId: TEST_CHAIN_ID,
        encodeOnly: true,
        // No privateKey
      };

      await executeTokenDeploy(options);

      expect(mockGenerateSalt).toHaveBeenCalledWith(
        expect.objectContaining({
          deployer: "0x0000000000000000000000000000000000000000",
        })
      );
    });
  });

  describe("error handling", () => {
    it("should handle salt generation failure", async () => {
      mockGenerateSalt.mockResolvedValue(null);

      const options: TokenDeployOptions = {
        name: "Test Token",
        symbol: "TEST",
        image: "https://example.com/image.png",
        privateKey: TEST_PRIVATE_KEY,
        chainId: TEST_CHAIN_ID,
      };

      // Should exit with error (exitWithError calls process.exit)
      // We need to mock this to test
      const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {
        throw new Error("process.exit called");
      }) as any);

      await expect(executeTokenDeploy(options)).rejects.toThrow("process.exit called");

      mockExit.mockRestore();
    });
  });

  describe("mint options", () => {
    it("should pass mintPrice when specified", async () => {
      const options: TokenDeployOptions = {
        name: "Test Token",
        symbol: "TEST",
        image: "https://example.com/image.png",
        privateKey: TEST_PRIVATE_KEY,
        chainId: TEST_CHAIN_ID,
        mintPrice: "1000000000000000", // 0.001 ETH in wei as string
      };

      await executeTokenDeploy(options);

      expect(mockBuildDeployConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          mintPrice: BigInt("1000000000000000"),
        }),
        expect.any(String)
      );
    });

    it("should pass mintEndTimestamp when specified", async () => {
      const options: TokenDeployOptions = {
        name: "Test Token",
        symbol: "TEST",
        image: "https://example.com/image.png",
        privateKey: TEST_PRIVATE_KEY,
        chainId: TEST_CHAIN_ID,
        mintEndTimestamp: "1735689600",
      };

      await executeTokenDeploy(options);

      expect(mockBuildDeployConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          mintEndTimestamp: BigInt(1735689600),
        }),
        expect.any(String)
      );
    });

    it("should pass maxMintSupply when specified", async () => {
      const options: TokenDeployOptions = {
        name: "Test Token",
        symbol: "TEST",
        image: "https://example.com/image.png",
        privateKey: TEST_PRIVATE_KEY,
        chainId: TEST_CHAIN_ID,
        maxMintSupply: "1000",
      };

      await executeTokenDeploy(options);

      expect(mockBuildDeployConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          maxMintSupply: BigInt(1000),
        }),
        expect.any(String)
      );
    });
  });
});
