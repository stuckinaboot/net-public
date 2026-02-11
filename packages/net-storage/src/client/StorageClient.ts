import { PublicClient, hexToString, decodeAbiParameters } from "viem";
import { readContract } from "viem/actions";
import { getPublicClient, getNetContract } from "@net-protocol/core";
import {
  getStorageReadConfig,
  getStorageValueAtIndexReadConfig,
  getStorageTotalWritesReadConfig,
  getStorageBulkGetReadConfig,
  getStorageRouterReadConfig,
} from "./storage";
import {
  getChunkedStorageMetadataReadConfig,
  getChunkedStorageChunksReadConfig,
  getChunkedStorageTotalWritesReadConfig,
} from "./chunkedStorage";
import { assembleChunks } from "../utils/chunkUtils";
import {
  resolveXmlRecursive,
  fetchChunksWithSourceSupport,
  fetchXmlChunksFromChunkedStorage,
} from "./xmlStorage";
import { parseNetReferences, containsXmlReferences } from "../utils/xmlUtils";
import { getStorageKeyBytes } from "../utils/keyUtils";
import {
  STORAGE_CONTRACT,
  CHUNKED_STORAGE_CONTRACT,
  CHUNKED_STORAGE_READER_CONTRACT,
  STORAGE_ROUTER_CONTRACT,
} from "../constants";
import type {
  StorageData,
  BulkStorageKey,
  BulkStorageResult,
  StorageClientOptions,
} from "../types";
import type { WriteTransactionConfig } from "@net-protocol/core";
import { normalizeDataOrEmpty } from "@net-protocol/core";
import { keccak256HashString } from "@net-protocol/core";
import {
  processDataForStorage,
  generateXmlMetadata,
} from "../utils/writingUtils";
import { chunkDataForStorage } from "../utils/chunkUtils";

/**
 * StorageClient - Client for interacting with Net protocol storage
 *
 * **Pattern for client methods:**
 * - Client methods never require `chainId` in their parameters
 * - All methods use `this.chainId` internally (set during construction)
 * - Config builders receive `chainId` as a separate required parameter
 * - This ensures consistency: the client's `chainId` is the single source of truth
 */
export class StorageClient {
  private client: PublicClient;
  private chainId: number;

  constructor(params: StorageClientOptions) {
    this.client = getPublicClient({
      chainId: params.chainId,
      rpcUrl: params.overrides?.rpcUrls,
    });
    this.chainId = params.chainId;
  }

  /**
   * Get storage value for a key and operator (latest version)
   */
  async get(params: {
    key: string;
    operator: string;
    keyFormat?: "raw" | "bytes32";
  }): Promise<StorageData | null> {
    const config = getStorageReadConfig({
      chainId: this.chainId,
      key: params.key,
      operator: params.operator,
      keyFormat: params.keyFormat,
    });

    try {
      const result = (await readContract(this.client, config)) as [
        string,
        string
      ];
      const [text, value] = result;
      return { text, value };
    } catch {
      return null;
    }
  }

  /**
   * Get storage value at a specific historical index
   */
  async getValueAtIndex(params: {
    key: string;
    operator: string;
    index: number;
    keyFormat?: "raw" | "bytes32";
  }): Promise<StorageData | null> {
    const config = getStorageValueAtIndexReadConfig({
      chainId: this.chainId,
      key: params.key,
      operator: params.operator,
      index: params.index,
      keyFormat: params.keyFormat,
    });

    try {
      const result = (await readContract(this.client, config)) as [
        string,
        string
      ];
      const [text, value] = result;
      return { text, value };
    } catch {
      return null;
    }
  }

  /**
   * Get total number of writes (versions) for a key-operator pair
   * Tries ChunkedStorageReader first, then Storage
   */
  async getTotalWrites(params: {
    key: string;
    operator: string;
    keyFormat?: "raw" | "bytes32";
  }): Promise<number> {
    // Try ChunkedStorageReader first
    try {
      const config = getChunkedStorageTotalWritesReadConfig({
        chainId: this.chainId,
        key: params.key,
        operator: params.operator,
        keyFormat: params.keyFormat,
      });
      const count = await readContract(this.client, config);
      return Number(count);
    } catch {
      // Fall back to Storage
      try {
        const config = getStorageTotalWritesReadConfig({
          chainId: this.chainId,
          key: params.key,
          operator: params.operator,
          keyFormat: params.keyFormat,
        });
        const count = await readContract(this.client, config);
        return Number(count);
      } catch {
        return 0;
      }
    }
  }

  /**
   * Bulk get storage values
   */
  async bulkGet(params: {
    keys: BulkStorageKey[];
    safe?: boolean;
    keyFormat?: "raw" | "bytes32";
  }): Promise<BulkStorageResult[]> {
    const config = getStorageBulkGetReadConfig({
      chainId: this.chainId,
      keys: params.keys,
      safe: params.safe,
      keyFormat: params.keyFormat,
    });

    try {
      const results = await readContract(this.client, config);
      return (results as any[]).map((r) => ({
        text: r[0],
        value: r[1],
      })) as BulkStorageResult[];
    } catch {
      return [];
    }
  }

  /**
   * Get storage value via StorageRouter (latest version)
   * Returns data with storage type indication
   */
  async getViaRouter(params: {
    key: string;
    operator: string;
    keyFormat?: "raw" | "bytes32";
  }): Promise<{
    isChunkedStorage: boolean;
    text: string;
    data: string;
  } | null> {
    const config = getStorageRouterReadConfig({
      chainId: this.chainId,
      key: params.key,
      operator: params.operator,
      keyFormat: params.keyFormat,
    });

    try {
      const result = await readContract(this.client, config);
      const [isChunkedStorage, text, data] = result as [
        boolean,
        string,
        `0x${string}`
      ];

      // If chunked, decode chunk count and return assembled data
      if (isChunkedStorage) {
        const [chunkCount] = decodeAbiParameters([{ type: "uint8" }], data);
        if (chunkCount === 0) {
          return { isChunkedStorage: true, text, data: "" };
        }

        // Fetch and assemble chunks
        const chunks = await this.getChunked({
          key: params.key,
          operator: params.operator,
          start: 0,
          end: Number(chunkCount),
          keyFormat: params.keyFormat,
        });

        const assembled = assembleChunks(chunks);
        return {
          isChunkedStorage: true,
          text,
          data: assembled || "",
        };
      }

      // Regular storage
      return {
        isChunkedStorage: false,
        text,
        data: hexToString(data),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get chunked storage metadata
   */
  async getChunkedMetadata(params: {
    key: string;
    operator: string;
    index?: number;
    keyFormat?: "raw" | "bytes32";
  }): Promise<{ chunkCount: number; originalText: string } | null> {
    const config = getChunkedStorageMetadataReadConfig({
      chainId: this.chainId,
      key: params.key,
      operator: params.operator,
      index: params.index,
      keyFormat: params.keyFormat,
    });

    try {
      const result = await readContract(this.client, config);
      const [chunkCount, originalText] = result as [number, string];
      return { chunkCount, originalText };
    } catch {
      return null;
    }
  }

  /**
   * Get chunked storage chunks
   */
  async getChunked(params: {
    key: string;
    operator: string;
    start: number;
    end: number;
    index?: number;
    keyFormat?: "raw" | "bytes32";
  }): Promise<string[]> {
    const config = getChunkedStorageChunksReadConfig({
      chainId: this.chainId,
      key: params.key,
      operator: params.operator,
      start: params.start,
      end: params.end,
      index: params.index,
      keyFormat: params.keyFormat,
    });

    try {
      const chunks = await readContract(this.client, config);
      return chunks as string[];
    } catch {
      return [];
    }
  }

  /**
   * Get chunked storage at a specific historical index
   */
  async getChunkedAtIndex(params: {
    key: string;
    operator: string;
    start: number;
    end: number;
    index: number;
  }): Promise<string[]> {
    return this.getChunked({
      ...params,
      index: params.index,
    });
  }

  /**
   * Get all storage keys for an operator using Net contract
   */
  async getForOperator(params: {
    operator: string;
  }): Promise<Array<[string, string, number, string]>> {
    const netContract = getNetContract(this.chainId);

    // Get total count
    const totalCount = await readContract(this.client, {
      abi: netContract.abi,
      address: netContract.address,
      functionName: "getTotalMessagesForAppUserCount",
      args: [STORAGE_CONTRACT.address, params.operator],
    });

    const totalCountNumber = Number(totalCount);

    if (totalCountNumber === 0) {
      return [];
    }

    // Get all messages
    const messages = await readContract(this.client, {
      abi: netContract.abi,
      address: netContract.address,
      functionName: "getMessagesInRangeForAppUser",
      args: [0, totalCountNumber, STORAGE_CONTRACT.address, params.operator],
    });

    return (messages as any[]).map((msg) => [
      msg.topic,
      msg.text,
      Number(msg.timestamp),
      msg.data,
    ]);
  }

  /**
   * Get storage value for operator and key
   */
  async getForOperatorAndKey(params: {
    operator: string;
    key: string;
    keyFormat?: "raw" | "bytes32";
  }): Promise<StorageData | null> {
    const storageKeyBytes = getStorageKeyBytes(
      params.key,
      params.keyFormat
    ) as `0x${string}`;

    try {
      const result = (await readContract(this.client, {
        abi: STORAGE_CONTRACT.abi,
        address: STORAGE_CONTRACT.address,
        functionName: "getForOperatorAndKey",
        args: [params.operator, storageKeyBytes],
      })) as [string, string];
      const [text, value] = result;
      return { text, value };
    } catch {
      return null;
    }
  }

  /**
   * Read storage data with XML resolution
   */
  async readStorageData(params: {
    key: string;
    operator: string;
    index?: number;
    keyFormat?: "raw" | "bytes32";
  }): Promise<{ text: string; data: string; isXml: boolean }> {
    // Get data via router (latest) or direct (historical)
    let text: string;
    let data: string;
    let isChunkedStorage: boolean;

    if (params.index !== undefined) {
      // Historical: try chunked first, then regular
      const chunkedMeta = await this.getChunkedMetadata({
        key: params.key,
        operator: params.operator,
        index: params.index,
        keyFormat: params.keyFormat,
      });

      if (chunkedMeta && chunkedMeta.chunkCount > 0) {
        isChunkedStorage = true;
        text = chunkedMeta.originalText;
        const chunks = await this.getChunked({
          key: params.key,
          operator: params.operator,
          start: 0,
          end: chunkedMeta.chunkCount,
          index: params.index,
          keyFormat: params.keyFormat,
        });
        const assembled = assembleChunks(chunks);
        data = assembled || "";
      } else {
        // Try regular storage
        const result = await this.getValueAtIndex({
          key: params.key,
          operator: params.operator,
          index: params.index,
          keyFormat: params.keyFormat,
        });
        if (!result) {
          throw new Error("StoredDataNotFound");
        }
        isChunkedStorage = false;
        const resultObj = result as StorageData;
        text = resultObj.text;
        data = hexToString(resultObj.value as `0x${string}`);
      }
    } else {
      // Latest: use router
      const result = await this.getViaRouter({
        key: params.key,
        operator: params.operator,
        keyFormat: params.keyFormat,
      });
      if (!result) {
        throw new Error("StoredDataNotFound");
      }
      isChunkedStorage = result.isChunkedStorage;
      text = result.text;
      data = result.data;
    }

    // Resolve XML if needed
    const isXml = containsXmlReferences(data);
    if (isXml) {
      const resolvedData = await resolveXmlRecursive(
        data,
        params.operator,
        this.client,
        3, // MAX_XML_DEPTH
        new Set()
      );
      return { text, data: resolvedData, isXml: true };
    }

    return { text, data, isXml: false };
  }

  /**
   * Read chunked storage data with decompression
   */
  async readChunkedStorage(params: {
    key: string;
    operator: string;
    index?: number;
    keyFormat?: "raw" | "bytes32";
  }): Promise<{ text: string; data: string }> {
    const metadata = await this.getChunkedMetadata({
      key: params.key,
      operator: params.operator,
      index: params.index,
      keyFormat: params.keyFormat,
    });

    if (!metadata) {
      throw new Error("ChunkedStorage metadata not found");
    }

    if (metadata.chunkCount === 0) {
      return { text: metadata.originalText, data: "" };
    }

    const chunks = await this.getChunked({
      key: params.key,
      operator: params.operator,
      start: 0,
      end: metadata.chunkCount,
      index: params.index,
      keyFormat: params.keyFormat,
    });

    const assembled = assembleChunks(chunks);
    return {
      text: metadata.originalText,
      data: assembled || "",
    };
  }

  /**
   * Validate storage parameters
   */
  private validateStorageParams(params: {
    key: string | `0x${string}`;
    chunks?: string[];
  }) {
    if (
      !params.key ||
      (typeof params.key === "string" && params.key.length === 0)
    ) {
      throw new Error("Storage key cannot be empty");
    }

    if (params.chunks && params.chunks.length === 0) {
      throw new Error("Chunks array cannot be empty");
    }

    if (params.chunks && params.chunks.length > 255) {
      throw new Error(
        `Too many chunks: ${params.chunks.length} exceeds maximum of 255`
      );
    }
  }

  /**
   * Prepare transaction configs for storing XML chunks in ChunkedStorage backend.
   * Each XML chunk is compressed and chunked into 20KB ChunkedStorage chunks.
   */
  private prepareXmlChunksForChunkedStorage(params: {
    xmlChunks: string[];
    operatorAddress: `0x${string}`;
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
      // Note: Hash is content-based only (no operator) - ChunkedStorage handles operator namespace internally
      const chunkedHash = keccak256HashString(xmlChunk);
      chunkedStorageHashes.push(chunkedHash);

      // Create ChunkedStorage transaction config
      const config = this.prepareChunkedPut({
        key: chunkedHash,
        text: "",
        chunks,
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

  /**
   * Prepare transaction config for storing a single value in Storage contract.
   */
  preparePut(params: {
    key: string | `0x${string}`;
    text: string;
    value: string | `0x${string}`;
    keyFormat?: "raw" | "bytes32";
  }): WriteTransactionConfig {
    this.validateStorageParams({ key: params.key });

    const keyBytes32 = getStorageKeyBytes(
      params.key,
      params.keyFormat
    ) as `0x${string}`;
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
  prepareChunkedPut(params: {
    key: string | `0x${string}`;
    text: string;
    chunks: string[];
    keyFormat?: "raw" | "bytes32";
  }): WriteTransactionConfig {
    this.validateStorageParams({ key: params.key, chunks: params.chunks });

    const keyBytes32 = getStorageKeyBytes(
      params.key,
      params.keyFormat
    ) as `0x${string}`;

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
  prepareBulkPut(params: {
    entries: Array<{
      key: string | `0x${string}`;
      text: string;
      value: string | `0x${string}`;
    }>;
    keyFormat?: "raw" | "bytes32";
  }): WriteTransactionConfig {
    if (params.entries.length === 0) {
      throw new Error("Entries array cannot be empty");
    }

    // Convert all entries
    const bulkEntries = params.entries.map((entry) => {
      this.validateStorageParams({ key: entry.key });
      const keyBytes32 = getStorageKeyBytes(
        entry.key,
        params.keyFormat
      ) as `0x${string}`;
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
  prepareXmlStorage(params: {
    data: string;
    operatorAddress: `0x${string}`;
    storageKey?: string | `0x${string}`;
    filename?: string;
    useChunkedStorageBackend?: boolean; // Default: true
    keyFormat?: "raw" | "bytes32";
    chunkSize?: number; // Size of each data chunk before compression (default: 80KB)
  }): {
    transactionConfigs: WriteTransactionConfig[];
    topLevelHash: string;
    metadata: string;
  } {
    // Process data: chunk it and generate hashes
    const result = processDataForStorage(
      params.data,
      params.operatorAddress,
      params.storageKey,
      params.chunkSize
    );

    if (!result.valid) {
      throw new Error(result.error || "Failed to process data for storage");
    }

    // Use ChunkedStorage backend by default
    const useChunkedStorageBackend = params.useChunkedStorageBackend !== false;

    if (useChunkedStorageBackend) {
      // Prepare XML chunks for ChunkedStorage backend
      const chunkedResult = this.prepareXmlChunksForChunkedStorage({
        xmlChunks: result.chunks,
        operatorAddress: params.operatorAddress,
      });

      // Create metadata transaction (Storage.put with XML metadata)
      const metadataConfig = this.preparePut({
        key: result.topLevelHash,
        text: params.filename || "",
        value: chunkedResult.xmlMetadata,
        keyFormat: params.keyFormat,
      });

      // Combine transactions: metadata first, then chunk transactions
      return {
        transactionConfigs: [
          metadataConfig,
          ...chunkedResult.transactionConfigs,
        ],
        topLevelHash: result.topLevelHash,
        metadata: chunkedResult.xmlMetadata,
      };
    } else {
      // Legacy mode: store XML chunks directly in Storage
      // This is not commonly used but kept for backward compatibility
      const chunkConfigs: WriteTransactionConfig[] = result.chunkHashes.map(
        (hash, index) =>
          this.preparePut({
            key: hash,
            text: "",
            value: result.chunks[index],
            keyFormat: params.keyFormat,
          })
      );

      // Create metadata transaction
      const metadataConfig = this.preparePut({
        key: result.topLevelHash,
        text: params.filename || "",
        value: result.xmlMetadata,
        keyFormat: params.keyFormat,
      });

      return {
        transactionConfigs: [metadataConfig, ...chunkConfigs],
        topLevelHash: result.topLevelHash,
        metadata: result.xmlMetadata,
      };
    }
  }
}
