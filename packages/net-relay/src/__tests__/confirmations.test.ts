import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitForConfirmations } from "../confirmations";
import { waitForTransactionReceipt } from "viem/actions";
import type { PublicClient, Hash } from "viem";

// Mock viem/actions
vi.mock("viem/actions", () => ({
  waitForTransactionReceipt: vi.fn(),
}));

describe("waitForConfirmations", () => {
  const mockPublicClient = {} as PublicClient;
  const mockTxHash1: Hash =
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  const mockTxHash2: Hash =
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  const mockReceipt1 = { blockNumber: BigInt(100), status: "success" };
  const mockReceipt2 = { blockNumber: BigInt(101), status: "success" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should wait for confirmations successfully", async () => {
    const mockWaitForReceipt = vi.mocked(waitForTransactionReceipt);
    mockWaitForReceipt
      .mockResolvedValueOnce(mockReceipt1 as any)
      .mockResolvedValueOnce(mockReceipt2 as any);

    const result = await waitForConfirmations({
      publicClient: mockPublicClient,
      transactionHashes: [mockTxHash1, mockTxHash2],
      confirmations: 1,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ hash: mockTxHash1, receipt: mockReceipt1 });
    expect(result[1]).toEqual({ hash: mockTxHash2, receipt: mockReceipt2 });
    expect(mockWaitForReceipt).toHaveBeenCalledTimes(2);
  });

  it("should handle empty array", async () => {
    const result = await waitForConfirmations({
      publicClient: mockPublicClient,
      transactionHashes: [],
    });

    expect(result).toEqual([]);
    expect(vi.mocked(waitForTransactionReceipt)).not.toHaveBeenCalled();
  });

  it("should use default confirmations", async () => {
    const mockWaitForReceipt = vi.mocked(waitForTransactionReceipt);
    mockWaitForReceipt.mockResolvedValueOnce(mockReceipt1 as any);

    await waitForConfirmations({
      publicClient: mockPublicClient,
      transactionHashes: [mockTxHash1],
    });

    expect(mockWaitForReceipt).toHaveBeenCalledWith(
      mockPublicClient,
      expect.objectContaining({
        hash: mockTxHash1,
        confirmations: 1, // Default
      })
    );
  });

  it("should use custom confirmations", async () => {
    const mockWaitForReceipt = vi.mocked(waitForTransactionReceipt);
    mockWaitForReceipt.mockResolvedValueOnce(mockReceipt1 as any);

    await waitForConfirmations({
      publicClient: mockPublicClient,
      transactionHashes: [mockTxHash1],
      confirmations: 3,
    });

    expect(mockWaitForReceipt).toHaveBeenCalledWith(
      mockPublicClient,
      expect.objectContaining({
        confirmations: 3,
      })
    );
  });

  it("should call onProgress callback", async () => {
    const mockWaitForReceipt = vi.mocked(waitForTransactionReceipt);
    const onProgress = vi.fn();

    mockWaitForReceipt
      .mockResolvedValueOnce(mockReceipt1 as any)
      .mockResolvedValueOnce(mockReceipt2 as any);

    await waitForConfirmations({
      publicClient: mockPublicClient,
      transactionHashes: [mockTxHash1, mockTxHash2],
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledWith(1, 2);
    expect(onProgress).toHaveBeenCalledWith(2, 2);
  });

  it("should throw error on transaction failure", async () => {
    const mockWaitForReceipt = vi.mocked(waitForTransactionReceipt);
    mockWaitForReceipt.mockRejectedValueOnce(
      new Error("Transaction reverted")
    );

    await expect(
      waitForConfirmations({
        publicClient: mockPublicClient,
        transactionHashes: [mockTxHash1],
      })
    ).rejects.toThrow("Transaction reverted");
  });

  it("should handle timeout", async () => {
    const mockWaitForReceipt = vi.mocked(waitForTransactionReceipt);
    mockWaitForReceipt.mockRejectedValueOnce(new Error("Timeout"));

    await expect(
      waitForConfirmations({
        publicClient: mockPublicClient,
        transactionHashes: [mockTxHash1],
        timeout: 5000,
      })
    ).rejects.toThrow("Timeout");
  });
});

