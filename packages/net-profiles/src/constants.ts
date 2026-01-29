/**
 * Profile-related storage keys
 *
 * Using descriptive keys under 32 bytes to avoid hashing complexity and work seamlessly
 * with existing storage infrastructure. The key includes app prefix and versioning for
 * clarity and future-proofing.
 *
 * NOTE: if we change these keys, users will not be able to see their profile data
 */
export const PROFILE_CANVAS_STORAGE_KEY = "net-beta0.0.1-profile-canvas";
export const PROFILE_PICTURE_STORAGE_KEY = "net-beta0.0.1-profile-picture";
export const PROFILE_X_USERNAME_STORAGE_KEY =
  "net-beta0.0.1-profile-x-username";
export const PROFILE_METADATA_STORAGE_KEY = "net-beta0.0.1-profile-metadata";

/**
 * Topic strings used when writing to storage
 * These are the second argument to Storage.put()
 */
export const PROFILE_PICTURE_TOPIC = "profile-picture";
export const PROFILE_METADATA_TOPIC = "profile-metadata";
export const PROFILE_CANVAS_TOPIC = "profile-canvas";
