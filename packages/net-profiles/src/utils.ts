import { stringToHex } from "viem";
import { toBytes32 } from "@net-protocol/core";
import {
  PROFILE_PICTURE_STORAGE_KEY,
  PROFILE_METADATA_STORAGE_KEY,
  PROFILE_CANVAS_STORAGE_KEY,
  PROFILE_PICTURE_TOPIC,
  PROFILE_METADATA_TOPIC,
  PROFILE_CANVAS_TOPIC,
} from "./constants";
import type { ProfileMetadata, ProfileStorageArgs } from "./types";

/**
 * Convert a string value to hex for storage
 */
export function getValueArgForStorage(value: string): `0x${string}` {
  return stringToHex(value);
}

/**
 * Get storage args (key as bytes32, value as hex)
 */
export function getBytesArgsForStorage(
  key: string,
  value: string
): { bytesKey: `0x${string}`; bytesValue: `0x${string}` } {
  const bytesKey = toBytes32(key) as `0x${string}`;
  const bytesValue = getValueArgForStorage(value);
  return { bytesKey, bytesValue };
}

/**
 * Prepare transaction arguments for updating profile picture
 *
 * @param imageUrl - The URL of the profile picture
 * @returns Arguments for Storage.put() - [bytesKey, topic, bytesValue]
 *
 * @example
 * ```ts
 * const args = getProfilePictureStorageArgs("https://example.com/image.jpg");
 * // Use with wagmi writeContract:
 * writeContract({
 *   abi: STORAGE_CONTRACT.abi,
 *   address: STORAGE_CONTRACT.address,
 *   functionName: "put",
 *   args: [args.bytesKey, args.topic, args.bytesValue],
 * });
 * ```
 */
export function getProfilePictureStorageArgs(
  imageUrl: string
): ProfileStorageArgs {
  const { bytesKey, bytesValue } = getBytesArgsForStorage(
    PROFILE_PICTURE_STORAGE_KEY,
    imageUrl
  );
  return {
    bytesKey,
    topic: PROFILE_PICTURE_TOPIC,
    bytesValue,
  };
}

/**
 * Prepare transaction arguments for updating profile metadata (X username, etc.)
 *
 * @param metadata - Profile metadata object to store
 * @returns Arguments for Storage.put() - [bytesKey, topic, bytesValue]
 *
 * @example
 * ```ts
 * const args = getProfileMetadataStorageArgs({ x_username: "myusername" });
 * writeContract({
 *   abi: STORAGE_CONTRACT.abi,
 *   address: STORAGE_CONTRACT.address,
 *   functionName: "put",
 *   args: [args.bytesKey, args.topic, args.bytesValue],
 * });
 * ```
 */
export function getProfileMetadataStorageArgs(
  metadata: ProfileMetadata
): ProfileStorageArgs {
  const jsonString = JSON.stringify(metadata);
  const { bytesKey, bytesValue } = getBytesArgsForStorage(
    PROFILE_METADATA_STORAGE_KEY,
    jsonString
  );
  return {
    bytesKey,
    topic: PROFILE_METADATA_TOPIC,
    bytesValue,
  };
}

/**
 * Prepare transaction arguments for updating X username
 * This is a convenience wrapper around getProfileMetadataStorageArgs
 *
 * Note: Username is stored WITHOUT the @ prefix. The @ is stripped if provided.
 *
 * @param username - X/Twitter username (with or without @)
 * @returns Arguments for Storage.put()
 */
export function getXUsernameStorageArgs(username: string): ProfileStorageArgs {
  // Strip @ prefix if present - store username without @
  const normalizedUsername = username.startsWith("@")
    ? username.slice(1)
    : username;
  return getProfileMetadataStorageArgs({ x_username: normalizedUsername });
}

/**
 * Prepare transaction arguments for updating profile canvas (HTML content)
 *
 * @param htmlContent - HTML content for the profile canvas
 * @returns Arguments for Storage.put()
 *
 * @example
 * ```ts
 * const args = getProfileCanvasStorageArgs("<div>My custom profile</div>");
 * writeContract({
 *   abi: STORAGE_CONTRACT.abi,
 *   address: STORAGE_CONTRACT.address,
 *   functionName: "put",
 *   args: [args.bytesKey, args.topic, args.bytesValue],
 * });
 * ```
 */
export function getProfileCanvasStorageArgs(
  htmlContent: string
): ProfileStorageArgs {
  const { bytesKey, bytesValue } = getBytesArgsForStorage(
    PROFILE_CANVAS_STORAGE_KEY,
    htmlContent
  );
  return {
    bytesKey,
    topic: PROFILE_CANVAS_TOPIC,
    bytesValue,
  };
}

/**
 * Parse profile metadata JSON and extract profile data
 *
 * @param jsonData - JSON string from storage
 * @returns Parsed profile metadata or undefined if invalid
 */
export function parseProfileMetadata(
  jsonData: string
): ProfileMetadata | undefined {
  try {
    const parsed = JSON.parse(jsonData);
    const storedUsername =
      parsed?.x_username &&
      typeof parsed.x_username === "string" &&
      parsed.x_username.length > 0
        ? parsed.x_username
        : undefined;

    // Strip @ if present for backwards compatibility with older stored data
    const usernameWithoutAt = storedUsername?.startsWith("@")
      ? storedUsername.slice(1)
      : storedUsername;

    // Extract bio if present
    const bio =
      parsed?.bio && typeof parsed.bio === "string" && parsed.bio.length > 0
        ? parsed.bio
        : undefined;

    // Extract display name if present
    const display_name =
      parsed?.display_name &&
      typeof parsed.display_name === "string" &&
      parsed.display_name.length > 0
        ? parsed.display_name
        : undefined;

    // Extract token address if present (stored as lowercase)
    const token_address =
      parsed?.token_address &&
      typeof parsed.token_address === "string" &&
      parsed.token_address.length > 0
        ? parsed.token_address.toLowerCase()
        : undefined;

    return {
      x_username: usernameWithoutAt,
      bio,
      display_name,
      token_address,
    };
  } catch {
    return undefined;
  }
}

/**
 * Validate that a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate X/Twitter username format
 * Returns true if valid (alphanumeric and underscores, 1-15 chars)
 */
export function isValidXUsername(username: string): boolean {
  if (!username) return false;
  // Remove @ prefix if present
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  // X usernames: 1-15 chars, alphanumeric and underscores only
  return /^[a-zA-Z0-9_]{1,15}$/.test(cleanUsername);
}

/**
 * Validate bio format
 * Returns true if valid (max 280 chars, no control characters except newlines)
 */
export function isValidBio(bio: string): boolean {
  if (!bio) return false;
  if (bio.length > 280) return false;
  // Allow printable characters, spaces, and newlines. Disallow other control chars.
  // eslint-disable-next-line no-control-regex
  const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(bio);
  return !hasControlChars;
}

/**
 * Validate display name format
 * Returns true if valid (1-25 characters, no control characters except spaces)
 */
export function isValidDisplayName(displayName: string): boolean {
  if (!displayName) return false;
  if (displayName.length > 25) return false;
  // Disallow control characters
  // eslint-disable-next-line no-control-regex
  const hasControlChars = /[\x00-\x1F\x7F]/.test(displayName);
  return !hasControlChars;
}

/**
 * Prepare transaction arguments for updating bio
 * This is a convenience wrapper around getProfileMetadataStorageArgs
 *
 * @param bio - The bio text
 * @returns Arguments for Storage.put()
 */
export function getBioStorageArgs(bio: string): ProfileStorageArgs {
  return getProfileMetadataStorageArgs({ bio });
}

/**
 * Prepare transaction arguments for updating display name
 * This is a convenience wrapper around getProfileMetadataStorageArgs
 *
 * @param displayName - The display name (max 25 characters)
 * @returns Arguments for Storage.put()
 */
export function getDisplayNameStorageArgs(
  displayName: string
): ProfileStorageArgs {
  return getProfileMetadataStorageArgs({ display_name: displayName });
}

/**
 * Prepare transaction arguments for updating token address
 * This is a convenience wrapper around getProfileMetadataStorageArgs
 *
 * @param tokenAddress - The ERC-20 token contract address (stored as lowercase)
 * @returns Arguments for Storage.put()
 */
export function getTokenAddressStorageArgs(
  tokenAddress: string
): ProfileStorageArgs {
  return getProfileMetadataStorageArgs({
    token_address: tokenAddress.toLowerCase(),
  });
}

/**
 * Validate that a string is a valid EVM token address
 * Returns true if valid (0x-prefixed, 40 hex characters)
 */
export function isValidTokenAddress(address: string): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
