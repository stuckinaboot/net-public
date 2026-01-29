import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TEST_CHAIN_ID,
  TEST_PRIVATE_KEY,
  TEST_X_USERNAME,
  createSetUsernameOptions,
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
import { executeProfileSetUsername } from "../../../commands/profile/set-username";

describe("executeProfileSetUsername", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContract.mockResolvedValue("0xtxhash");
    mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  describe("validation", () => {
    it("should reject invalid username with spaces", async () => {
      await expect(
        executeProfileSetUsername(
          createSetUsernameOptions({ username: "test user" })
        )
      ).rejects.toThrow("Invalid X username");
    });

    it("should reject username too long", async () => {
      await expect(
        executeProfileSetUsername(
          createSetUsernameOptions({ username: "a".repeat(16) })
        )
      ).rejects.toThrow("Invalid X username");
    });

    it("should reject username with invalid characters", async () => {
      await expect(
        executeProfileSetUsername(
          createSetUsernameOptions({ username: "test-user" })
        )
      ).rejects.toThrow("Invalid X username");
    });

    it("should accept valid username without @", async () => {
      await executeProfileSetUsername(
        createSetUsernameOptions({ username: "testuser" })
      );

      expect(mockWriteContract).toHaveBeenCalled();
    });

    it("should accept valid username with @", async () => {
      await executeProfileSetUsername(
        createSetUsernameOptions({ username: "@testuser" })
      );

      expect(mockWriteContract).toHaveBeenCalled();
    });

    it("should accept username with underscores", async () => {
      await executeProfileSetUsername(
        createSetUsernameOptions({ username: "test_user_123" })
      );

      expect(mockWriteContract).toHaveBeenCalled();
    });
  });

  describe("encode-only mode", () => {
    it("should output encoded transaction JSON", async () => {
      await executeProfileSetUsername(
        createSetUsernameOptions({ encodeOnly: true })
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
      await executeProfileSetUsername(
        createSetUsernameOptions({ encodeOnly: true })
      );

      expect(mockWriteContract).not.toHaveBeenCalled();
    });
  });

  describe("transaction submission", () => {
    it("should display progress messages", async () => {
      await executeProfileSetUsername(createSetUsernameOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Setting X username")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Waiting for confirmation")
      );
    });

    it("should display success message on completion", async () => {
      await executeProfileSetUsername(createSetUsernameOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("X username updated successfully")
      );
    });

    it("should display username with @ in success message", async () => {
      await executeProfileSetUsername(
        createSetUsernameOptions({ username: TEST_X_USERNAME })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`@${TEST_X_USERNAME}`)
      );
    });

    it("should handle username already with @", async () => {
      await executeProfileSetUsername(
        createSetUsernameOptions({ username: "@testuser" })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("@testuser")
      );
    });
  });

  describe("error handling", () => {
    it("should handle transaction failure", async () => {
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "reverted" });

      await expect(
        executeProfileSetUsername(createSetUsernameOptions())
      ).rejects.toThrow("Transaction failed");
    });

    it("should handle write contract error", async () => {
      mockWriteContract.mockRejectedValue(new Error("Insufficient funds"));

      await expect(
        executeProfileSetUsername(createSetUsernameOptions())
      ).rejects.toThrow("Failed to set X username");
    });
  });
});
