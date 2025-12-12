import { normalizeDataOrEmpty } from "@net-protocol/core";
import { keccak256HashString } from "@net-protocol/core";
import { STORAGE_CONTRACT, CHUNKED_STORAGE_CONTRACT } from "../constants";
import { getStorageKeyBytes } from "../utils/keyUtils";
import { processDataForStorage, generateXmlMetadata } from "../utils/writingUtils";
import { chunkDataForStorage } from "../utils/chunkUtils";
import type { WriteTransactionConfig } from "../types";

/**
 * Validate storage parameters
 */
function validateStorageParams(params: {
  key: string | `0x${string}`;
  chunks?: string[];
}) {
  if (!params.key || (typeof params.key === "string" && params.key.length === 0)) {
    throw new Error("Storage key cannot be empty");
  }
  
  if (params.chunks && params.chunks.length === 0) {
    throw new Error("Chunks array cannot be empty");
  }
  
  if (params.chunks && params.chunks.length > 255) {
    throw new Error(`Too many chunks: ${params.chunks.length} exceeds maximum of 255`);
  }
}

/**
 * Prepare transaction config for storing a single value in Storage contract.
 */
export function prepareStoragePut(params: {
  key: string | `0x${string}`;
  text: string;
  value: string | `0x${string}`;
  chainId: number;
  keyFormat?: "raw" | "bytes32";
}): WriteTransactionConfig {
  validateStorageParams({ key: params.key });

  const keyBytes32 = getStorageKeyBytes(params.key, params.keyFormat) as `0x${string}`;
  const valueHex = normalizeDataOrEmpty(params.value);

  return {
    to: STORAGE_CONTRACT.address,
    functionName: "put",
    args: [keyBytes32, params.text, valueHex],
    abi: STORAGE_CONTRACT.abi,
  };
}

/**
 * Prepare transaction config for storing data in ChunkedStorage contract.
 */
export function prepareChunkedStoragePut(params: {
  key: string | `0x${string}`;
  text: string;
  chunks: string[]; // Array of 20KB compressed chunks (hex strings)
  chainId: number;
  keyFormat?: "raw" | "bytes32";
}): WriteTransactionConfig {
  validateStorageParams({ key: params.key, chunks: params.chunks });

  const keyBytes32 = getStorageKeyBytes(params.key, params.keyFormat) as `0x${string}`;

  // Validate chunks are hex strings
  for (const chunk of params.chunks) {
    if (!chunk.startsWith("0x")) {
      throw new Error(`Invalid chunk format: ${chunk} must be a hex string`);
    }
  }

  return {
    to: CHUNKED_STORAGE_CONTRACT.address,
    functionName: "put",
    args: [keyBytes32, params.text, params.chunks],
    abi: CHUNKED_STORAGE_CONTRACT.abi,
  };
}

/**
 * Prepare transaction config for bulk storage operations using Storage.bulkPut.
 */
export function prepareBulkStoragePut(params: {
  entries: Array<{
    key: string | `0x${string}`;
    text: string;
    value: string | `0x${string}`;
  }>;
  chainId: number;
  keyFormat?: "raw" | "bytes32";
}): WriteTransactionConfig {
  if (params.entries.length === 0) {
    throw new Error("Entries array cannot be empty");
  }

  // Convert all entries
  const bulkEntries = params.entries.map((entry) => {
    validateStorageParams({ key: entry.key });
    const keyBytes32 = getStorageKeyBytes(entry.key, params.keyFormat) as `0x${string}`;
    const valueHex = normalizeDataOrEmpty(entry.value);

    return {
      key: keyBytes32,
      text: entry.text,
      value: valueHex,
    };
  });

  return {
    to: STORAGE_CONTRACT.address,
    functionName: "bulkPut",
    args: [bulkEntries],
    abi: STORAGE_CONTRACT.abi,
  };
}

/**
 * Prepare transaction configs for XML storage (multiple transactions - metadata + chunks).
 */
export function prepareXmlStorage(params: {
  data: string;
  operatorAddress: `0x${string}`;
  storageKey?: string | `0x${string}`;
  filename?: string;
  chainId: number;
  useChunkedStorageBackend?: boolean; // Default: true
  keyFormat?: "raw" | "bytes32";
}): {
  transactionConfigs: WriteTransactionConfig[];
  topLevelHash: string;
  metadata: string;
} {
  // Process data: chunk it and generate hashes
  const result = processDataForStorage(
    params.data,
    params.operatorAddress,
    params.storageKey
  );

  if (!result.valid) {
    throw new Error(result.error || "Failed to process data for storage");
  }

  // Use ChunkedStorage backend by default
  const useChunkedStorageBackend = params.useChunkedStorageBackend !== false;

  if (useChunkedStorageBackend) {
    // Prepare XML chunks for ChunkedStorage backend
    const chunkedResult = prepareXmlChunksForChunkedStorage({
      xmlChunks: result.chunks,
      operatorAddress: params.operatorAddress,
      chainId: params.chainId,
    });

    // Create metadata transaction (Storage.put with XML metadata)
    const metadataConfig = prepareStoragePut({
      key: result.topLevelHash,
      text: params.filename || "",
      value: chunkedResult.xmlMetadata,
      chainId: params.chainId,
      keyFormat: params.keyFormat,
    });

    // Combine transactions: metadata first, then chunk transactions
    return {
      transactionConfigs: [metadataConfig, ...chunkedResult.transactionConfigs],
      topLevelHash: result.topLevelHash,
      metadata: chunkedResult.xmlMetadata,
    };
  } else {
    // Legacy mode: store XML chunks directly in Storage
    // This is not commonly used but kept for backward compatibility
    const chunkConfigs: WriteTransactionConfig[] = result.chunkHashes.map(
      (hash, index) =>
        prepareStoragePut({
          key: hash,
          text: "",
          value: result.chunks[index],
          chainId: params.chainId,
          keyFormat: params.keyFormat,
        })
    );

    // Create metadata transaction
    const metadataConfig = prepareStoragePut({
      key: result.topLevelHash,
      text: params.filename || "",
      value: result.xmlMetadata,
      chainId: params.chainId,
      keyFormat: params.keyFormat,
    });

    return {
      transactionConfigs: [metadataConfig, ...chunkConfigs],
      topLevelHash: result.topLevelHash,
      metadata: result.xmlMetadata,
    };
  }
}

/**
 * Prepare transaction configs for storing XML chunks in ChunkedStorage backend.
 * Each XML chunk is compressed and chunked into 20KB ChunkedStorage chunks.
 */
export function prepareXmlChunksForChunkedStorage(params: {
  xmlChunks: string[];
  operatorAddress: `0x${string}`;
  chainId: number;
}): {
  transactionConfigs: WriteTransactionConfig[];
  chunkedStorageHashes: string[];
  xmlMetadata: string;
} {
  const chunkedStorageHashes: string[] = [];
  const transactionConfigs: WriteTransactionConfig[] = [];

  // Store each XML chunk in ChunkedStorage
  for (const xmlChunk of params.xmlChunks) {
    // Compress and chunk the XML chunk into 20KB ChunkedStorage chunks
    const chunks = chunkDataForStorage(xmlChunk);

    // Generate storage key for this XML chunk's ChunkedStorage entry
    // This will be the key used in XML metadata to reference this XML chunk
    const chunkedHash = keccak256HashString(xmlChunk + params.operatorAddress);
    chunkedStorageHashes.push(chunkedHash);

    // Create ChunkedStorage transaction config
    const config = prepareChunkedStoragePut({
      key: chunkedHash,
      text: "",
      chunks,
      chainId: params.chainId,
    });

    transactionConfigs.push(config);
  }

  // Generate XML metadata pointing to ChunkedStorage hashes
  // Always include i="0" for initial storage (first version)
  const xmlMetadata = generateXmlMetadata(
    chunkedStorageHashes,
    0,
    params.operatorAddress
  );

  return {
    transactionConfigs,
    chunkedStorageHashes,
    xmlMetadata,
  };
}

