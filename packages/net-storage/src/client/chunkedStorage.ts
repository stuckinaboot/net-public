import { CHUNKED_STORAGE_READER_CONTRACT } from "../constants";
import { getStorageKeyBytes } from "../utils/keyUtils";

export interface GetChunkedStorageMetadataOptions {
  chainId: number;
  key: string;
  operator: string;
  index?: number;
}

export interface GetChunkedStorageChunksOptions {
  chainId: number;
  key: string;
  operator: string;
  start: number;
  end: number;
  index?: number;
}

export interface GetChunkedStorageTotalWritesOptions {
  chainId: number;
  key: string;
  operator: string;
}

/**
 * Build contract read config for ChunkedStorageReader.getMetadata() or getMetadataAtIndex()
 */
export function getChunkedStorageMetadataReadConfig(
  params: GetChunkedStorageMetadataOptions
) {
  const { chainId, key, operator, index } = params;
  const storageKeyBytes = getStorageKeyBytes(key) as `0x${string}`;

  const functionName = index !== undefined ? "getMetadataAtIndex" : "getMetadata";
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
  params: GetChunkedStorageChunksOptions
) {
  const { chainId, key, operator, start, end, index } = params;
  const storageKeyBytes = getStorageKeyBytes(key) as `0x${string}`;

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
  params: GetChunkedStorageTotalWritesOptions
) {
  const { chainId, key, operator } = params;
  const storageKeyBytes = getStorageKeyBytes(key) as `0x${string}`;

  return {
    abi: CHUNKED_STORAGE_READER_CONTRACT.abi,
    address: CHUNKED_STORAGE_READER_CONTRACT.address,
    functionName: "getTotalWrites" as const,
    args: [storageKeyBytes, operator],
    chainId,
  };
}

