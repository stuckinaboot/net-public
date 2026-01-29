import { useStorage } from "@net-protocol/storage/react";
import { getStorageKeyBytes } from "@net-protocol/storage";
import { PROFILE_CANVAS_STORAGE_KEY } from "../constants";
import { hexToString } from "viem";
import type { UseProfileOptions } from "../types";

/**
 * Hook to fetch profile canvas HTML content from storage
 *
 * Note: For large canvas content (>20KB), you may need to use XML storage.
 * This hook fetches from regular storage. For large content, consider using
 * useXmlStorage from @net-protocol/storage/react directly.
 *
 * @param options - Chain ID and user address to fetch profile for
 * @returns Canvas HTML content and loading state
 *
 * @example
 * ```tsx
 * const { canvas, isLoading } = useProfileCanvas({
 *   chainId: 8453,
 *   userAddress: "0x...",
 * });
 *
 * if (canvas) {
 *   return <iframe srcDoc={canvas} />;
 * }
 * ```
 */
export function useProfileCanvas({
  chainId,
  userAddress,
  enabled = true,
}: UseProfileOptions) {
  const { data, isLoading, error } = useStorage({
    chainId,
    key: getStorageKeyBytes(PROFILE_CANVAS_STORAGE_KEY),
    operatorAddress: userAddress,
    enabled,
    // Use router for automatic chunked storage detection
    useRouter: true,
  });

  // Convert hex value to string HTML
  const canvas = data?.value ? hexToString(data.value as any) : undefined;

  return {
    canvas: canvas || undefined,
    isLoading,
    error,
    // Also expose raw data for advanced use cases
    rawData: data,
  };
}
