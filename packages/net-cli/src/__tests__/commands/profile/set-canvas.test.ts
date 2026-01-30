import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  TEST_CHAIN_ID,
  TEST_PRIVATE_KEY,
  TEST_CANVAS_CONTENT,
  createSetCanvasOptions,
} from "./test-utils";

// Define mock functions at module level
const mockWriteContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();

// Mock viem
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
vi.mock("@net-protocol/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@net-protocol/core")>();
  return {
    ...actual,
    getChainRpcUrls: vi.fn().mockReturnValue(["https://rpc.example.com"]),
  };
});

// Mock @net-protocol/storage
vi.mock("@net-protocol/storage", () => ({
  CHUNKED_STORAGE_CONTRACT: {
    address: "0xChunkedStorage",
    abi: [],
  },
  chunkDataForStorage: vi.fn().mockReturnValue(["0xchunk1", "0xchunk2"]),
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

// Mock shared/output
vi.mock("../../../shared/output", () => ({
  exitWithError: vi.fn().mockImplementation((msg: string) => {
    throw new Error(msg);
  }),
}));

// Mock shared/encode
vi.mock("../../../shared/encode", () => ({
  encodeTransaction: vi.fn().mockReturnValue({
    to: "0xChunkedStorage",
    data: "0xencoded",
    chainId: TEST_CHAIN_ID,
    value: "0",
  }),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Mock console.log
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

// Import after mocks
import { executeProfileSetCanvas } from "../../../commands/profile/set-canvas";

describe("executeProfileSetCanvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContract.mockResolvedValue("0xtxhash");
    mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  describe("validation", () => {
    it("should reject when neither --file nor --content is provided", async () => {
      await expect(
        executeProfileSetCanvas({ chainId: TEST_CHAIN_ID })
      ).rejects.toThrow("Must provide either --file or --content");
    });

    it("should reject when both --file and --content are provided", async () => {
      await expect(
        executeProfileSetCanvas(
          createSetCanvasOptions({
            file: "/path/to/file.html",
            content: "<html></html>",
          })
        )
      ).rejects.toThrow("Cannot provide both --file and --content");
    });

    it("should reject when file is not found", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(
        executeProfileSetCanvas(
          createSetCanvasOptions({ file: "/nonexistent.html", content: undefined })
        )
      ).rejects.toThrow("File not found");
    });

    it("should reject file larger than 60KB", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      // Create a buffer larger than 60KB
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.alloc(61 * 1024));

      await expect(
        executeProfileSetCanvas(
          createSetCanvasOptions({ file: "/large.html", content: undefined })
        )
      ).rejects.toThrow("File too large");
    });

    it("should reject content larger than 60KB", async () => {
      const largeContent = "a".repeat(61 * 1024);

      await expect(
        executeProfileSetCanvas(
          createSetCanvasOptions({ content: largeContent })
        )
      ).rejects.toThrow("Content too large");
    });

    it("should accept content within size limit", async () => {
      await executeProfileSetCanvas(createSetCanvasOptions());

      expect(mockWriteContract).toHaveBeenCalled();
    });

    it("should accept file within size limit", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        Buffer.from(TEST_CANVAS_CONTENT)
      );

      await executeProfileSetCanvas(
        createSetCanvasOptions({ file: "/valid.html", content: undefined })
      );

      expect(mockWriteContract).toHaveBeenCalled();
    });
  });

  describe("encode-only mode", () => {
    it("should output encoded transaction JSON", async () => {
      await executeProfileSetCanvas(createSetCanvasOptions({ encodeOnly: true }));

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
      expect(output.to).toBe("0xChunkedStorage");
      expect(output.data).toBe("0xencoded");
    });

    it("should NOT submit transaction in encode-only mode", async () => {
      await executeProfileSetCanvas(createSetCanvasOptions({ encodeOnly: true }));

      expect(mockWriteContract).not.toHaveBeenCalled();
    });
  });

  describe("binary file handling", () => {
    it("should convert binary file to data URI", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      // PNG magic bytes with null byte to indicate binary
      const binaryBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      ]);
      vi.mocked(fs.readFileSync).mockReturnValue(binaryBuffer);

      await executeProfileSetCanvas(
        createSetCanvasOptions({ file: "/image.png", content: undefined })
      );

      expect(mockWriteContract).toHaveBeenCalled();
    });
  });

  describe("transaction submission", () => {
    it("should display progress messages", async () => {
      await executeProfileSetCanvas(createSetCanvasOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Setting profile canvas")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Waiting for confirmation")
      );
    });

    it("should display success message on completion", async () => {
      await executeProfileSetCanvas(createSetCanvasOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Canvas updated successfully")
      );
    });

    it("should display content size in output", async () => {
      await executeProfileSetCanvas(createSetCanvasOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("bytes")
      );
    });
  });

  describe("error handling", () => {
    it("should handle transaction failure", async () => {
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "reverted" });

      await expect(
        executeProfileSetCanvas(createSetCanvasOptions())
      ).rejects.toThrow("Transaction failed");
    });

    it("should handle write contract error", async () => {
      mockWriteContract.mockRejectedValue(new Error("Insufficient funds"));

      await expect(
        executeProfileSetCanvas(createSetCanvasOptions())
      ).rejects.toThrow("Failed to set canvas");
    });
  });
});
