import { useReadContracts } from "wagmi";
import { STORAGE_CONTRACT, getStorageKeyBytes } from "@net-protocol/storage";
import {
  PROFILE_PICTURE_STORAGE_KEY,
  PROFILE_METADATA_STORAGE_KEY,
} from "../constants";
import { hexToString } from "viem";
import { parseProfileMetadata } from "../utils";
import type { BasicUserProfileMetadata, UseProfileOptions } from "../types";

/**
 * Hook to fetch basic user profile metadata (profile picture and X username) in a single call
 *
 * This hook is optimized for efficiency - it batches multiple storage reads into a single
 * contract call using wagmi's useReadContracts.
 *
 * @param options - Chain ID and user address to fetch profile for
 * @returns Profile picture URL, X username, and loading state
 *
 * @example
 * ```tsx
 * const { profilePicture, xUsername, isLoading } = useBasicUserProfileMetadata({
 *   chainId: 8453,
 *   userAddress: "0x...",
 * });
 *
 * return (
 *   <div>
 *     {profilePicture && <img src={profilePicture} alt="Profile" />}
 *     {xUsername && <span>@{xUsername}</span>}
 *   </div>
 * );
 * ```
 */
export function useBasicUserProfileMetadata({
  chainId,
  userAddress,
  enabled = true,
}: UseProfileOptions): BasicUserProfileMetadata {
  const profilePictureKey = getStorageKeyBytes(PROFILE_PICTURE_STORAGE_KEY);
  const profileMetadataKey = getStorageKeyBytes(PROFILE_METADATA_STORAGE_KEY);

  const {
    data: results,
    isLoading,
    error,
  } = useReadContracts({
    contracts: [
      {
        address: STORAGE_CONTRACT.address as `0x${string}`,
        abi: STORAGE_CONTRACT.abi,
        functionName: "get",
        args: [profilePictureKey, userAddress as `0x${string}`],
        chainId,
      },
      {
        address: STORAGE_CONTRACT.address as `0x${string}`,
        abi: STORAGE_CONTRACT.abi,
        functionName: "get",
        args: [profileMetadataKey, userAddress as `0x${string}`],
        chainId,
      },
    ],
    query: {
      enabled: enabled && !!userAddress && !!chainId,
    },
  });

  // Parse the results - decode hex data
  // Contract returns tuple [string text, bytes data]
  const profilePictureHex = (results as any)?.[0]?.result?.[1] || undefined;
  const profileMetadataJsonHex = (results as any)?.[1]?.result?.[1] || undefined;

  const profilePicture = profilePictureHex
    ? hexToString(profilePictureHex as `0x${string}`)
    : undefined;
  const profileMetadataJson = profileMetadataJsonHex
    ? hexToString(profileMetadataJsonHex as `0x${string}`)
    : undefined;

  // Parse X username, bio, and display name from JSON metadata
  const profileMetadata = profileMetadataJson
    ? parseProfileMetadata(profileMetadataJson)
    : undefined;
  const xUsername = profileMetadata?.x_username;
  const bio = profileMetadata?.bio;
  const displayName = profileMetadata?.display_name;

  return {
    profilePicture: profilePicture || undefined,
    xUsername: xUsername || undefined,
    bio: bio || undefined,
    displayName: displayName || undefined,
    isLoading,
  };
}
