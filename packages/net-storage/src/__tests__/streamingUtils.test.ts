import { describe, it, expect, beforeEach } from "vitest";
import {
  processFileStreaming,
  processFileStreamingComplete,
  isBinaryFile,
  readFileSlice,
  estimateChunkCount,
} from "../utils/streamingUtils";

// Mock File class for Node.js environment
class MockFile extends Blob {
  name: string;
  lastModified: number;

  constructor(
    chunks: BlobPart[],
    name: string,
    options?: FilePropertyBag
  ) {
    super(chunks, options);
    this.name = name;
    this.lastModified = Date.now();
  }
}

// Setup File mock before tests
beforeEach(() => {
  if (typeof globalThis.File === "undefined") {
    (globalThis as any).File = MockFile as any;
  }
});

describe("streamingUtils", () => {
  describe("isBinaryFile", () => {
    it("should detect text files as non-binary", () => {
      const textFile = new MockFile(["hello world"], "test.txt", {
        type: "text/plain",
      }) as File;
      expect(isBinaryFile(textFile)).toBe(false);
    });

    it("should detect JSON files as non-binary", () => {
      const jsonFile = new MockFile(['{"key": "value"}'], "test.json", {
        type: "application/json",
      }) as File;
      expect(isBinaryFile(jsonFile)).toBe(false);
    });

    it("should detect HTML files as non-binary", () => {
      const htmlFile = new MockFile(["<html><body>Test</body></html>"], "test.html", {
        type: "text/html",
      }) as File;
      expect(isBinaryFile(htmlFile)).toBe(false);
    });

    it("should detect PDF files as binary", () => {
      const pdfFile = new MockFile(["%PDF-1.4"], "test.pdf", {
        type: "application/pdf",
      }) as File;
      expect(isBinaryFile(pdfFile)).toBe(true);
    });

    it("should detect image files as binary", () => {
      const pngFile = new MockFile([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "test.png", {
        type: "image/png",
      }) as File;
      expect(isBinaryFile(pngFile)).toBe(true);
    });

    it("should use extension for files without MIME type", () => {
      const textFile = new MockFile(["hello"], "test.txt", {
        type: "",
      }) as File;
      expect(isBinaryFile(textFile)).toBe(false);
    });

    it("should treat unknown extensions as binary", () => {
      const unknownFile = new MockFile(["data"], "test.xyz", {
        type: "",
      }) as File;
      expect(isBinaryFile(unknownFile)).toBe(true);
    });
  });

  describe("estimateChunkCount", () => {
    it("should return 1 for small files", () => {
      expect(estimateChunkCount(1000)).toBe(1);
    });

    it("should return 1 for empty files", () => {
      expect(estimateChunkCount(0)).toBe(1);
    });

    it("should calculate correct count for binary files", () => {
      // Binary files use 79,998 bytes per chunk (divisible by 3 for base64)
      expect(estimateChunkCount(79998, true)).toBe(1);
      expect(estimateChunkCount(79999, true)).toBe(2);
      expect(estimateChunkCount(159996, true)).toBe(2);
      expect(estimateChunkCount(159997, true)).toBe(3);
    });

    it("should calculate correct count for text files", () => {
      // Text files use 80,000 bytes per chunk
      expect(estimateChunkCount(80000, false)).toBe(1);
      expect(estimateChunkCount(80001, false)).toBe(2);
      expect(estimateChunkCount(160000, false)).toBe(2);
      expect(estimateChunkCount(160001, false)).toBe(3);
    });

    it("should handle very large binary files", () => {
      // 100MB file with binary chunk size (79998)
      const hundredMB = 100 * 1000 * 1000;
      expect(estimateChunkCount(hundredMB, true)).toBe(Math.ceil(hundredMB / 79998));
    });

    it("should handle very large text files", () => {
      // 100MB file with text chunk size (80000)
      const hundredMB = 100 * 1000 * 1000;
      expect(estimateChunkCount(hundredMB, false)).toBe(1250);
    });
  });

  describe("readFileSlice", () => {
    it("should read text file slice as text", async () => {
      const content = "hello world";
      const file = new MockFile([content], "test.txt", {
        type: "text/plain",
      }) as File;

      const slice = await readFileSlice(file, 0, 5, false, false);
      expect(slice).toBe("hello");
    });

    it("should read entire text file", async () => {
      const content = "hello world";
      const file = new MockFile([content], "test.txt", {
        type: "text/plain",
      }) as File;

      const slice = await readFileSlice(file, 0, 100, false, false);
      expect(slice).toBe("hello world");
    });

    it("should read binary file slice as base64", async () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" in ASCII
      const file = new MockFile([bytes], "test.bin", {
        type: "application/octet-stream",
      }) as File;

      const slice = await readFileSlice(file, 0, 5, true, false);
      // Base64 of "Hello"
      expect(slice).toBe(btoa("Hello"));
    });

    it("should add data URI prefix for first binary chunk", async () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" in ASCII
      const file = new MockFile([bytes], "test.bin", {
        type: "application/octet-stream",
      }) as File;

      const slice = await readFileSlice(file, 0, 5, true, true);
      expect(slice).toContain("data:");
      expect(slice).toContain("base64,");
    });
  });

  describe("processFileStreaming", () => {
    it("should process small text file in one chunk", async () => {
      const content = "hello world";
      const file = new MockFile([content], "test.txt", {
        type: "text/plain",
      }) as File;

      const results: Array<{ chunkIndex: number; hash: string; compressedChunks: string[] }> = [];
      for await (const result of processFileStreaming(file)) {
        results.push(result);
      }

      expect(results.length).toBe(1);
      expect(results[0].chunkIndex).toBe(0);
      expect(results[0].hash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(results[0].compressedChunks.length).toBeGreaterThan(0);
    });

    it("should process large text file in multiple chunks", async () => {
      // Create a file larger than 80KB (chunk size)
      const content = "a".repeat(200 * 1000); // 200KB
      const file = new MockFile([content], "test.txt", {
        type: "text/plain",
      }) as File;

      const results: Array<{ chunkIndex: number; hash: string }> = [];
      for await (const result of processFileStreaming(file)) {
        results.push({ chunkIndex: result.chunkIndex, hash: result.hash });
      }

      expect(results.length).toBe(3); // 200KB / 80KB = 3 chunks (rounded up)
      expect(results[0].chunkIndex).toBe(0);
      expect(results[1].chunkIndex).toBe(1);
      expect(results[2].chunkIndex).toBe(2);
    });

    it("should produce consistent hashes for same content", async () => {
      const content = "consistent content";
      const file1 = new MockFile([content], "test1.txt", {
        type: "text/plain",
      }) as File;
      const file2 = new MockFile([content], "test2.txt", {
        type: "text/plain",
      }) as File;

      const results1: string[] = [];
      const results2: string[] = [];

      for await (const result of processFileStreaming(file1)) {
        results1.push(result.hash);
      }
      for await (const result of processFileStreaming(file2)) {
        results2.push(result.hash);
      }

      expect(results1).toEqual(results2);
    });

    it("should produce different hashes for different content", async () => {
      const file1 = new MockFile(["content 1"], "test1.txt", {
        type: "text/plain",
      }) as File;
      const file2 = new MockFile(["content 2"], "test2.txt", {
        type: "text/plain",
      }) as File;

      const results1: string[] = [];
      const results2: string[] = [];

      for await (const result of processFileStreaming(file1)) {
        results1.push(result.hash);
      }
      for await (const result of processFileStreaming(file2)) {
        results2.push(result.hash);
      }

      expect(results1[0]).not.toEqual(results2[0]);
    });

    it("should handle empty file", async () => {
      const file = new MockFile([], "empty.txt", {
        type: "text/plain",
      }) as File;

      const results: Array<{ chunkIndex: number; hash: string }> = [];
      for await (const result of processFileStreaming(file)) {
        results.push({ chunkIndex: result.chunkIndex, hash: result.hash });
      }

      // Empty file should still produce one chunk
      expect(results.length).toBe(1);
      expect(results[0].chunkIndex).toBe(0);
    });
  });

  describe("processFileStreamingComplete", () => {
    it("should return all hashes and compressed chunks", async () => {
      const content = "test content for complete processing";
      const file = new MockFile([content], "test.txt", {
        type: "text/plain",
      }) as File;

      const result = await processFileStreamingComplete(file);

      expect(result.hashes.length).toBe(1);
      expect(result.allCompressedChunks.length).toBe(1);
      expect(result.totalChunks).toBe(1);
      expect(result.isBinary).toBe(false);
    });

    it("should call progress callback", async () => {
      const content = "a".repeat(200 * 1000); // 200KB
      const file = new MockFile([content], "test.txt", {
        type: "text/plain",
      }) as File;

      const progressCalls: Array<[number, number]> = [];
      await processFileStreamingComplete(file, (current, total) => {
        progressCalls.push([current, total]);
      });

      expect(progressCalls.length).toBe(3); // 3 chunks
      expect(progressCalls[0]).toEqual([1, 3]);
      expect(progressCalls[1]).toEqual([2, 3]);
      expect(progressCalls[2]).toEqual([3, 3]);
    });

    it("should detect binary files correctly", async () => {
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
      const file = new MockFile([bytes], "test.png", {
        type: "image/png",
      }) as File;

      const result = await processFileStreamingComplete(file);
      expect(result.isBinary).toBe(true);
    });
  });
});

