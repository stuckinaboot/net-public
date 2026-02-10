import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TEST_CHAIN_ID,
  TEST_PRIVATE_KEY,
  TEST_BIO,
  createSetBioOptions,
} from "./test-utils";

// Define mock functions at module level
const mockWriteContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();

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

// Mock @net-protocol/core - preserve actual exports for toBytes32, etc.
vi.mock("@net-protocol/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@net-protocol/core")>();
  return {
    ...actual,
    getChainRpcUrls: vi.fn().mockReturnValue(["https://rpc.example.com"]),
  };
});

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

// Mock @net-protocol/storage (StorageClient used for read-then-write)
vi.mock("@net-protocol/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@net-protocol/storage")>();
  return {
    ...actual,
    StorageClient: vi.fn().mockImplementation(() => ({
      readStorageData: vi.fn().mockResolvedValue({ data: null }),
    })),
  };
});

// Mock profile utils (readExistingMetadata)
vi.mock("../../../commands/profile/utils", () => ({
  readExistingMetadata: vi.fn().mockResolvedValue({}),
}));

// Mock console.log
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

// Import after mocks
import { executeProfileSetBio } from "../../../commands/profile/set-bio";

describe("executeProfileSetBio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContract.mockResolvedValue("0xtxhash");
    mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  describe("validation", () => {
    it("should reject empty bio", async () => {
      await expect(
        executeProfileSetBio(createSetBioOptions({ bio: "" }))
      ).rejects.toThrow("Invalid bio");
    });

    it("should reject bio over 280 characters", async () => {
      await expect(
        executeProfileSetBio(createSetBioOptions({ bio: "a".repeat(281) }))
      ).rejects.toThrow("Invalid bio");
    });

    it("should reject bio with control characters", async () => {
      await expect(
        executeProfileSetBio(createSetBioOptions({ bio: "Hello\x00World" }))
      ).rejects.toThrow("Invalid bio");
    });

    it("should accept valid bio", async () => {
      await executeProfileSetBio(createSetBioOptions({ bio: "Hello world!" }));

      expect(mockWriteContract).toHaveBeenCalled();
    });

    it("should accept bio with newlines", async () => {
      await executeProfileSetBio(
        createSetBioOptions({ bio: "Line 1\nLine 2" })
      );

      expect(mockWriteContract).toHaveBeenCalled();
    });

    it("should accept bio at max length", async () => {
      await executeProfileSetBio(
        createSetBioOptions({ bio: "a".repeat(280) })
      );

      expect(mockWriteContract).toHaveBeenCalled();
    });

    it("should accept bio with emojis", async () => {
      await executeProfileSetBio(
        createSetBioOptions({ bio: "Hello 👋 World 🌍" })
      );

      expect(mockWriteContract).toHaveBeenCalled();
    });
  });

  describe("encode-only mode", () => {
    it("should output encoded transaction JSON", async () => {
      await executeProfileSetBio(createSetBioOptions({ encodeOnly: true }));

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
      await executeProfileSetBio(createSetBioOptions({ encodeOnly: true }));

      expect(mockWriteContract).not.toHaveBeenCalled();
    });
  });

  describe("transaction submission", () => {
    it("should display progress messages", async () => {
      await executeProfileSetBio(createSetBioOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Setting profile bio")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Waiting for confirmation")
      );
    });

    it("should display success message on completion", async () => {
      await executeProfileSetBio(createSetBioOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Bio updated successfully")
      );
    });

    it("should display bio in success message", async () => {
      await executeProfileSetBio(createSetBioOptions({ bio: TEST_BIO }));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(TEST_BIO)
      );
    });
  });

  describe("error handling", () => {
    it("should handle transaction failure", async () => {
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "reverted" });

      await expect(
        executeProfileSetBio(createSetBioOptions())
      ).rejects.toThrow("Transaction failed");
    });

    it("should handle write contract error", async () => {
      mockWriteContract.mockRejectedValue(new Error("Insufficient funds"));

      await expect(
        executeProfileSetBio(createSetBioOptions())
      ).rejects.toThrow("Failed to set bio");
    });
  });
});
