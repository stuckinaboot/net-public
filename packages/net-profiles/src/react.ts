// React Hooks - requires wagmi and react peer dependencies
export { useProfilePicture } from "./hooks/useProfilePicture";
export { useProfileXUsername } from "./hooks/useProfileXUsername";
export { useProfileCanvas } from "./hooks/useProfileCanvas";
export { useProfileCSS } from "./hooks/useProfileCSS";
export { useBasicUserProfileMetadata } from "./hooks/useBasicUserProfileMetadata";

// Re-export types used by hooks
export type {
  UseProfileOptions,
  BasicUserProfileMetadata,
  ProfileMetadata,
  UserProfile,
} from "./types";
