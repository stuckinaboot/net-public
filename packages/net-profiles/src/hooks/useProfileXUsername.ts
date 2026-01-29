import { useStorage } from "@net-protocol/storage/react";
import { getStorageKeyBytes } from "@net-protocol/storage";
import { PROFILE_METADATA_STORAGE_KEY } from "../constants";
import { hexToString } from "viem";
import { parseProfileMetadata } from "../utils";
import type { UseProfileOptions } from "../types";

/**
 * Hook to fetch X/Twitter username from profile metadata storage
 *
 * @param options - Chain ID and user address to fetch profile for
 * @returns X username (without @) and loading state
 *
 * @example
 * ```tsx
 * const { xUsername, isLoading } = useProfileXUsername({
 *   chainId: 8453,
 *   userAddress: "0x...",
 * });
 *
 * if (xUsername) {
 *   return <a href={`https://x.com/${xUsername}`}>@{xUsername}</a>;
 * }
 * ```
 */
export function useProfileXUsername({
  chainId,
  userAddress,
  enabled = true,
}: UseProfileOptions) {
  const { data, isLoading, error } = useStorage({
    chainId,
    key: getStorageKeyBytes(PROFILE_METADATA_STORAGE_KEY),
    operatorAddress: userAddress,
    enabled,
  });

  // Parse JSON metadata to extract X username
  let xUsername: string | undefined;
  if (data?.value) {
    try {
      const jsonString = hexToString(data.value as any);
      const metadata = parseProfileMetadata(jsonString);
      xUsername = metadata?.x_username;
    } catch {
      // Invalid JSON or hex data
    }
  }

  return {
    xUsername,
    isLoading,
    error,
    // Also expose raw data for advanced use cases
    rawData: data,
  };
}
