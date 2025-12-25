import { StorageClient } from "@net-protocol/storage";
import { hexToString } from "viem";
import type { StorageCheckResult } from "./types";

/**
 * Check if normal storage data exists and matches content
 * Pure function - uses StorageClient, no side effects
 */
export async function checkNormalStorageExists(
  storageClient: StorageClient,
  storageKey: string,
  operatorAddress: string,
  expectedContent: string
): Promise<StorageCheckResult> {
  const existing = await storageClient.get({
    key: storageKey,
    operator: operatorAddress,
  });

  if (!existing) {
    return { exists: false };
  }

  // Compare content
  const storedContent = hexToString(existing.value as `0x${string}`);
  const matches = storedContent === expectedContent;

  return { exists: true, matches };
}

/**
 * Check if ChunkedStorage data exists
 * Pure function - uses StorageClient
 */
export async function checkChunkedStorageExists(
  storageClient: StorageClient,
  chunkedHash: string,
  operatorAddress: string
): Promise<boolean> {
  const meta = await storageClient.getChunkedMetadata({
    key: chunkedHash,
    operator: operatorAddress,
  });

  return meta !== null && meta.chunkCount > 0;
}

/**
 * Check which XML chunks already exist in ChunkedStorage
 * Returns Set of chunkedStorage hashes that exist
 * Pure function - uses StorageClient
 */
export async function checkXmlChunksExist(
  storageClient: StorageClient,
  chunkedHashes: string[],
  operatorAddress: string
): Promise<Set<string>> {
  const existing = new Set<string>();

  // Check each chunk in parallel for efficiency
  await Promise.all(
    chunkedHashes.map(async (hash) => {
      const exists = await checkChunkedStorageExists(
        storageClient,
        hash,
        operatorAddress
      );
      if (exists) {
        existing.add(hash);
      }
    })
  );

  return existing;
}

/**
 * Check if XML metadata exists and matches expected metadata
 * Pure function - uses StorageClient
 */
export async function checkXmlMetadataExists(
  storageClient: StorageClient,
  storageKey: string,
  operatorAddress: string,
  expectedMetadata: string
): Promise<StorageCheckResult> {
  const existing = await storageClient.get({
    key: storageKey,
    operator: operatorAddress,
  });

  if (!existing) {
    return { exists: false };
  }

  const storedMetadata = hexToString(existing.value as `0x${string}`);
  const matches = storedMetadata === expectedMetadata;

  return { exists: true, matches };
}
