import { keccak256, pad, stringToHex, toBytes, toHex } from "viem";

/**
 * Convert a string to bytes32 format
 * @throws Error if string is longer than 32 bytes
 */
export function toBytes32(myString: string): string {
  if (myString.length > 32) {
    throw new Error("String must be less than 32 bytes");
  }

  // Convert the string to bytes
  const bytes = new TextEncoder().encode(myString);

  // Convert bytes to hex string
  const hexString = toHex(bytes);

  // Pad the hex string to 32 bytes (64 characters + '0x' prefix)
  const paddedHex = pad(hexString, { size: 32 });

  return paddedHex;
}

/**
 * Hash a string using keccak256
 */
export function keccak256HashString(myString: string): string {
  // Convert the string to bytes
  const stringAsBytes = toBytes(stringToHex(myString));

  // Compute the keccak256 hash
  const hashedString = keccak256(stringAsBytes);

  return hashedString;
}

