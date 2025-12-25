import { vi, type MockedFunction } from "vitest";
import type { WalletClient, PublicClient, TransactionReceipt } from "viem";
import type { StorageClient } from "@net-protocol/storage";
import type { StorageData, ChunkedMetadata } from "@net-protocol/storage";
import type { TransactionWithId, UploadResult } from "../types";

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
    logsBloom: "0x" + "0".repeat(512),
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

// Helper to create mock storage data
export function createMockStorageData(
  text: string,
  value: string
): StorageData {
  return {
    text,
    value: value.startsWith("0x")
      ? value
      : (("0x" + Buffer.from(value).toString("hex")) as `0x${string}`),
  };
}

// Helper to create mock chunked metadata
export function createMockChunkedMetadata(
  chunkCount: number,
  originalText: string = ""
): ChunkedMetadata {
  return {
    chunkCount,
    originalText,
  };
}

// Helper to create test file content
export function createTestFile(content: string): string {
  return content;
}
