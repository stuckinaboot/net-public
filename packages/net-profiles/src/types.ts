/**
 * Profile metadata stored as JSON in the metadata storage key
 */
export interface ProfileMetadata {
  x_username?: string;
  // Note: display_name is not stored - it's derived from ENS/Base name
  // Future fields could include:
  // bio?: string;
  // website?: string;
}

/**
 * User display name derived from ENS or address
 */
export interface UserDisplayName {
  displayName: string;
  ensName?: string;
  isLoading: boolean;
  error?: Error;
}

/**
 * Basic profile metadata returned by useBasicUserProfileMetadata
 */
export interface BasicUserProfileMetadata {
  profilePicture?: string;
  xUsername?: string;
  forwardedTo?: string;
  isLoading: boolean;
}

/**
 * Options for profile hooks
 */
export interface UseProfileOptions {
  chainId: number;
  userAddress: string;
  enabled?: boolean;
}

/**
 * Arguments prepared for Storage.put() transaction
 */
export interface ProfileStorageArgs {
  bytesKey: `0x${string}`;
  topic: string;
  bytesValue: `0x${string}`;
}

/**
 * Full profile data combining all profile fields
 */
export interface UserProfile {
  address: string;
  profilePicture?: string;
  xUsername?: string;
  canvas?: string;
  forwardedTo?: string;
}
