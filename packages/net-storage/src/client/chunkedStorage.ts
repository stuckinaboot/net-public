import { CHUNKED_STORAGE_READER_CONTRACT } from "../constants";
import { getStorageKeyBytes } from "../utils/keyUtils";

// Internal config builder types (chainId required separately)
export interface GetChunkedStorageMetadataReadConfigParams {
  chainId: number;
  key: string;
  operator: string;
  index?: number;
  keyFormat?: "raw" | "bytes32";
}

export interface GetChunkedStorageChunksReadConfigParams {
  chainId: number;
  key: string;
  operator: string;
  start: number;
  end: number;
  index?: number;
  keyFormat?: "raw" | "bytes32";
}

export interface GetChunkedStorageTotalWritesReadConfigParams {
  chainId: number;
  key: string;
  operator: string;
  keyFormat?: "raw" | "bytes32";
}

// Legacy types for backward compatibility (deprecated, use ReadConfigParams types)
export interface GetChunkedStorageMetadataOptions extends GetChunkedStorageMetadataReadConfigParams {}
export interface GetChunkedStorageChunksOptions extends GetChunkedStorageChunksReadConfigParams {}
export interface GetChunkedStorageTotalWritesOptions extends GetChunkedStorageTotalWritesReadConfigParams {}

/**
 * Build contract read config for ChunkedStorageReader.getMetadata() or getMetadataAtIndex()
 */
export function getChunkedStorageMetadataReadConfig(
  params: GetChunkedStorageMetadataReadConfigParams
) {
  const { chainId, key, operator, index, keyFormat } = params;
  const storageKeyBytes = getStorageKeyBytes(key, keyFormat) as `0x${string}`;

  const functionName =
    index !== undefined ? "getMetadataAtIndex" : "getMetadata";
  const args =
    index !== undefined
      ? [storageKeyBytes, operator, index]
      : [storageKeyBytes, operator];

  return {
    abi: CHUNKED_STORAGE_READER_CONTRACT.abi,
    address: CHUNKED_STORAGE_READER_CONTRACT.address,
    functionName: functionName as "getMetadata" | "getMetadataAtIndex",
    args,
    chainId,
  };
}

/**
 * Build contract read config for ChunkedStorageReader.getChunks() or getChunksAtIndex()
 */
export function getChunkedStorageChunksReadConfig(
  params: GetChunkedStorageChunksReadConfigParams
) {
  const { chainId, key, operator, start, end, index, keyFormat } = params;
  const storageKeyBytes = getStorageKeyBytes(key, keyFormat) as `0x${string}`;

  const functionName = index !== undefined ? "getChunksAtIndex" : "getChunks";
  const args =
    index !== undefined
      ? [storageKeyBytes, operator, start, end, index]
      : [storageKeyBytes, operator, start, end];

  return {
    abi: CHUNKED_STORAGE_READER_CONTRACT.abi,
    address: CHUNKED_STORAGE_READER_CONTRACT.address,
    functionName: functionName as "getChunks" | "getChunksAtIndex",
    args,
    chainId,
  };
}

/**
 * Build contract read config for ChunkedStorageReader.getTotalWrites()
 */
export function getChunkedStorageTotalWritesReadConfig(
  params: GetChunkedStorageTotalWritesReadConfigParams
) {
  const { chainId, key, operator, keyFormat } = params;
  const storageKeyBytes = getStorageKeyBytes(key, keyFormat) as `0x${string}`;

  return {
    abi: CHUNKED_STORAGE_READER_CONTRACT.abi,
    address: CHUNKED_STORAGE_READER_CONTRACT.address,
    functionName: "getTotalWrites" as const,
    args: [storageKeyBytes, operator],
    chainId,
  };
}
