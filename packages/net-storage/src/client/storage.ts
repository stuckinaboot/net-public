import {
  STORAGE_CONTRACT,
  SAFE_STORAGE_READER_CONTRACT,
  STORAGE_ROUTER_CONTRACT,
} from "../constants";
import { getStorageKeyBytes } from "../utils/keyUtils";
import type { Abi } from "viem";

export interface GetStorageOptions {
  chainId: number;
  key: string;
  operator: string;
}

export interface GetStorageValueAtIndexOptions {
  chainId: number;
  key: string;
  operator: string;
  index: number;
}

export interface GetStorageTotalWritesOptions {
  chainId: number;
  key: string;
  operator: string;
}

export interface GetStorageBulkGetOptions {
  chainId: number;
  keys: Array<{ key: string; operator: string }>;
  safe?: boolean;
}

export interface GetStorageRouterOptions {
  chainId: number;
  key: string;
  operator: string;
}

/**
 * Build contract read config for Storage.get()
 */
export function getStorageReadConfig(params: GetStorageOptions) {
  const { chainId, key, operator } = params;
  const storageKeyBytes = getStorageKeyBytes(key) as `0x${string}`;

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
  params: GetStorageValueAtIndexOptions
) {
  const { chainId, key, operator, index } = params;
  const storageKeyBytes = getStorageKeyBytes(key) as `0x${string}`;

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
  params: GetStorageTotalWritesOptions
) {
  const { chainId, key, operator } = params;
  const storageKeyBytes = getStorageKeyBytes(key) as `0x${string}`;

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
export function getStorageBulkGetReadConfig(params: GetStorageBulkGetOptions) {
  const { chainId, keys, safe = false } = params;
  const contract = safe ? SAFE_STORAGE_READER_CONTRACT : STORAGE_CONTRACT;

  // Convert keys to bytes32 format
  const bulkKeys = keys.map((k) => ({
    key: getStorageKeyBytes(k.key) as `0x${string}`,
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
export function getStorageRouterReadConfig(params: GetStorageRouterOptions) {
  const { chainId, key, operator } = params;
  const storageKeyBytes = getStorageKeyBytes(key) as `0x${string}`;

  return {
    abi: STORAGE_ROUTER_CONTRACT.abi,
    address: STORAGE_ROUTER_CONTRACT.address,
    functionName: "get" as const,
    args: [storageKeyBytes, operator],
    chainId,
  };
}

