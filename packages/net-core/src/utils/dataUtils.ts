import { stringToHex } from "viem";

/**
 * Normalize data to hex bytes format
 * Handles both hex strings and plain strings
 */
export function normalizeData(data: string | `0x${string}`): `0x${string}` {
  if (typeof data === "string" && data.startsWith("0x")) {
    // Already hex, validate and return
    if (data.length % 2 !== 0) {
      throw new Error("Invalid hex string: odd length");
    }
    return data as `0x${string}`;
  }
  // Convert plain string to hex
  return stringToHex(data);
}

/**
 * Normalize data, allowing empty string to become empty bytes
 */
export function normalizeDataOrEmpty(data?: string | `0x${string}`): `0x${string}` {
  if (!data) {
    return "0x";
  }
  return normalizeData(data);
}

