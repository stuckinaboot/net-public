import { StorageClient } from "@net-protocol/storage";
import { hexToString } from "viem";
import { encodeStorageKeyForUrl } from "@net-protocol/storage";
import {
  checkNormalStorageExists,
  checkChunkedStorageExists,
  checkXmlMetadataExists,
} from "./storage/check";
import type { TransactionWithId } from "./types";

/**
 * Extract content string from transaction args
 * Helper to eliminate duplication of hexToString(tx.transaction.args[2]) pattern
 */
export function extractContentFromTransaction(
  tx: TransactionWithId
): string {
  const hex = tx.transaction.args[2] as string;
  return hexToString(hex as `0x${string}`);
}

/**
 * Generate storage URL for displaying to user
 * Centralizes URL generation logic
 */
export function generateStorageUrl(
  operatorAddress: string | undefined,
  chainId: number,
  storageKey: string
): string | undefined {
  if (!operatorAddress) return undefined;
  return `https://storedon.net/net/${chainId}/storage/load/${
    operatorAddress
  }/${encodeStorageKeyForUrl(storageKey)}`;
}

/**
 * Check if a transaction's data already exists (idempotency check)
 * Consolidates existence check logic used in both filtering and sending
 */
export async function checkTransactionExists(
  storageClient: StorageClient,
  tx: TransactionWithId,
  operatorAddress: string
): Promise<boolean> {
  if (tx.type === "normal") {
    // Extract expected content from transaction args
    const expectedContent = extractContentFromTransaction(tx);
    const check = await checkNormalStorageExists(
      storageClient,
      tx.id,
      operatorAddress,
      expectedContent
    );
    return check.exists && check.matches === true;
  } else if (tx.type === "chunked") {
    // ChunkedStorage: hash existence = content match (deterministic hash)
    return await checkChunkedStorageExists(
      storageClient,
      tx.id,
      operatorAddress
    );
  } else if (tx.type === "metadata") {
    // XML metadata: extract and compare content
    const expectedMetadata = extractContentFromTransaction(tx);
    const check = await checkXmlMetadataExists(
      storageClient,
      tx.id,
      operatorAddress,
      expectedMetadata
    );
    return check.exists && check.matches === true;
  }
  return false;
}

