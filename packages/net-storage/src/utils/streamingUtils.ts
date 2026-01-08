/**
 * Streaming utilities for processing large files without loading them entirely into memory.
 * Uses file.slice() to read in chunks, keeping memory usage low.
 */

import { keccak256HashString } from "@net-protocol/core";
import { chunkDataForStorage } from "./chunkUtils";
import { detectFileTypeFromBase64 } from "./fileUtils";

// 80KB chunks for XML storage (matches OPTIMAL_CHUNK_SIZE in writingUtils.ts)
const STREAMING_CHUNK_SIZE = 80 * 1000;

// For binary files, we need chunks divisible by 3 to avoid base64 padding in the middle
// 79,998 = 26,666 × 3 (closest to 80KB that's divisible by 3)
const BINARY_CHUNK_SIZE = 79998;

/**
 * Result from processing a single file chunk
 */
export interface StreamingChunkResult {
  /** Index of this chunk (0-based) */
  chunkIndex: number;
  /** Keccak256 hash of the chunk content (66 chars) */
  hash: string;
  /** Compressed chunks ready for ChunkedStorage (array of hex strings) */
  compressedChunks: string[];
}

/**
 * Result from processing an entire file via streaming
 */
export interface StreamingProcessResult {
  /** All chunk hashes in order */
  hashes: string[];
  /** All compressed chunk arrays in order */
  allCompressedChunks: string[][];
  /** Total number of chunks */
  totalChunks: number;
  /** Whether the file was treated as binary */
  isBinary: boolean;
}

/**
 * Detects if a file should be treated as binary based on its MIME type.
 * Binary files will be base64 encoded; text files will be read as text.
 *
 * @param file - The file to check
 * @returns true if the file should be treated as binary
 */
export function isBinaryFile(file: File): boolean {
  const mimeType = file.type.toLowerCase();

  // Text types that should be read as text
  const textTypes = [
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/typescript",
    "application/x-javascript",
    "application/ecmascript",
  ];

  // Check if it's a known text type
  for (const textType of textTypes) {
    if (mimeType.startsWith(textType)) {
      return false;
    }
  }

  // If no MIME type, check file extension
  if (!mimeType || mimeType === "application/octet-stream") {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const textExtensions = [
      "txt",
      "md",
      "json",
      "xml",
      "html",
      "htm",
      "css",
      "js",
      "ts",
      "jsx",
      "tsx",
      "yaml",
      "yml",
      "toml",
      "ini",
      "cfg",
      "conf",
      "log",
      "csv",
      "svg",
    ];
    return !textExtensions.includes(extension);
  }

  // Default to binary for unknown types
  return true;
}

/**
 * Reads a slice of a file as a string.
 * For binary files, returns base64-encoded data.
 * For text files, returns the raw text.
 *
 * @param file - The file to read from
 * @param offset - Start byte offset
 * @param size - Number of bytes to read
 * @param isBinary - Whether to read as binary (base64) or text
 * @param isFirstChunk - Whether this is the first chunk (for data URI prefix)
 * @returns The chunk as a string
 */
export async function readFileSlice(
  file: File,
  offset: number,
  size: number,
  isBinary: boolean,
  isFirstChunk: boolean
): Promise<string> {
  const blob = file.slice(offset, offset + size);

  if (isBinary) {
    // Binary: convert to base64
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Convert to base64 in chunks to avoid stack overflow for large slices
    // IMPORTANT: chunkSize must be divisible by 3 to avoid base64 padding in the middle
    // when concatenating multiple btoa() results. 32766 / 3 = 10922 (exact)
    let base64 = "";
    const chunkSize = 32766;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      base64 += btoa(String.fromCharCode(...chunk));
    }

    // Add data URI prefix for first chunk only
    if (isFirstChunk) {
      const mimeType =
        detectFileTypeFromBase64(base64) ||
        file.type ||
        "application/octet-stream";
      return `data:${mimeType};base64,${base64}`;
    }

    return base64;
  } else {
    // Text: read as text
    return await blob.text();
  }
}

/**
 * Async generator that processes a file in streaming chunks.
 * Reads the file in 80KB slices, hashes and compresses each,
 * yielding results one at a time to keep memory usage low.
 *
 * @param file - The file to process
 * @param chunkSize - Size of each chunk in bytes (default: 80KB)
 * @yields StreamingChunkResult for each chunk processed
 *
 * @example
 * ```typescript
 * const hashes: string[] = [];
 * const transactions: TransactionConfig[] = [];
 *
 * for await (const result of processFileStreaming(file)) {
 *   hashes.push(result.hash);
 *   transactions.push(createTransaction(result.compressedChunks));
 * }
 *
 * const metadata = generateXmlMetadata(hashes, 0, operatorAddress);
 * ```
 */
export async function* processFileStreaming(
  file: File,
  chunkSize: number = STREAMING_CHUNK_SIZE
): AsyncGenerator<StreamingChunkResult> {
  const binary = isBinaryFile(file);

  // For binary files, use chunk size divisible by 3 to avoid base64 padding issues
  // When base64 encoding chunks separately, each chunk must be divisible by 3 bytes
  // to avoid padding (=) in the middle of the concatenated result
  const effectiveChunkSize = binary ? BINARY_CHUNK_SIZE : chunkSize;

  let offset = 0;
  let chunkIndex = 0;

  while (offset < file.size) {
    // Read slice from file
    const chunkString = await readFileSlice(
      file,
      offset,
      effectiveChunkSize,
      binary,
      chunkIndex === 0
    );

    // Hash the chunk content (small: 66 chars)
    const hash = keccak256HashString(chunkString);

    // Compress into 20KB ChunkedStorage chunks
    const compressedChunks = chunkDataForStorage(chunkString);

    yield {
      chunkIndex,
      hash,
      compressedChunks,
    };

    offset += effectiveChunkSize;
    chunkIndex++;
  }

  // Handle empty file case
  if (chunkIndex === 0) {
    const emptyString = binary
      ? `data:${file.type || "application/octet-stream"};base64,`
      : "";
    const hash = keccak256HashString(emptyString);
    const compressedChunks = chunkDataForStorage(emptyString);

    yield {
      chunkIndex: 0,
      hash,
      compressedChunks,
    };
  }
}

/**
 * Processes an entire file via streaming and returns all results.
 * This is a convenience function that collects all generator results.
 *
 * For very large files, prefer using processFileStreaming directly
 * to process chunks as they're generated.
 *
 * @param file - The file to process
 * @param onProgress - Optional callback for progress updates
 * @returns All hashes and compressed chunks
 */
export async function processFileStreamingComplete(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<StreamingProcessResult> {
  const totalChunks = Math.max(1, Math.ceil(file.size / STREAMING_CHUNK_SIZE));
  const hashes: string[] = [];
  const allCompressedChunks: string[][] = [];
  const binary = isBinaryFile(file);

  let processed = 0;
  for await (const result of processFileStreaming(file)) {
    hashes.push(result.hash);
    allCompressedChunks.push(result.compressedChunks);
    processed++;
    onProgress?.(processed, totalChunks);
  }

  return {
    hashes,
    allCompressedChunks,
    totalChunks: hashes.length,
    isBinary: binary,
  };
}

/**
 * Estimates the number of chunks for a file without reading it.
 *
 * @param fileSize - Size of the file in bytes
 * @param isBinary - Whether the file is binary (uses smaller chunk size for base64 alignment)
 * @returns Estimated number of chunks
 */
export function estimateChunkCount(
  fileSize: number,
  isBinary: boolean = true
): number {
  // For binary files, use BINARY_CHUNK_SIZE (divisible by 3 for base64)
  // For text files, use STREAMING_CHUNK_SIZE
  const chunkSize = isBinary ? BINARY_CHUNK_SIZE : STREAMING_CHUNK_SIZE;
  return Math.max(1, Math.ceil(fileSize / chunkSize));
}
