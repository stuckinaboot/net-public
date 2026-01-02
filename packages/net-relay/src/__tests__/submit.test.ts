import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitTransactionsViaRelay } from "../submit";
import type { Address, Hash } from "viem";
import type { WriteTransactionConfig } from "@net-protocol/core";

// Mock fetch globally
global.fetch = vi.fn();

describe("submitTransactionsViaRelay", () => {
  const mockOperatorAddress: Address =
    "0x1234567890123456789012345678901234567890";
  const mockBackendWalletAddress: Address =
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  const mockSessionToken = "test-session-token";
  const mockSecretKey = "test-secret-key";
  const mockApiUrl = "http://localhost:3000";
  const mockChainId = 84532;

  const mockTransactions: WriteTransactionConfig[] = [
    {
      to: "0x0000000000000000000000000000000000000000" as Address,
      data: "0x1234",
    },
    {
      to: "0x0000000000000000000000000000000000000000" as Address,
      data: "0x5678",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should submit transactions successfully", async () => {
    const mockTxHashes: Hash[] = [
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    ];
    const mockAppFeeTxHash: Hash =
      "0xfee1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc";

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        transactionHashes: mockTxHashes,
        successfulIndexes: [0, 1],
        failedIndexes: [],
        errors: [],
        backendWalletAddress: mockBackendWalletAddress,
        appFeeTransactionHash: mockAppFeeTxHash,
      }),
    });

    const result = await submitTransactionsViaRelay({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      transactions: mockTransactions,
      sessionToken: mockSessionToken,
    });

    expect(result.transactionHashes).toEqual(mockTxHashes);
    expect(result.successfulIndexes).toEqual([0, 1]);
    expect(result.failedIndexes).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.backendWalletAddress).toBe(mockBackendWalletAddress);
  });

  it("should handle partial failures", async () => {
    const mockTxHashes: Hash[] = [
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    ];
    const mockAppFeeTxHash: Hash =
      "0xfee1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc";

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        transactionHashes: mockTxHashes,
        successfulIndexes: [0],
        failedIndexes: [1],
        errors: [{ index: 1, error: "Insufficient gas" }],
        backendWalletAddress: mockBackendWalletAddress,
        appFeeTransactionHash: mockAppFeeTxHash,
      }),
    });

    const result = await submitTransactionsViaRelay({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      transactions: mockTransactions,
      sessionToken: mockSessionToken,
    });

    expect(result.successfulIndexes).toEqual([0]);
    expect(result.failedIndexes).toEqual([1]);
    expect(result.errors).toEqual([{ index: 1, error: "Insufficient gas" }]);
  });

  it("should handle all transactions failing", async () => {
    const mockAppFeeTxHash: Hash =
      "0xfee1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc";

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        transactionHashes: [],
        successfulIndexes: [],
        failedIndexes: [0, 1],
        errors: [
          { index: 0, error: "Transaction reverted" },
          { index: 1, error: "Out of gas" },
        ],
        backendWalletAddress: mockBackendWalletAddress,
        appFeeTransactionHash: mockAppFeeTxHash,
      }),
    });

    const result = await submitTransactionsViaRelay({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      transactions: mockTransactions,
      sessionToken: mockSessionToken,
    });

    expect(result.successfulIndexes).toEqual([]);
    expect(result.failedIndexes).toEqual([0, 1]);
    expect(result.errors).toHaveLength(2);
  });

  it("should throw error on API failure", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: "Invalid session token",
      }),
    });

    await expect(
      submitTransactionsViaRelay({
        apiUrl: mockApiUrl,
        chainId: mockChainId,
        operatorAddress: mockOperatorAddress,
        secretKey: mockSecretKey,
        transactions: mockTransactions,
        sessionToken: mockSessionToken,
      })
    ).rejects.toThrow("Relay submit endpoint failed");
  });

  it("should serialize value correctly when present", async () => {
    const transactionsWithValue: WriteTransactionConfig[] = [
      {
        to: "0x0000000000000000000000000000000000000000" as Address,
        data: "0x1234",
        value: BigInt(1000000000000000000), // 1 ETH
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        transactionHashes: [],
        successfulIndexes: [],
        failedIndexes: [],
        errors: [],
        backendWalletAddress: mockBackendWalletAddress,
        appFeeTransactionHash:
          "0xfee1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc",
      }),
    });

    await submitTransactionsViaRelay({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      transactions: transactionsWithValue,
      sessionToken: mockSessionToken,
    });

    const callBody = JSON.parse(
      (global.fetch as any).mock.calls[0][1].body
    );
    expect(callBody.transactions[0].value).toBe("1000000000000000000");
  });
});

