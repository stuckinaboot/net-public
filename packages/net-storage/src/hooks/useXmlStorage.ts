import { useMemo, useState, useEffect } from "react";
import useAsyncEffect from "use-async-effect";
import { hexToString, stringToHex } from "viem";
import { useStorage } from "./useStorage";
import { parseNetReferences, containsXmlReferences } from "../utils/xmlUtils";
import { resolveXmlRecursive, MAX_XML_DEPTH } from "../client/xmlStorage";
import { getPublicClient } from "@net-protocol/core";
import type { UseXmlStorageOptions, StorageData } from "../types";

export function useXmlStorage({
  chainId,
  key,
  operatorAddress,
  skipXmlParsing = false,
  enabled = true,
  content,
  index,
  keyFormat,
  useRouter,
  outputFormat = "hex",
}: UseXmlStorageOptions) {
  // Determine mode: preview (raw content) vs blockchain (fetch from storage)
  const isPreviewMode = !!content;
  const outputAsString = outputFormat === "string";

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
    keyFormat, // Pass keyFormat through
    useRouter, // Pass useRouter through to enable router path
    outputFormat: "string", // Always get plain string from useStorage, then convert based on our outputFormat
  });

  // 2. Get metadata string from either preview content or blockchain data
  const metadataString = useMemo(() => {
    if (skipXmlParsing) return "";
    if (isPreviewMode) return content || "";
    if (!metadata?.value) return "";
    // metadata.value is already a plain string because useStorage is called with outputFormat: "string"
    return metadata.value as string;
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

    try {
      const client = getPublicClient({ chainId });
      if (!client) {
        throw new Error(`Chain not found for chainId: ${chainId}`);
      }

      console.log("[useXmlStorage] Starting XML resolution:", {
        metadataStringLength: metadataString.length,
        referencesCount: references.length,
        chainId,
        operatorAddress,
        maxDepth: MAX_XML_DEPTH,
      });

      // Use recursive resolver for multi-layer XML support
      const resolved = await resolveXmlRecursive(
        metadataString,
        operatorAddress,
        client,
        MAX_XML_DEPTH,
        new Set()
      );

      console.log("[useXmlStorage] XML resolution complete:", {
        originalLength: metadataString.length,
        resolvedLength: resolved.length,
        resolvedSizeMB: (resolved.length / (1024 * 1024)).toFixed(2),
      });

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

  // Helper to convert value based on outputFormat
  const formatValue = (value: string | undefined): string => {
    if (!value) return "";
    // If outputFormat is "hex", convert string back to hex
    // (metadata.value is always a string because useStorage is called with outputFormat: "string")
    return outputAsString ? value : stringToHex(value);
  };

  // Always return object format
  // Early return if XML parsing is skipped
  if (skipXmlParsing) {
    return {
      text: metadata?.text || "",
      value: isPreviewMode ? content || "" : formatValue(metadata?.value),
      isLoading: metadataLoading,
      error: metadataError,
      isXml: false,
    };
  }

  return {
    text: metadata?.text || "",
    value: isXml
      ? formatValue(assembledData)
      : isPreviewMode
      ? content || ""
      : formatValue(metadata?.value),
    isLoading: metadataLoading || (isXml && chunksLoading),
    error: metadataError || chunksError,
    isXml,
  };
}
