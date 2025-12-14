import {
  STORAGE_CONTRACT,
  SAFE_STORAGE_READER_CONTRACT,
  STORAGE_ROUTER_CONTRACT,
} from "../constants";
import { getStorageKeyBytes } from "../utils/keyUtils";
import type { Abi } from "viem";

// Internal config builder types (chainId required separately)
export interface GetStorageReadConfigParams {
  chainId: number;
  key: string;
  operator: string;
  keyFormat?: "raw" | "bytes32";
}

export interface GetStorageValueAtIndexReadConfigParams {
  chainId: number;
  key: string;
  operator: string;
  index: number;
  keyFormat?: "raw" | "bytes32";
}

export interface GetStorageTotalWritesReadConfigParams {
  chainId: number;
  key: string;
  operator: string;
  keyFormat?: "raw" | "bytes32";
}

export interface GetStorageBulkGetReadConfigParams {
  chainId: number;
  keys: Array<{ key: string; operator: string; keyFormat?: "raw" | "bytes32" }>;
  safe?: boolean;
  keyFormat?: "raw" | "bytes32";
}

export interface GetStorageRouterReadConfigParams {
  chainId: number;
  key: string;
  operator: string;
  keyFormat?: "raw" | "bytes32";
}

// Legacy types for backward compatibility (deprecated, use ReadConfigParams types)
export interface GetStorageOptions extends GetStorageReadConfigParams {}
export interface GetStorageValueAtIndexOptions extends GetStorageValueAtIndexReadConfigParams {}
export interface GetStorageTotalWritesOptions extends GetStorageTotalWritesReadConfigParams {}
export interface GetStorageBulkGetOptions extends GetStorageBulkGetReadConfigParams {}
export interface GetStorageRouterOptions extends GetStorageRouterReadConfigParams {}

/**
 * Build contract read config for Storage.get()
 */
export function getStorageReadConfig(params: GetStorageReadConfigParams) {
  const { chainId, key, operator, keyFormat } = params;
  const storageKeyBytes = getStorageKeyBytes(key, keyFormat) as `0x${string}`;

  return {
    abi: STORAGE_CONTRACT.abi,
    address: STORAGE_CONTRACT.address,
    functionName: "get" as const,
    args: [storageKeyBytes, operator],
    chainId,
  };
}

/**
 * Build contract read config for Storage.getValueAtIndex()
 */
export function getStorageValueAtIndexReadConfig(
  params: GetStorageValueAtIndexReadConfigParams
) {
  const { chainId, key, operator, index, keyFormat } = params;
  const storageKeyBytes = getStorageKeyBytes(key, keyFormat) as `0x${string}`;

  return {
    abi: STORAGE_CONTRACT.abi,
    address: STORAGE_CONTRACT.address,
    functionName: "getValueAtIndex" as const,
    args: [storageKeyBytes, operator, index],
    chainId,
  };
}

/**
 * Build contract read config for Storage.getTotalWrites()
 */
export function getStorageTotalWritesReadConfig(
  params: GetStorageTotalWritesReadConfigParams
) {
  const { chainId, key, operator, keyFormat } = params;
  const storageKeyBytes = getStorageKeyBytes(key, keyFormat) as `0x${string}`;

  return {
    abi: STORAGE_CONTRACT.abi,
    address: STORAGE_CONTRACT.address,
    functionName: "getTotalWrites" as const,
    args: [storageKeyBytes, operator],
    chainId,
  };
}

/**
 * Build contract read config for Storage.bulkGet()
 */
export function getStorageBulkGetReadConfig(params: GetStorageBulkGetReadConfigParams) {
  const { chainId, keys, safe = false, keyFormat } = params;
  const contract = safe ? SAFE_STORAGE_READER_CONTRACT : STORAGE_CONTRACT;

  // Convert keys to bytes32 format (use individual keyFormat or fallback to global keyFormat)
  const bulkKeys = keys.map((k) => ({
    key: getStorageKeyBytes(k.key, k.keyFormat ?? keyFormat) as `0x${string}`,
    operator: k.operator as `0x${string}`,
  }));

  return {
    abi: contract.abi,
    address: contract.address,
    functionName: "bulkGet" as const,
    args: [bulkKeys],
    chainId,
  };
}

/**
 * Build contract read config for StorageRouter.get()
 */
export function getStorageRouterReadConfig(params: GetStorageRouterReadConfigParams) {
  const { chainId, key, operator, keyFormat } = params;
  const storageKeyBytes = getStorageKeyBytes(key, keyFormat) as `0x${string}`;

  return {
    abi: STORAGE_ROUTER_CONTRACT.abi,
    address: STORAGE_ROUTER_CONTRACT.address,
    functionName: "get" as const,
    args: [storageKeyBytes, operator],
    chainId,
  };
}
