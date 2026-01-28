import { StorageClient } from "@net-protocol/storage";
import { hexToString } from "viem";
import { encodeStorageKeyForUrl } from "@net-protocol/storage";
import { WriteTransactionConfig } from "@net-protocol/core";
import {
  checkNormalStorageExists,
  checkChunkedStorageExists,
  checkXmlMetadataExists,
} from "./storage/check";
import type {
  TransactionWithId,
  StorageTransactionArgs,
  CheckTransactionExistsParams,
} from "./types";

/**
 * Convert typed args to array (for viem compatibility)
 */
export function typedArgsToArray(
  args: StorageTransactionArgs
): readonly unknown[] {
  if (args.type === "normal" || args.type === "metadata") {
    return [args.args.key, args.args.text, args.args.value];
  } else {
    return [args.args.hash, args.args.text, args.args.chunks];
  }
}

/**
 * Extract typed args from WriteTransactionConfig
 */
export function extractTypedArgsFromTransaction(
  tx: WriteTransactionConfig,
  type: "normal" | "chunked" | "metadata"
): StorageTransactionArgs {
  if (type === "normal" || type === "metadata") {
    return {
      type,
      args: {
        key: tx.args[0] as `0x${string}`,
        text: tx.args[1] as string,
        value: tx.args[2] as `0x${string}`,
      },
    };
  } else {
    return {
      type: "chunked",
      args: {
        hash: tx.args[0] as `0x${string}`,
        text: tx.args[1] as string,
        chunks: tx.args[2] as `0x${string}`[],
      },
    };
  }
}

/**
 * Extract content string from transaction typed args
 * Helper to eliminate duplication of hexToString pattern
 */
export function extractContentFromTransaction(
  tx: TransactionWithId
): string {
  if (tx.typedArgs.type === "normal" || tx.typedArgs.type === "metadata") {
    return hexToString(tx.typedArgs.args.value);
  } else {
    // For chunked transactions, return empty string (no content to extract)
    return "";
  }
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
 * Accepts JSON object as parameter
 */
export async function checkTransactionExists(
  params: CheckTransactionExistsParams
): Promise<boolean> {
  const { storageClient, tx, operatorAddress } = params;
  if (tx.type === "normal") {
    // Extract expected content from typed args
    if (tx.typedArgs.type === "normal") {
      const expectedContent = hexToString(tx.typedArgs.args.value);
      const check = await checkNormalStorageExists({
        storageClient,
        storageKey: tx.id,
        operatorAddress,
        expectedContent,
      });
      return check.exists && check.matches === true;
    }
  } else if (tx.type === "chunked") {
    // ChunkedStorage: hash existence = content match (deterministic hash)
    return await checkChunkedStorageExists({
      storageClient,
      chunkedHash: tx.id,
      operatorAddress,
    });
  } else if (tx.type === "metadata") {
    // XML metadata: extract and compare content
    if (tx.typedArgs.type === "metadata") {
      const expectedMetadata = hexToString(tx.typedArgs.args.value);
      const check = await checkXmlMetadataExists({
        storageClient,
        storageKey: tx.id,
        operatorAddress,
        expectedMetadata,
      });
      return check.exists && check.matches === true;
    }
  }
  return false;
}

