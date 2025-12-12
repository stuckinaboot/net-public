import { stringToHex, hexToBytes, hexToString } from "viem";
import pako from "pako";
import { containsXmlReferences } from "./xmlUtils";

const CHUNK_SIZE = 20 * 1000; // 20KB to match contract

/**
 * Chunks data for storage in ChunkedStorage contract
 * First compresses the data using gzip, then chunks the compressed data
 * @param data - The string data to chunk
 * @returns Array of hex-encoded byte chunks of compressed data
 */
export function chunkDataForStorage(data: string): string[] {
  try {
    // Convert to hex first, then compress
    const dataHex = stringToHex(data);
    const compressedBytes = pako.gzip(dataHex);

    // Convert compressed bytes to hex
    const dataBytes = "0x" + Buffer.from(compressedBytes).toString("hex");
    const chunks: string[] = [];

    // Remove '0x' prefix for processing
    const hexWithoutPrefix = dataBytes.slice(2);

    // Chunk the hex data (each byte = 2 hex chars)
    for (let i = 0; i < hexWithoutPrefix.length; i += CHUNK_SIZE * 2) {
      const chunk = hexWithoutPrefix.slice(i, i + CHUNK_SIZE * 2);
      chunks.push("0x" + chunk);
    }

    // Handle empty data case
    if (chunks.length === 0) {
      chunks.push("0x");
    }

    return chunks;
  } catch (error) {
    console.error("[chunkDataForStorage] Compression failed:", error);
    throw new Error("Failed to compress data for storage");
  }
}

/**
 * Determines if XML storage should be suggested for the given data
 * @param data - The string data to check
 * @returns True if XML storage should be suggested
 */
export function shouldSuggestXmlStorage(data: string): boolean {
  return data.length > CHUNK_SIZE || containsXmlReferences(data);
}

/**
 * Gets the estimated number of chunks for given data
 * @param data - The string data
 * @returns Number of chunks that would be created
 */
export function getChunkCount(data: string): number {
  const dataBytes = stringToHex(data);
  const hexWithoutPrefix = dataBytes.slice(2);
  return Math.max(1, Math.ceil(hexWithoutPrefix.length / (CHUNK_SIZE * 2)));
}

/**
 * Assemble chunks into a single string and decompress
 * Pure function - can be used in both client and server code
 * @param chunks - Array of hex-encoded chunk strings
 * @returns Decompressed string or undefined if decompression fails
 */
export function assembleChunks(chunks: string[]): string | undefined {
  try {
    // Concatenate hex strings, keeping only first 0x prefix
    let assembled = chunks[0] || "0x";
    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk && chunk !== "0x") {
        assembled += chunk.slice(2); // Remove '0x' prefix from subsequent chunks
      }
    }

    // Convert hex to bytes
    const bytes = hexToBytes(assembled as `0x${string}`);

    try {
      // Try to decompress
      const decompressed = pako.ungzip(bytes);

      // Decompressed bytes are UTF-8 bytes of the hex string (because chunkDataForStorage compressed the hex string)
      // Convert bytes to UTF-8 string (which is the hex string)
      const hexString = Buffer.from(decompressed).toString("utf8");
      // Convert hex string to plain string
      const result = hexToString(hexString as `0x${string}`);
      return result;
    } catch (error) {
      // If decompression fails, assume it's uncompressed data
      return undefined;
    }
  } catch (error) {
    console.error("[assembleChunks] Failed to assemble chunks:", error);
    throw new Error("Failed to decompress chunked data");
  }
}

