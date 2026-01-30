import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import {
  TEST_CHAIN_ID,
  TEST_ADDRESS,
  TEST_CANVAS_CONTENT,
  TEST_CANVAS_DATA_URI,
  createGetCanvasOptions,
  createMockCanvasData,
} from "./test-utils";

// Mock StorageClient
const mockReadChunkedStorage = vi.fn();

vi.mock("@net-protocol/storage", () => ({
  StorageClient: vi.fn().mockImplementation(() => ({
    readChunkedStorage: mockReadChunkedStorage,
  })),
}));

// Mock cli/shared
vi.mock("../../../cli/shared", () => ({
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

// Mock fs
vi.mock("fs", () => ({
  writeFileSync: vi.fn(),
}));

// Mock console.log
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

// Import after mocks
import { executeProfileGetCanvas } from "../../../commands/profile/get-canvas";

describe("executeProfileGetCanvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  describe("successful read", () => {
    it("should output canvas content to stdout", async () => {
      mockReadChunkedStorage.mockResolvedValue(createMockCanvasData());

      await executeProfileGetCanvas(createGetCanvasOptions());

      expect(consoleSpy).toHaveBeenCalledWith(TEST_CANVAS_CONTENT);
    });

    it("should write canvas content to file with --output", async () => {
      mockReadChunkedStorage.mockResolvedValue(createMockCanvasData());

      await executeProfileGetCanvas(
        createGetCanvasOptions({ output: "/output/canvas.html" })
      );

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("canvas.html"),
        TEST_CANVAS_CONTENT,
        "utf-8"
      );
    });
  });

  describe("binary content handling", () => {
    it("should write binary content to file from data URI", async () => {
      mockReadChunkedStorage.mockResolvedValue(
        createMockCanvasData(TEST_CANVAS_DATA_URI)
      );

      await executeProfileGetCanvas(
        createGetCanvasOptions({ output: "/output/canvas" })
      );

      // Should write as binary (Buffer)
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(".png"), // Should add extension based on mime type
        expect.any(Buffer)
      );
    });

    it("should output data URI to stdout when no output file", async () => {
      mockReadChunkedStorage.mockResolvedValue(
        createMockCanvasData(TEST_CANVAS_DATA_URI)
      );

      await executeProfileGetCanvas(createGetCanvasOptions());

      expect(consoleSpy).toHaveBeenCalledWith(TEST_CANVAS_DATA_URI);
    });
  });

  describe("no canvas exists", () => {
    it("should return error when no canvas found", async () => {
      mockReadChunkedStorage.mockRejectedValue(
        new Error("ChunkedStorage metadata not found")
      );

      await expect(
        executeProfileGetCanvas(createGetCanvasOptions())
      ).rejects.toThrow("No canvas found");
    });

    it("should return JSON with null canvas when no canvas exists in JSON mode", async () => {
      mockReadChunkedStorage.mockRejectedValue(
        new Error("ChunkedStorage metadata not found")
      );

      await executeProfileGetCanvas(createGetCanvasOptions({ json: true }));

      const jsonOutputCall = consoleSpy.mock.calls.find((call) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.address !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      expect(output.canvas).toBeNull();
      expect(output.hasCanvas).toBe(false);
    });
  });

  describe("JSON output", () => {
    it("should output valid JSON format", async () => {
      mockReadChunkedStorage.mockResolvedValue(createMockCanvasData());

      await executeProfileGetCanvas(createGetCanvasOptions({ json: true }));

      const jsonOutputCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
    });

    it("should include all fields in JSON output", async () => {
      mockReadChunkedStorage.mockResolvedValue(createMockCanvasData());

      await executeProfileGetCanvas(createGetCanvasOptions({ json: true }));

      const jsonOutputCall = consoleSpy.mock.calls.find((call) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.address !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      expect(output.address).toBe(TEST_ADDRESS);
      expect(output.chainId).toBe(TEST_CHAIN_ID);
      expect(output.canvas).toBe(TEST_CANVAS_CONTENT);
      expect(output.hasCanvas).toBe(true);
      expect(output.isDataUri).toBe(false);
      expect(output.contentLength).toBe(TEST_CANVAS_CONTENT.length);
    });

    it("should set isDataUri to true for data URI content", async () => {
      mockReadChunkedStorage.mockResolvedValue(
        createMockCanvasData(TEST_CANVAS_DATA_URI)
      );

      await executeProfileGetCanvas(createGetCanvasOptions({ json: true }));

      const jsonOutputCall = consoleSpy.mock.calls.find((call) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.address !== undefined;
        } catch {
          return false;
        }
      });

      expect(jsonOutputCall).toBeDefined();
      const output = JSON.parse(jsonOutputCall![0]);
      expect(output.isDataUri).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle non-not-found errors", async () => {
      mockReadChunkedStorage.mockRejectedValue(new Error("Network error"));

      await expect(
        executeProfileGetCanvas(createGetCanvasOptions())
      ).rejects.toThrow("Failed to read canvas");
    });
  });
});
