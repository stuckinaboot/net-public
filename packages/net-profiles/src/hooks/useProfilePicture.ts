import { useStorage } from "@net-protocol/storage/react";
import { getStorageKeyBytes } from "@net-protocol/storage";
import { PROFILE_PICTURE_STORAGE_KEY } from "../constants";
import { hexToString } from "viem";
import type { UseProfileOptions } from "../types";

/**
 * Hook to fetch profile picture URL from storage
 *
 * @param options - Chain ID and user address to fetch profile for
 * @returns Profile picture URL and loading state
 *
 * @example
 * ```tsx
 * const { profilePicture, isLoading } = useProfilePicture({
 *   chainId: 8453,
 *   userAddress: "0x...",
 * });
 *
 * if (profilePicture) {
 *   return <img src={profilePicture} alt="Profile" />;
 * }
 * ```
 */
export function useProfilePicture({
  chainId,
  userAddress,
  enabled = true,
}: UseProfileOptions) {
  const { data, isLoading, error } = useStorage({
    chainId,
    key: getStorageKeyBytes(PROFILE_PICTURE_STORAGE_KEY),
    operatorAddress: userAddress,
    enabled,
  });

  // Convert hex value to string URL
  const profilePicture = data?.value ? hexToString(data.value as any) : undefined;

  return {
    profilePicture: profilePicture || undefined,
    isLoading,
    error,
    // Also expose raw data for advanced use cases
    rawData: data,
  };
}
