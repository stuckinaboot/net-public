import { fromHex, stringToHex } from "viem";
import { keccak256HashString, toBytes32 } from "@net-protocol/core";

/**
 * Convert a value string to hex format for storage
 */
export function getValueArgForStorage(value: string): string {
  return stringToHex(value);
}

/**
 * Get both key and value in bytes format for storage
 */
export function getBytesArgsForStorage(key: string, value: string) {
  const bytesKey = toBytes32(key);
  const bytesValue = getValueArgForStorage(value);
  return { bytesKey, bytesValue };
}

/**
 * Check if a string contains binary characters (non-ASCII)
 */
function isBinaryString(str: string): boolean {
  return str.split("").some((char) => char.charCodeAt(0) > 127);
}

/**
 * Format storage key for display, decoding hex to readable text when possible
 * Returns both the display text and whether it was successfully decoded
 */
export function formatStorageKeyForDisplay(storageKey: string): {
  displayText: string;
  isDecoded: boolean;
} {
  // Try to decode if it looks like a hex bytes32
  if (
    storageKey.startsWith("0x") &&
    storageKey.length === 66 &&
    /^0x[0-9a-fA-F]{64}$/.test(storageKey)
  ) {
    try {
      const decoded = fromHex(storageKey as `0x${string}`, "string");
      // Trim null bytes
      const trimmed = decoded.replace(/\0/g, "");
      // Check if it's readable ASCII text (not binary)
      if (!isBinaryString(trimmed) && trimmed.trim().length > 0) {
        return {
          displayText: trimmed,
          isDecoded: true,
        };
      }
    } catch {
      // Fall through to return original
    }
  }

  // Return original for non-hex or failed decode
  return {
    displayText: storageKey,
    isDecoded: false,
  };
}

/**
 * Get storage key as bytes32 format
 * Supports direct hex bytes32 input or converts string to bytes32
 * For strings longer than 32 bytes, hashes them
 *
 * @param input - The storage key (raw string or bytes32 hex)
 * @param keyFormat - Optional format override: "raw" to always convert, "bytes32" to use as-is, undefined for auto-detect
 */
export function getStorageKeyBytes(
  input: string,
  keyFormat?: "raw" | "bytes32"
): string {
  // Explicit format override: bytes32 - use as-is
  if (keyFormat === "bytes32") {
    return input.toLowerCase();
  }

  // Explicit format override: raw - always convert
  if (keyFormat === "raw") {
    return input.length > 32
      ? keccak256HashString(input.toLowerCase())
      : toBytes32(input.toLowerCase());
  }

  // Auto-detect: if already in correct format, use directly
  if (
    input.startsWith("0x") &&
    input.length === 66 && // 0x + 64 hex chars = bytes32
    /^0x[0-9a-fA-F]{64}$/.test(input)
  ) {
    return input.toLowerCase();
  }

  // Auto-detect: convert string to bytes32
  return input.length > 32
    ? keccak256HashString(input.toLowerCase())
    : toBytes32(input.toLowerCase());
}

/**
 * Encodes a storage key for use in URL paths.
 *
 * This ensures special characters (including trailing spaces) are preserved
 * when storage keys are used in URLs.
 *
 * @param key - The storage key string (already decoded, from data or URL params)
 * @returns URL-encoded storage key safe for use in path segments
 *
 * @example
 * encodeStorageKeyForUrl('declaration of independence ')
 * // Returns: 'declaration%20of%20independence%20'
 */
export function encodeStorageKeyForUrl(key: string): string {
  return encodeURIComponent(key);
}

/**
 * Generate a <net ... /> embed tag for storage
 * @param params - Object containing storage embed parameters
 * @param params.storageKeyBytes - The storage key as bytes32 (hex string)
 * @param params.operatorAddress - The operator address
 * @param params.isRegularStorage - If true, includes s="d" for direct Storage.sol reads. If false/undefined, omits s attribute (defaults to ChunkedStorage)
 * @param params.versionIndex - Optional version index. If provided, includes i="versionIndex" attribute to reference specific historical version
 * @returns The embed tag string
 */
export function generateStorageEmbedTag(params: {
  storageKeyBytes: string;
  operatorAddress: string;
  isRegularStorage?: boolean;
  versionIndex?: number;
}): string {
  const operator = params.operatorAddress.toLowerCase();
  const indexAttr =
    params.versionIndex !== undefined ? ` i="${params.versionIndex}"` : "";
  const sourceAttr = params.isRegularStorage ? ` s="d"` : "";
  return `<net k="${params.storageKeyBytes}" v="0.0.1"${indexAttr} o="${operator}"${sourceAttr} />`;
}
