import * as fs from "fs";
import { privateKeyToAccount } from "viem/accounts";
import { StorageClient } from "@net-protocol/storage";
import { parseReadOnlyOptions, parseCommonOptions } from "../../../cli/shared";
import { encodeTransaction } from "../../../shared/encode";
import type { EncodedTransaction } from "../../../shared/types";

export interface StorageEncodeOptions {
  filePath: string;
  storageKey: string;
  text: string;
  privateKey?: string;
  address?: string;
  chainId?: number;
  rpcUrl?: string;
  chunkSize?: number;
}

interface EncodedStorageResult {
  storageKey: string;
  storageType: "normal" | "xml";
  operatorAddress: string;
  transactions: EncodedTransaction[];
  topLevelHash?: string;
}

const XML_STORAGE_THRESHOLD = 20 * 1024; // 20KB

/**
 * Encode storage upload transactions without executing them
 */
export async function encodeStorageUpload(
  options: StorageEncodeOptions
): Promise<EncodedStorageResult> {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  // Get operator address from private key, --address flag, or default to zero address
  let operatorAddress: `0x${string}`;
  if (options.privateKey) {
    const account = privateKeyToAccount(options.privateKey as `0x${string}`);
    operatorAddress = account.address;
  } else if (options.address) {
    operatorAddress = options.address as `0x${string}`;
  } else {
    // Use a zero address placeholder when no private key or address is provided
    operatorAddress = "0x0000000000000000000000000000000000000000";
  }

  // Read file
  const fileContent = fs.readFileSync(options.filePath, "utf-8");
  const fileSize = Buffer.byteLength(fileContent, "utf-8");

  const client = new StorageClient({
    chainId: readOnlyOptions.chainId,
  });

  // Determine storage type based on size
  const useXmlStorage = fileSize > XML_STORAGE_THRESHOLD;

  if (useXmlStorage) {
    // XML Storage - multiple transactions
    const { transactionConfigs, topLevelHash, metadata } =
      client.prepareXmlStorage({
        data: fileContent,
        operatorAddress,
        storageKey: options.storageKey,
        filename: options.text,
        chunkSize: options.chunkSize,
      });

    const encodedTransactions = transactionConfigs.map((config) =>
      encodeTransaction(config, readOnlyOptions.chainId)
    );

    return {
      storageKey: options.storageKey,
      storageType: "xml",
      operatorAddress,
      transactions: encodedTransactions,
      topLevelHash,
    };
  } else {
    // Normal Storage - single transaction
    const config = client.preparePut({
      key: options.storageKey,
      text: options.text,
      value: fileContent,
    });

    const encodedTransaction = encodeTransaction(
      config,
      readOnlyOptions.chainId
    );

    return {
      storageKey: options.storageKey,
      storageType: "normal",
      operatorAddress,
      transactions: [encodedTransaction],
    };
  }
}
