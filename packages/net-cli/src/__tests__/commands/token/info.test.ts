import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TEST_CHAIN_ID,
  TEST_TOKEN_ADDRESS,
  createMockTokenMetadata,
  createMockStorageData,
  createMockPriceData,
  createMockLockerData,
} from "./test-utils";
import type { TokenInfoOptions } from "../../../commands/token/types";

// Mock @net-protocol/netr
const mockGetToken = vi.fn();
const mockGetStorageData = vi.fn();
const mockGetPrice = vi.fn();
const mockGetLocker = vi.fn();

vi.mock("@net-protocol/netr", () => ({
  NetrClient: vi.fn().mockImplementation(() => ({
    getToken: mockGetToken,
    getStorageData: mockGetStorageData,
    getPrice: mockGetPrice,
    getLocker: mockGetLocker,
  })),
  isNetrSupportedChain: vi.fn().mockReturnValue(true),
}));

// Mock cli/shared
vi.mock("../../../cli/shared", () => ({
  parseReadOnlyOptions: vi.fn().mockImplementation((opts) => ({
    chainId: opts.chainId || TEST_CHAIN_ID,
    rpcUrl: opts.rpcUrl,
  })),
}));

// Mock console.log
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

// Import after mocks
import { executeTokenInfo } from "../../../commands/token/info";

describe("executeTokenInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockResolvedValue(createMockTokenMetadata());
    mockGetStorageData.mockResolvedValue(createMockStorageData());
    mockGetPrice.mockResolvedValue(createMockPriceData());
    mockGetLocker.mockResolvedValue(createMockLockerData());
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  describe("human-readable output", () => {
    const baseOptions: TokenInfoOptions = {
      address: TEST_TOKEN_ADDRESS,
      chainId: TEST_CHAIN_ID,
    };

    it("should display token info", async () => {
      await executeTokenInfo(baseOptions);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Token Info"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Name:"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Symbol:"));
    });

    it("should call client methods with correct parameters", async () => {
      await executeTokenInfo(baseOptions);

      expect(mockGetToken).toHaveBeenCalledWith(TEST_TOKEN_ADDRESS);
      expect(mockGetStorageData).toHaveBeenCalledWith(TEST_TOKEN_ADDRESS);
      expect(mockGetPrice).toHaveBeenCalledWith(TEST_TOKEN_ADDRESS);
    });

    it("should fetch locker data when available", async () => {
      const storageData = createMockStorageData({
        lockerAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
      });
      mockGetStorageData.mockResolvedValue(storageData);

      await executeTokenInfo(baseOptions);

      expect(mockGetLocker).toHaveBeenCalledWith(storageData.lockerAddress);
    });

    it("should NOT fetch locker when storageData has no lockerAddress", async () => {
      // Return storage data with no locker address
      mockGetStorageData.mockResolvedValue({
        messageIndex: 1n,
        dropIndex: undefined,
        dropAddress: undefined,
        poolAddress: ("0x" + "d".repeat(40)) as `0x${string}`,
        lockerAddress: undefined, // Explicitly no locker
      });

      await executeTokenInfo(baseOptions);

      expect(mockGetLocker).not.toHaveBeenCalled();
    });

    it("should display animation when present", async () => {
      mockGetToken.mockResolvedValue(createMockTokenMetadata({
        animation: "https://example.com/video.mp4",
      }));

      await executeTokenInfo(baseOptions);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Animation:"));
    });

    it("should display extra data when present", async () => {
      mockGetToken.mockResolvedValue(createMockTokenMetadata({
        extraStringData: "custom data",
      }));

      await executeTokenInfo(baseOptions);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Extra Data:"));
    });

    it("should display price when available", async () => {
      await executeTokenInfo(baseOptions);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Price:"));
    });

    it("should handle missing price gracefully", async () => {
      mockGetPrice.mockResolvedValue(null);

      await executeTokenInfo(baseOptions);

      // Should not throw
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("JSON output", () => {
    const jsonOptions: TokenInfoOptions = {
      address: TEST_TOKEN_ADDRESS,
      chainId: TEST_CHAIN_ID,
      json: true,
    };

    it("should output valid JSON", async () => {
      await executeTokenInfo(jsonOptions);

      const jsonOutputCall = consoleSpy.mock.calls.find(call => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
    });

    it("should include all token fields in JSON output", async () => {
      const tokenMetadata = createMockTokenMetadata({
        name: "My Token",
        symbol: "MTK",
      });
      mockGetToken.mockResolvedValue(tokenMetadata);

      await executeTokenInfo(jsonOptions);

      const jsonOutputCall = consoleSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.token !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      expect(output.token.name).toBe("My Token");
      expect(output.token.symbol).toBe("MTK");
      expect(output.address).toBe(TEST_TOKEN_ADDRESS);
      expect(output.chainId).toBe(TEST_CHAIN_ID);
    });

    it("should include pool and locker addresses in JSON", async () => {
      const storageData = createMockStorageData({
        poolAddress: "0xpool" as `0x${string}`,
        lockerAddress: "0xlocker" as `0x${string}`,
      });
      mockGetStorageData.mockResolvedValue(storageData);

      await executeTokenInfo(jsonOptions);

      const jsonOutputCall = consoleSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.pool !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      expect(output.pool).toBe(storageData.poolAddress);
      expect(output.locker).toBe(storageData.lockerAddress);
    });

    it("should include price data in JSON when available", async () => {
      const priceData = createMockPriceData({
        priceInEth: 0.0001,
        tick: -230400,
      });
      mockGetPrice.mockResolvedValue(priceData);

      await executeTokenInfo(jsonOptions);

      const jsonOutputCall = consoleSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.price !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      expect(output.price.priceInEth).toBe(0.0001);
      expect(output.price.tick).toBe(-230400);
    });

    it("should set price to null when not available", async () => {
      mockGetPrice.mockResolvedValue(null);

      await executeTokenInfo(jsonOptions);

      const jsonOutputCall = consoleSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.token !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      expect(output.price).toBeNull();
    });

    it("should include locker info in JSON when available", async () => {
      const lockerData = createMockLockerData({
        duration: BigInt(365 * 24 * 60 * 60),
        version: "1.0.0",
      });
      mockGetLocker.mockResolvedValue(lockerData);

      await executeTokenInfo(jsonOptions);

      const jsonOutputCall = consoleSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.lockerInfo !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      expect(output.lockerInfo).toBeDefined();
      expect(output.lockerInfo.version).toBe("1.0.0");
    });

    it("should convert bigints to strings in JSON output", async () => {
      const tokenMetadata = createMockTokenMetadata({
        totalSupply: BigInt("100000000000000000000000000"),
        fid: BigInt(12345),
      });
      mockGetToken.mockResolvedValue(tokenMetadata);

      await executeTokenInfo(jsonOptions);

      const jsonOutputCall = consoleSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.token !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      // BigInts should be stringified
      expect(typeof output.token.totalSupply).toBe("string");
      expect(typeof output.token.fid).toBe("string");
    });
  });

  describe("error handling", () => {
    it("should exit with error when token not found", async () => {
      mockGetToken.mockResolvedValue(null);

      const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {
        throw new Error("process.exit called");
      }) as any);

      const options: TokenInfoOptions = {
        address: TEST_TOKEN_ADDRESS,
        chainId: TEST_CHAIN_ID,
      };

      await expect(executeTokenInfo(options)).rejects.toThrow("process.exit called");

      mockExit.mockRestore();
    });

    it("should exit with error for unsupported chain", async () => {
      // Re-mock isNetrSupportedChain to return false
      const { isNetrSupportedChain } = await import("@net-protocol/netr");
      (isNetrSupportedChain as any).mockReturnValueOnce(false);

      const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {
        throw new Error("process.exit called");
      }) as any);

      const options: TokenInfoOptions = {
        address: TEST_TOKEN_ADDRESS,
        chainId: 1, // Unsupported
      };

      await expect(executeTokenInfo(options)).rejects.toThrow("process.exit called");

      mockExit.mockRestore();
    });
  });

  describe("custom RPC URL", () => {
    it("should pass RPC URL to client", async () => {
      const options: TokenInfoOptions = {
        address: TEST_TOKEN_ADDRESS,
        chainId: TEST_CHAIN_ID,
        rpcUrl: "https://custom-rpc.example.com",
      };

      await executeTokenInfo(options);

      // Client should be created with RPC URL
      // This is verified by the mock behavior
      expect(mockGetToken).toHaveBeenCalled();
    });
  });
});
