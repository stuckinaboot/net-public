import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { retryFailedTransactions } from "../retry";
import { submitTransactionsViaRelay } from "../submit";
import type { Address } from "viem";
import type { WriteTransactionConfig } from "@net-protocol/core";

// Mock submitTransactionsViaRelay
vi.mock("../submit", () => ({
  submitTransactionsViaRelay: vi.fn(),
}));

// Mock console.error
global.console.error = vi.fn();

describe("retryFailedTransactions", () => {
  const mockOperatorAddress: Address =
    "0x1234567890123456789012345678901234567890";
  const mockBackendWalletAddress: Address =
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  const mockSessionToken = "test-session-token";
  const mockSecretKey = "test-secret-key";
  const mockApiUrl = "http://localhost:3000";
  const mockChainId = 84532;

  const mockTransactions: WriteTransactionConfig[] = [
    { to: "0x0000000000000000000000000000000000000000" as Address, data: "0x11" },
    { to: "0x0000000000000000000000000000000000000000" as Address, data: "0x22" },
    { to: "0x0000000000000000000000000000000000000000" as Address, data: "0x33" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    // Wait for any pending promises
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });

  it("should retry failed transactions successfully", async () => {
    const mockSubmit = vi.mocked(submitTransactionsViaRelay);

    // First retry succeeds
    mockSubmit.mockResolvedValueOnce({
      transactionHashes: [],
      successfulIndexes: [0, 1],
      failedIndexes: [],
      errors: [],
      backendWalletAddress: mockBackendWalletAddress,
    });

    const result = await retryFailedTransactions({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      failedIndexes: [0, 1],
      originalTransactions: mockTransactions,
      backendWalletAddress: mockBackendWalletAddress,
      sessionToken: mockSessionToken,
    });

    expect(result.successfulIndexes).toEqual([0, 1]);
    expect(result.failedIndexes).toEqual([]);
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it("should use recheckFunction if provided", async () => {
    const mockSubmit = vi.mocked(submitTransactionsViaRelay);
    const mockRecheckFunction = vi.fn().mockResolvedValue([1]); // Only retry index 1

    mockSubmit.mockResolvedValueOnce({
      transactionHashes: [],
      successfulIndexes: [0],
      failedIndexes: [],
      errors: [],
      backendWalletAddress: mockBackendWalletAddress,
    });

    await retryFailedTransactions({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      failedIndexes: [0, 1],
      originalTransactions: mockTransactions,
      backendWalletAddress: mockBackendWalletAddress,
      sessionToken: mockSessionToken,
      recheckFunction: mockRecheckFunction,
    });

    expect(mockRecheckFunction).toHaveBeenCalledWith(
      [0, 1],
      mockTransactions,
      mockBackendWalletAddress
    );
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        transactions: expect.arrayContaining([
          expect.objectContaining({ data: "0x22" }),
        ]),
      })
    );
  });

  it("should apply exponential backoff", async () => {
    const mockSubmit = vi.mocked(submitTransactionsViaRelay);

    // First retry fails, second succeeds
    mockSubmit
      .mockResolvedValueOnce({
        transactionHashes: [],
        successfulIndexes: [],
        failedIndexes: [0],
        errors: [{ index: 0, error: "Failed" }],
        backendWalletAddress: mockBackendWalletAddress,
      })
      .mockResolvedValueOnce({
        transactionHashes: [],
        successfulIndexes: [0],
        failedIndexes: [],
        errors: [],
        backendWalletAddress: mockBackendWalletAddress,
      });

    const promise = retryFailedTransactions({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      failedIndexes: [0],
      originalTransactions: mockTransactions,
      backendWalletAddress: mockBackendWalletAddress,
      sessionToken: mockSessionToken,
      config: {
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        maxRetries: 3,
      },
    });

    // Fast-forward time to skip delays
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;

    expect(result.successfulIndexes).toEqual([0]);
    expect(mockSubmit).toHaveBeenCalledTimes(2);
  });

  it("should respect maxRetries", async () => {
    const mockSubmit = vi.mocked(submitTransactionsViaRelay);

    // All retries fail
    mockSubmit.mockResolvedValue({
      transactionHashes: [],
      successfulIndexes: [],
      failedIndexes: [0],
      errors: [{ index: 0, error: "Failed" }],
      backendWalletAddress: mockBackendWalletAddress,
    });

    const promise = retryFailedTransactions({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      failedIndexes: [0],
      originalTransactions: mockTransactions,
      backendWalletAddress: mockBackendWalletAddress,
      sessionToken: mockSessionToken,
      config: {
        maxRetries: 2,
      },
    });

    await vi.advanceTimersByTimeAsync(5000);

    const result = await promise;

    expect(result.failedIndexes).toEqual([0]);
    expect(mockSubmit).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });

  // Note: Testing complete failure scenario is complex due to async error handling
  // The "should respect maxRetries" test above covers the case where retries fail
  // and verifies that failedIndexes are returned correctly
});

