import { StorageClient } from "@net-protocol/storage";
import { hexToString } from "viem";
import type {
  StorageCheckResult,
  CheckNormalStorageExistsParams,
  CheckChunkedStorageExistsParams,
  CheckXmlChunksExistParams,
  CheckXmlMetadataExistsParams,
} from "../types";

/**
 * Check if normal storage data exists and matches content
 * Pure function - uses StorageClient, no side effects
 * Accepts JSON object as parameter
 */
export async function checkNormalStorageExists(
  params: CheckNormalStorageExistsParams
): Promise<StorageCheckResult> {
  const { storageClient, storageKey, operatorAddress, expectedContent } = params;
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
 * Accepts JSON object as parameter
 */
export async function checkChunkedStorageExists(
  params: CheckChunkedStorageExistsParams
): Promise<boolean> {
  const { storageClient, chunkedHash, operatorAddress } = params;
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
 * Accepts JSON object as parameter
 */
export async function checkXmlChunksExist(
  params: CheckXmlChunksExistParams
): Promise<Set<string>> {
  const { storageClient, chunkedHashes, operatorAddress } = params;
  const existing = new Set<string>();

  // Check each chunk in parallel for efficiency
  await Promise.all(
    chunkedHashes.map(async (hash) => {
      const exists = await checkChunkedStorageExists({
        storageClient,
        chunkedHash: hash,
        operatorAddress,
      });
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
 * Accepts JSON object as parameter
 */
export async function checkXmlMetadataExists(
  params: CheckXmlMetadataExistsParams
): Promise<StorageCheckResult> {
  const { storageClient, storageKey, operatorAddress, expectedMetadata } = params;
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

