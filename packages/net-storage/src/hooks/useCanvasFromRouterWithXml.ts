import { useMemo, useState } from "react";
import useAsyncEffect from "use-async-effect";
import { stringToHex, hexToString } from "viem";
import { useCanvasFromRouter } from "./useCanvasFromRouter";
import { containsXmlReferences } from "../utils/xmlUtils";
import {
  resolveXmlRecursive,
  MAX_XML_DEPTH,
} from "../client/xmlStorage";
import { getPublicClient } from "@net-protocol/core";
import type { UseCanvasFromRouterOptions, StorageData } from "../types";

/**
 * Generic hook to fetch canvas content from StorageRouter with XML support
 * Handles regular storage, chunked storage, and XML storage seamlessly
 * Works for any canvas type (profile, token, etc.)
 */
export function useCanvasFromRouterWithXml({
  chainId,
  storageKey,
  operatorAddress,
  enabled = true,
}: UseCanvasFromRouterOptions) {
  // Step 1: Get base data from StorageRouter (handles ChunkedStorage)
  const routerData = useCanvasFromRouter({
    chainId,
    storageKey,
    operatorAddress,
    enabled,
  });

  // Step 2: Detect XML storage from router result
  const isXmlStorage = useMemo(() => {
    if (!routerData.data?.[1]) return false;
    const metadata = hexToString(routerData.data[1] as `0x${string}`);
    return containsXmlReferences(metadata);
  }, [routerData.data]);

  // Step 3: Recursively resolve XML references
  const [resolvedContent, setResolvedContent] = useState<string | undefined>();
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunksError, setChunksError] = useState<Error | undefined>();

  useAsyncEffect(async () => {
    if (!isXmlStorage || !routerData.data?.[1]) {
      setResolvedContent(undefined);
      setChunksLoading(false);
      return;
    }

    setChunksLoading(true);
    setChunksError(undefined);

    try {
      const metadataString = hexToString(routerData.data[1] as `0x${string}`);

      const client = getPublicClient({ chainId });
      if (!client) {
        throw new Error(`Chain not found for chainId: ${chainId}`);
      }

      // Use recursive resolver for multi-layer XML support
      const resolved = await resolveXmlRecursive(
        metadataString,
        operatorAddress,
        client,
        MAX_XML_DEPTH,
        new Set()
      );

      setResolvedContent(resolved);
    } catch (error) {
      console.error(
        "[useCanvasFromRouterWithXml] XML resolution error:",
        error
      );
      setChunksError(error as Error);
      setResolvedContent(undefined);
    } finally {
      setChunksLoading(false);
    }
  }, [routerData.data, operatorAddress, chainId, isXmlStorage]);

  // Step 4: Use resolved content directly (already fully resolved)
  const assembledData = resolvedContent;

  // Step 5: Return appropriate data
  if (isXmlStorage) {
    if (assembledData && routerData.data) {
      // XML storage with assembled data - return the final content
      return {
        data: [routerData.data[0], stringToHex(assembledData)] as StorageData,
        isLoading: routerData.isLoading || chunksLoading,
        error: routerData.error || chunksError,
      };
    } else {
      // XML storage but still loading chunks - don't show XML metadata
      return {
        data: undefined,
        isLoading: routerData.isLoading || chunksLoading,
        error: routerData.error || chunksError,
      };
    }
  }

  // Non-XML: return router data unchanged
  return routerData;
}

