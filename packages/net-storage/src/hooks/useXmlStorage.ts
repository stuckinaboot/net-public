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
  returnFormat = "object",
  outputFormat = "hex",
}: UseXmlStorageOptions) {
  // Determine mode: preview (raw content) vs blockchain (fetch from storage)
  const isPreviewMode = !!content;
  const returnAsTuple = returnFormat === "tuple";
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
    if (!metadata?.[1]) return "";
    // metadata[1] is already a plain string because useStorage is called with outputFormat: "string"
    return metadata[1] as string;
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

  // Handle tuple format return
  if (returnAsTuple) {
    // Early return if XML parsing is skipped
    if (skipXmlParsing) {
      if (isPreviewMode) {
        // Preview mode: content is plain string
        const contentValue = content || "";
        return {
          data: contentValue
            ? outputAsString
              ? ([metadata?.[0] || "", contentValue] as StorageData)
              : ([
                  metadata?.[0] || "",
                  stringToHex(contentValue) as `0x${string}`,
                ] as StorageData)
            : undefined,
          isLoading: metadataLoading,
          error: metadataError,
        };
      } else {
        // Non-preview mode: metadata[1] is plain string from useStorage (since we pass outputFormat: "string")
        const dataValue = metadata?.[1] as string | undefined;
        return {
          data: dataValue
            ? outputAsString
              ? ([metadata?.[0] || "", dataValue] as StorageData)
              : ([
                  metadata?.[0] || "",
                  stringToHex(dataValue) as `0x${string}`,
                ] as StorageData)
            : undefined,
          isLoading: metadataLoading,
          error: metadataError,
        };
      }
    }

    // XML storage with tuple format
    if (isXml) {
      if (!assembledData) {
        // Loading or empty - return undefined (matches previous behavior)
        return {
          data: undefined,
          isLoading: metadataLoading || chunksLoading,
          error: metadataError || chunksError,
        };
      }

      // XML: resolved string → convert based on outputFormat
      const hexData = stringToHex(assembledData) as `0x${string}`;
      return {
        data: outputAsString
          ? ([metadata?.[0] || "", assembledData] as StorageData)
          : ([metadata?.[0] || "", hexData] as StorageData),
        isLoading: metadataLoading || chunksLoading,
        error: metadataError || chunksError,
      };
    } else {
      // Non-XML: metadata[1] is plain string from useStorage (since we pass outputFormat: "string") → convert based on outputFormat
      if (!metadata) {
        return {
          data: undefined,
          isLoading: metadataLoading,
          error: metadataError,
        };
      }
      // metadata[1] is now a plain string (not hex) because we pass outputFormat: "string" to useStorage
      const dataValue = metadata[1] as string | undefined;
      const returnValue = dataValue
        ? outputAsString
          ? ([metadata[0], dataValue] as StorageData)
          : ([
              metadata[0],
              stringToHex(dataValue) as `0x${string}`,
            ] as StorageData)
        : undefined;

      return {
        data: returnValue,
        isLoading: metadataLoading,
        error: metadataError,
      };
    }
  }

  // Default object format (existing behavior)
  // Early return if XML parsing is skipped
  if (skipXmlParsing) {
    return {
      data: isPreviewMode ? content || "" : ((metadata?.[1] || "") as string), // metadata[1] is already a plain string
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
      : ((metadata?.[1] || "") as string), // metadata[1] is already a plain string
    filename: metadata?.[0] || "",
    isLoading: metadataLoading || (isXml && chunksLoading),
    error: metadataError || chunksError,
    isXml,
  };
}
