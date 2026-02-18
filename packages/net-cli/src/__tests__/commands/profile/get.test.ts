import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TEST_CHAIN_ID,
  TEST_ADDRESS,
  TEST_PROFILE_PICTURE,
  TEST_X_USERNAME,
  TEST_BIO,
  TEST_CANVAS_CONTENT,
  createGetOptions,
  createMockProfilePictureData,
  createMockProfileMetadataData,
  createMockCanvasData,
} from "./test-utils";

// Mock StorageClient
const mockReadStorageData = vi.fn();
const mockReadChunkedStorage = vi.fn();

vi.mock("@net-protocol/storage", () => ({
  StorageClient: vi.fn().mockImplementation(() => ({
    readStorageData: mockReadStorageData,
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

// Mock console.log
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

// Import after mocks
import { executeProfileGet } from "../../../commands/profile/get";

describe("executeProfileGet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no canvas, no CSS
    mockReadChunkedStorage.mockRejectedValue(
      new Error("ChunkedStorage metadata not found")
    );
    // Default fallback: CSS readStorageData returns not found
    // (specific tests override with mockResolvedValueOnce for picture/metadata)
    mockReadStorageData.mockRejectedValue(
      new Error("StoredDataNotFound")
    );
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  describe("human-readable output", () => {
    it("should display profile with picture and username", async () => {
      mockReadStorageData
        .mockResolvedValueOnce(createMockProfilePictureData())
        .mockResolvedValueOnce(createMockProfileMetadataData());

      await executeProfileGet(createGetOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Profile:")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Address:")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Profile Picture:")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("X Username:")
      );
    });

    it("should display profile picture URL", async () => {
      mockReadStorageData
        .mockResolvedValueOnce(createMockProfilePictureData(TEST_PROFILE_PICTURE))
        .mockResolvedValueOnce(createMockProfileMetadataData());

      await executeProfileGet(createGetOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(TEST_PROFILE_PICTURE)
      );
    });

    it("should display X username with @ prefix", async () => {
      mockReadStorageData
        .mockResolvedValueOnce(createMockProfilePictureData())
        .mockResolvedValueOnce(createMockProfileMetadataData(TEST_X_USERNAME));

      await executeProfileGet(createGetOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`@${TEST_X_USERNAME}`)
      );
    });

    it("should display bio", async () => {
      mockReadStorageData
        .mockResolvedValueOnce(createMockProfilePictureData())
        .mockResolvedValueOnce(createMockProfileMetadataData(TEST_X_USERNAME, TEST_BIO));

      await executeProfileGet(createGetOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Bio:")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(TEST_BIO)
      );
    });

    it("should display (not set) when no profile picture", async () => {
      // First call throws not found, second returns metadata
      mockReadStorageData
        .mockRejectedValueOnce(new Error("StoredDataNotFound"))
        .mockResolvedValueOnce(createMockProfileMetadataData());

      await executeProfileGet(createGetOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("(not set)")
      );
    });

    it("should display warning when no profile data found", async () => {
      mockReadStorageData.mockRejectedValue(new Error("StoredDataNotFound"));

      await executeProfileGet(createGetOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No profile data found")
      );
    });
  });

  describe("JSON output", () => {
    it("should output valid JSON", async () => {
      mockReadStorageData
        .mockResolvedValueOnce(createMockProfilePictureData())
        .mockResolvedValueOnce(createMockProfileMetadataData());

      await executeProfileGet(createGetOptions({ json: true }));

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
      mockReadStorageData
        .mockResolvedValueOnce(createMockProfilePictureData(TEST_PROFILE_PICTURE))
        .mockResolvedValueOnce(createMockProfileMetadataData(TEST_X_USERNAME, TEST_BIO));

      await executeProfileGet(createGetOptions({ json: true }));

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
      expect(output.profilePicture).toBe(TEST_PROFILE_PICTURE);
      expect(output.xUsername).toBe(TEST_X_USERNAME);
      expect(output.bio).toBe(TEST_BIO);
      expect(output.hasProfile).toBeTruthy();
    });

    it("should set hasProfile to false when no data", async () => {
      mockReadStorageData.mockRejectedValue(new Error("StoredDataNotFound"));

      await executeProfileGet(createGetOptions({ json: true }));

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
      expect(output.profilePicture).toBeNull();
      expect(output.xUsername).toBeNull();
      expect(output.bio).toBeNull();
      expect(output.hasProfile).toBeFalsy();
    });

    it("should include bio as null when not set", async () => {
      mockReadStorageData
        .mockResolvedValueOnce(createMockProfilePictureData(TEST_PROFILE_PICTURE))
        .mockResolvedValueOnce(createMockProfileMetadataData(TEST_X_USERNAME));

      await executeProfileGet(createGetOptions({ json: true }));

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
      expect(output.bio).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle non-StoredDataNotFound errors", async () => {
      mockReadStorageData.mockRejectedValue(new Error("Network error"));

      await expect(executeProfileGet(createGetOptions())).rejects.toThrow(
        "Failed to read profile"
      );
    });
  });

  describe("canvas display", () => {
    it("should display canvas summary when canvas exists", async () => {
      mockReadStorageData
        .mockResolvedValueOnce(createMockProfilePictureData())
        .mockResolvedValueOnce(createMockProfileMetadataData());
      mockReadChunkedStorage.mockResolvedValue(createMockCanvasData());

      await executeProfileGet(createGetOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Canvas:")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("bytes")
      );
    });

    it("should display (not set) when no canvas", async () => {
      mockReadStorageData
        .mockResolvedValueOnce(createMockProfilePictureData())
        .mockResolvedValueOnce(createMockProfileMetadataData());
      // Default mock already rejects with not found

      await executeProfileGet(createGetOptions());

      // Look for Canvas: followed by (not set)
      const canvasCall = consoleSpy.mock.calls.find(
        (call) =>
          call[0] &&
          typeof call[0] === "string" &&
          call[0].includes("Canvas:")
      );
      expect(canvasCall).toBeDefined();
      expect(canvasCall![0]).toContain("(not set)");
    });

    it("should include canvas in JSON output when canvas exists", async () => {
      mockReadStorageData
        .mockResolvedValueOnce(createMockProfilePictureData())
        .mockResolvedValueOnce(createMockProfileMetadataData());
      mockReadChunkedStorage.mockResolvedValue(createMockCanvasData());

      await executeProfileGet(createGetOptions({ json: true }));

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
      expect(output.canvas).toBeDefined();
      expect(output.canvas.size).toBe(TEST_CANVAS_CONTENT.length);
      expect(output.canvas.isDataUri).toBe(false);
    });

    it("should show canvas as null in JSON when no canvas", async () => {
      mockReadStorageData
        .mockResolvedValueOnce(createMockProfilePictureData())
        .mockResolvedValueOnce(createMockProfileMetadataData());
      // Default mock already rejects with not found

      await executeProfileGet(createGetOptions({ json: true }));

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
    });

    it("should show data URI indicator for binary canvas", async () => {
      mockReadStorageData
        .mockResolvedValueOnce(createMockProfilePictureData())
        .mockResolvedValueOnce(createMockProfileMetadataData());
      mockReadChunkedStorage.mockResolvedValue(
        createMockCanvasData("data:image/png;base64,abc123")
      );

      await executeProfileGet(createGetOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("(data URI)")
      );
    });
  });
});
