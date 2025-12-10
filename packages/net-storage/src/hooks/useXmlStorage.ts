import { useMemo, useState } from "react";
import useAsyncEffect from "use-async-effect";
import { hexToString } from "viem";
import { useStorage } from "./useStorage";
import {
  parseNetReferences,
  containsXmlReferences,
} from "../utils/xmlUtils";
import {
  resolveXmlRecursive,
  MAX_XML_DEPTH,
} from "../client/xmlStorage";
import { getPublicClient } from "@net-protocol/core";
import type { UseXmlStorageOptions } from "../types";

export function useXmlStorage({
  chainId,
  key,
  operatorAddress,
  skipXmlParsing = false,
  enabled = true,
  content,
  index,
}: UseXmlStorageOptions) {
  // Determine mode: preview (raw content) vs blockchain (fetch from storage)
  const isPreviewMode = !!content;

  // 1. Fetch metadata using existing useStorage hook (only in blockchain mode)
  const {
    data: metadata,
    isLoading: metadataLoading,
    error: metadataError,
  } = useStorage({
    chainId,
    key: key || "",
    operatorAddress,
    enabled: enabled && !isPreviewMode,
    index, // Pass index to useStorage for historical versions
  });

  // 2. Get metadata string from either preview content or blockchain data
  const metadataString = useMemo(() => {
    if (skipXmlParsing) return "";
    if (isPreviewMode) return content || "";
    if (!metadata?.[1]) return "";
    return hexToString(metadata[1] as `0x${string}`);
  }, [skipXmlParsing, isPreviewMode, content, metadata]);

  // 3. Parse XML references from metadata string
  const references = useMemo(() => {
    if (!metadataString) return [];
    return parseNetReferences(metadataString);
  }, [metadataString]);

  // 3. Fetch chunks
  const [chunks, setChunks] = useState<string[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunksError, setChunksError] = useState<Error | undefined>();

  useAsyncEffect(async () => {
    if (skipXmlParsing || !metadataString) {
      setChunks([]);
      setChunksLoading(false);
      return;
    }

    // Check if content has XML references
    if (!containsXmlReferences(metadataString)) {
      setChunks([]);
      setChunksLoading(false);
      return;
    }

    setChunksLoading(true);
    setChunksError(undefined);

    console.log("[useXmlStorage] Starting recursive XML resolution:", {
      maxDepth: MAX_XML_DEPTH,
      operatorAddress,
      chainId,
    });

    try {
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

      // Store resolved content as a single "chunk"
      setChunks([resolved]);
    } catch (error) {
      console.error("[useXmlStorage] Error in recursive resolution:", error);
      setChunksError(error as any);
      setChunks([]);
    } finally {
      setChunksLoading(false);
    }
  }, [metadataString, operatorAddress, chainId, skipXmlParsing]);

  // 4. Assemble data (already resolved by recursive resolver)
  const assembledData = useMemo(() => {
    if (skipXmlParsing || !metadataString || !chunks.length) return undefined;
    // chunks[0] already contains fully resolved content from recursive resolver
    return chunks[0];
  }, [metadataString, chunks, skipXmlParsing]);

  // 5. Determine if this is XML storage
  const isXml = useMemo(() => {
    if (skipXmlParsing || !metadataString) return false;
    return containsXmlReferences(metadataString);
  }, [metadataString, skipXmlParsing]);

  console.log("XML Storage Reading:", {
    key,
    operatorAddress,
    isXml,
    references: references.length,
    chunks: chunks.length,
    assembledDataLength: assembledData?.length,
  });

  // Early return if XML parsing is skipped
  if (skipXmlParsing) {
    return {
      data: isPreviewMode
        ? content || ""
        : hexToString((metadata?.[1] || "") as `0x${string}`),
      filename: metadata?.[0] || "",
      isLoading: metadataLoading,
      error: metadataError,
      isXml: false,
    };
  }

  return {
    data: isXml
      ? assembledData
      : isPreviewMode
      ? content || ""
      : hexToString((metadata?.[1] || "") as `0x${string}`),
    filename: metadata?.[0] || "",
    isLoading: metadataLoading || (isXml && chunksLoading),
    error: metadataError || chunksError,
    isXml,
  };
}

