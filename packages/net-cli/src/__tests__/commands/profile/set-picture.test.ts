import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TEST_CHAIN_ID,
  TEST_PRIVATE_KEY,
  TEST_PROFILE_PICTURE,
  createSetPictureOptions,
} from "./test-utils";

// Define mock functions at module level
const mockWriteContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();
const mockExtend = vi.fn();

// Mock viem - use function factory to avoid hoisting issues
vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createWalletClient: vi.fn(() => ({
      extend: () => ({
        writeContract: mockWriteContract,
        waitForTransactionReceipt: mockWaitForTransactionReceipt,
      }),
    })),
    http: vi.fn(),
  };
});

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn().mockReturnValue({
    address: "0xTestAddress",
  }),
}));

// Mock @net-protocol/core
vi.mock("@net-protocol/core", () => ({
  getChainRpcUrls: vi.fn().mockReturnValue(["https://rpc.example.com"]),
}));

// Mock cli/shared
vi.mock("../../../cli/shared", () => ({
  parseCommonOptions: vi.fn().mockImplementation((opts) => ({
    privateKey: opts.privateKey || TEST_PRIVATE_KEY,
    chainId: opts.chainId || TEST_CHAIN_ID,
    rpcUrl: opts.rpcUrl,
  })),
}));

// Mock shared/output
vi.mock("../../../shared/output", () => ({
  exitWithError: vi.fn().mockImplementation((msg: string) => {
    throw new Error(msg);
  }),
}));

// Mock shared/encode
vi.mock("../../../shared/encode", () => ({
  encodeTransaction: vi.fn().mockReturnValue({
    to: "0xStorage",
    data: "0xencoded",
    chainId: TEST_CHAIN_ID,
    value: "0",
  }),
}));

// Mock console.log
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

// Import after mocks
import { executeProfileSetPicture } from "../../../commands/profile/set-picture";

describe("executeProfileSetPicture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContract.mockResolvedValue("0xtxhash");
    mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  describe("validation", () => {
    it("should reject invalid URL", async () => {
      await expect(
        executeProfileSetPicture(createSetPictureOptions({ url: "not-a-url" }))
      ).rejects.toThrow("Invalid URL");
    });

    it("should accept valid HTTPS URL", async () => {
      await executeProfileSetPicture(
        createSetPictureOptions({ url: "https://example.com/image.jpg" })
      );

      expect(mockWriteContract).toHaveBeenCalled();
    });

    it("should accept valid HTTP URL", async () => {
      await executeProfileSetPicture(
        createSetPictureOptions({ url: "http://example.com/image.jpg" })
      );

      expect(mockWriteContract).toHaveBeenCalled();
    });
  });

  describe("encode-only mode", () => {
    it("should output encoded transaction JSON", async () => {
      await executeProfileSetPicture(
        createSetPictureOptions({ encodeOnly: true })
      );

      const jsonOutputCall = consoleSpy.mock.calls.find((call) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.to !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      expect(output.to).toBe("0xStorage");
      expect(output.data).toBe("0xencoded");
    });

    it("should NOT submit transaction in encode-only mode", async () => {
      await executeProfileSetPicture(
        createSetPictureOptions({ encodeOnly: true })
      );

      expect(mockWriteContract).not.toHaveBeenCalled();
    });
  });

  describe("transaction submission", () => {
    it("should display progress messages", async () => {
      await executeProfileSetPicture(createSetPictureOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Setting profile picture")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Waiting for confirmation")
      );
    });

    it("should display success message on completion", async () => {
      await executeProfileSetPicture(createSetPictureOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Profile picture updated successfully")
      );
    });

    it("should display transaction hash", async () => {
      mockWriteContract.mockResolvedValue("0xabcd1234");

      await executeProfileSetPicture(createSetPictureOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("0xabcd1234")
      );
    });

    it("should display URL in success message", async () => {
      await executeProfileSetPicture(
        createSetPictureOptions({ url: TEST_PROFILE_PICTURE })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(TEST_PROFILE_PICTURE)
      );
    });
  });

  describe("error handling", () => {
    it("should handle transaction failure", async () => {
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "reverted" });

      await expect(
        executeProfileSetPicture(createSetPictureOptions())
      ).rejects.toThrow("Transaction failed");
    });

    it("should handle write contract error", async () => {
      mockWriteContract.mockRejectedValue(new Error("Insufficient funds"));

      await expect(
        executeProfileSetPicture(createSetPictureOptions())
      ).rejects.toThrow("Failed to set profile picture");
    });
  });
});
