import { vi, type MockedFunction } from "vitest";
import { stringToHex } from "viem";
import { getStorageKeyBytes } from "@net-protocol/storage";
import type { WalletClient, PublicClient, TransactionReceipt } from "viem";
import type { StorageClient } from "@net-protocol/storage";
import type { StorageData, ChunkedMetadata } from "@net-protocol/storage";
import type {
  TransactionWithId,
  UploadResult,
  StorageTransactionArgs,
  NormalStorageArgs,
  ChunkedStorageArgs,
  MetadataStorageArgs,
} from "../../../commands/storage/types";

// Test constants
export const TEST_CHAIN_ID = 8453;
export const TEST_RPC_URL = "https://base-mainnet.public.blastapi.io";
export const TEST_OPERATOR =
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" as `0x${string}`;
export const TEST_PRIVATE_KEY = ("0x" + "1".repeat(64)) as `0x${string}`;
export const TEST_STORAGE_KEY = "test-key";
export const TEST_STORAGE_KEY_BYTES = ("0x" + "a".repeat(64)) as `0x${string}`;
export const TEST_CONTENT_SMALL = "Hello, Net Storage!"; // < 20KB
export const TEST_CONTENT_LARGE = "a".repeat(25 * 1000); // > 20KB
export const TEST_FILENAME = "test-file.txt";

// Mock transaction hash
export const MOCK_TX_HASH = ("0x" + "b".repeat(64)) as `0x${string}`;

// Mock transaction receipt
export function createMockReceipt(
  blockNumber: bigint = BigInt(12345678)
): TransactionReceipt {
  return {
    blockHash: ("0x" + "c".repeat(64)) as `0x${string}`,
    blockNumber,
    contractAddress: null,
    cumulativeGasUsed: BigInt(21000),
    effectiveGasPrice: BigInt(1000000000),
    from: TEST_OPERATOR,
    gasUsed: BigInt(21000),
    logs: [],
    logsBloom: ("0x" + "0".repeat(512)) as `0x${string}`,
    status: "success",
    to: ("0x" + "d".repeat(40)) as `0x${string}`,
    transactionHash: MOCK_TX_HASH,
    transactionIndex: 0,
    type: "legacy",
  };
}

// Mock WalletClient
export function createMockWalletClient(): WalletClient {
  return {
    writeContract: vi.fn().mockResolvedValue(MOCK_TX_HASH),
    account: {
      address: TEST_OPERATOR,
    },
  } as unknown as WalletClient;
}

// Mock PublicClient
export function createMockPublicClient(): PublicClient {
  return {
    waitForTransactionReceipt: vi.fn().mockResolvedValue(createMockReceipt()),
    chain: {
      id: TEST_CHAIN_ID,
      name: "Base",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    },
    transport: { url: TEST_RPC_URL },
  } as unknown as PublicClient;
}

// Mock StorageClient
export interface MockStorageClient {
  get: MockedFunction<
    (params: { key: string; operator: string }) => Promise<StorageData | null>
  >;
  getChunkedMetadata: MockedFunction<
    (params: {
      key: string;
      operator: string;
    }) => Promise<ChunkedMetadata | null>
  >;
  preparePut: MockedFunction<
    (params: { key: string; text: string; value: string }) => any
  >;
  prepareXmlStorage: MockedFunction<(params: any) => any>;
}

export function createMockStorageClient(): MockStorageClient {
  return {
    get: vi.fn().mockResolvedValue(null),
    getChunkedMetadata: vi.fn().mockResolvedValue(null),
    preparePut: vi.fn(),
    prepareXmlStorage: vi.fn(),
  };
}

// Helper to create mock storage data - accepts JSON object
export function createMockStorageData(
  args: { text: string; value: string }
): StorageData {
  return {
    text: args.text,
    value: args.value.startsWith("0x")
      ? args.value
      : (("0x" + Buffer.from(args.value).toString("hex")) as `0x${string}`),
  };
}

// Helper to create mock chunked metadata - accepts JSON object
export function createMockChunkedMetadata(
  args: { chunkCount: number; originalText?: string }
): ChunkedMetadata {
  return {
    chunkCount: args.chunkCount,
    originalText: args.originalText || "",
  };
}

// Helper to create test file content
export function createTestFile(content: string): string {
  return content;
}

// Helper to create NormalStorageArgs (typed JSON object for function parameters)
// This creates the typed JSON args object that functions accept as input
// Accepts JSON object as parameter
export function createNormalStorageArgs(
  args: { storageKey: string; text: string; content: string }
): NormalStorageArgs {
  const storageKeyBytes = getStorageKeyBytes(args.storageKey) as `0x${string}`;
  return {
    key: storageKeyBytes,
    text: args.text,
    value: args.content.startsWith("0x") ? (args.content as `0x${string}`) : stringToHex(args.content),
  };
}

// Helper to create typed args for normal storage (wrapped in StorageTransactionArgs)
export function createNormalStorageTypedArgs(
  key: `0x${string}`,
  text: string,
  value: string
): StorageTransactionArgs {
  return {
    type: "normal",
    args: {
      key,
      text,
      value: value.startsWith("0x") ? (value as `0x${string}`) : stringToHex(value),
    },
  };
}

// Helper to create typed args for chunked storage
// Each chunked storage transaction represents a single chunk identified by its hash.
// The chunks array is always empty [] because each transaction stores one chunk, not multiple.
export function createChunkedStorageTypedArgs(
  hash: `0x${string}`,
  text: string = "",
  chunks: `0x${string}`[] = []
): StorageTransactionArgs {
  return {
    type: "chunked",
    args: {
      hash,      // ChunkedStorage hash that identifies this specific chunk
      text,      // Empty string "" for chunk transactions
      chunks,    // Empty array [] - each transaction represents one chunk, not a list
    },
  };
}

// Helper to create typed args for metadata storage
export function createMetadataStorageTypedArgs(
  key: `0x${string}`,
  text: string,
  value: string
): StorageTransactionArgs {
  return {
    type: "metadata",
    args: {
      key,
      text,
      value: value.startsWith("0x") ? (value as `0x${string}`) : stringToHex(value),
    },
  };
}
