import { useStorage } from "@net-protocol/storage/react";
import { getStorageKeyBytes } from "@net-protocol/storage";
import { PROFILE_CSS_STORAGE_KEY } from "../constants";
import { hexToString } from "viem";
import type { UseProfileOptions } from "../types";

/**
 * Hook to fetch profile custom CSS from storage
 *
 * @param options - Chain ID and user address to fetch profile for
 * @returns Custom CSS string and loading state
 *
 * @example
 * ```tsx
 * const { css, isLoading } = useProfileCSS({
 *   chainId: 8453,
 *   userAddress: "0x...",
 * });
 *
 * if (css) {
 *   return <style>{`.profile-themed { ${css} }`}</style>;
 * }
 * ```
 */
export function useProfileCSS({
  chainId,
  userAddress,
  enabled = true,
}: UseProfileOptions) {
  const { data, isLoading, error } = useStorage({
    chainId,
    key: getStorageKeyBytes(PROFILE_CSS_STORAGE_KEY),
    operatorAddress: userAddress,
    enabled,
  });

  // Convert hex value to string CSS
  const css = data?.value ? hexToString(data.value as any) : undefined;

  return {
    css: css || undefined,
    isLoading,
    error,
    // Also expose raw data for advanced use cases
    rawData: data,
  };
}
