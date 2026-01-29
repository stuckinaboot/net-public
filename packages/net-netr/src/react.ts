// React Hooks - requires wagmi and react peer dependencies
export { useNetrToken } from "./hooks/useNetrToken";
export { useNetrPrice } from "./hooks/useNetrPrice";
export { useNetrLocker } from "./hooks/useNetrLocker";

// Re-export types used by hooks
export type {
  UseNetrLockerOptions,
  UseNetrPriceOptions,
  UseNetrTokenOptions,
} from "./types";
