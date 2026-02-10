// Constants - Storage keys and topics
export {
  PROFILE_CANVAS_STORAGE_KEY,
  PROFILE_PICTURE_STORAGE_KEY,
  PROFILE_X_USERNAME_STORAGE_KEY,
  PROFILE_METADATA_STORAGE_KEY,
  PROFILE_PICTURE_TOPIC,
  PROFILE_METADATA_TOPIC,
  PROFILE_CANVAS_TOPIC,
} from "./constants";

// Types
export type {
  ProfileMetadata,
  UserDisplayName,
  BasicUserProfileMetadata,
  UseProfileOptions,
  ProfileStorageArgs,
  UserProfile,
} from "./types";

// Utilities - for preparing storage transactions
export {
  getValueArgForStorage,
  getBytesArgsForStorage,
  getProfilePictureStorageArgs,
  getProfileMetadataStorageArgs,
  getXUsernameStorageArgs,
  getBioStorageArgs,
  getDisplayNameStorageArgs,
  getTokenAddressStorageArgs,
  getProfileCanvasStorageArgs,
  parseProfileMetadata,
  isValidUrl,
  isValidXUsername,
  isValidBio,
  isValidDisplayName,
  isValidTokenAddress,
} from "./utils";

// Re-export storage contract for convenience
export { STORAGE_CONTRACT } from "@net-protocol/storage";
