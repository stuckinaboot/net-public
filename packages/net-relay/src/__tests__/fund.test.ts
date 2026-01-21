import { describe, it, expect, vi, beforeEach } from "vitest";
import { fundBackendWallet } from "../fund";
import type { Address, Hash } from "viem";

// Mock fetch globally
global.fetch = vi.fn();

describe("fundBackendWallet", () => {
  const mockOperatorAddress: Address =
    "0x1234567890123456789012345678901234567890";
  const mockBackendWalletAddress: Address =
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  const mockPaymentTxHash: Hash =
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  const mockSecretKey = "test-secret-key";
  const mockApiUrl = "http://localhost:3000";
  const mockChainId = 84532;

  const mockFetchWithPayment = vi.fn();
  const mockHttpClient = {
    getPaymentSettleResponse: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn(); // Mock console.log
    console.error = vi.fn(); // Mock console.error
  });

  it("should fund backend wallet successfully", async () => {
    // Mock fund endpoint response
    mockFetchWithPayment.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn((name: string) => {
          if (name === "X-PAYMENT-RESPONSE") {
            return JSON.stringify({ transaction: mockPaymentTxHash });
          }
          return null;
        }),
      },
      json: async () => ({
        success: true,
        payer: mockOperatorAddress,
        amount: "0.01",
      }),
    });

    // Mock httpClient.getPaymentSettleResponse
    mockHttpClient.getPaymentSettleResponse.mockReturnValueOnce({
      transaction: mockPaymentTxHash,
    });

    // Mock verify endpoint response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        backendWalletAddress: mockBackendWalletAddress,
        fundedAmountEth: "0.01",
        transactionHash: mockPaymentTxHash,
      }),
    });

    const result = await fundBackendWallet({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      fetchWithPayment: mockFetchWithPayment as any,
      httpClient: mockHttpClient as any,
    });

    expect(result.paymentTxHash).toBe(mockPaymentTxHash);
    expect(result.backendWalletAddress).toBe(mockBackendWalletAddress);
    expect(mockFetchWithPayment).toHaveBeenCalledWith(
      `${mockApiUrl}/api/relay/${mockChainId}/fund`,
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("should use default amount when amount parameter is not provided", async () => {
    // Mock fund endpoint response
    mockFetchWithPayment.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn((name: string) => {
          if (name === "X-PAYMENT-RESPONSE") {
            return JSON.stringify({ transaction: mockPaymentTxHash });
          }
          return null;
        }),
      },
      json: async () => ({
        success: true,
        payer: mockOperatorAddress,
        amount: "0.01",
      }),
    });

    // Mock httpClient.getPaymentSettleResponse
    mockHttpClient.getPaymentSettleResponse.mockReturnValueOnce({
      transaction: mockPaymentTxHash,
    });

    // Mock verify endpoint response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        backendWalletAddress: mockBackendWalletAddress,
        fundedAmountEth: "0.01",
        transactionHash: mockPaymentTxHash,
      }),
    });

    const result = await fundBackendWallet({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      fetchWithPayment: mockFetchWithPayment as any,
      httpClient: mockHttpClient as any,
      // Explicitly not providing amount parameter
    });

    expect(result.paymentTxHash).toBe(mockPaymentTxHash);
    expect(result.backendWalletAddress).toBe(mockBackendWalletAddress);
    // Verify URL does NOT have amount query param
    expect(mockFetchWithPayment).toHaveBeenCalledWith(
      `${mockApiUrl}/api/relay/${mockChainId}/fund`,
      expect.objectContaining({
        method: "POST",
      })
    );
    // Verify URL doesn't contain ?amount=
    const callUrl = (mockFetchWithPayment as any).mock.calls[0][0];
    expect(callUrl).not.toContain("?amount=");
  });

  it("should append amount query param when custom amount is provided", async () => {
    const customAmount = 0.25;

    // Mock fund endpoint response
    mockFetchWithPayment.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn((name: string) => {
          if (name === "X-PAYMENT-RESPONSE") {
            return JSON.stringify({ transaction: mockPaymentTxHash });
          }
          return null;
        }),
      },
      json: async () => ({
        success: true,
        payer: mockOperatorAddress,
        amount: customAmount.toString(),
      }),
    });

    // Mock httpClient.getPaymentSettleResponse
    mockHttpClient.getPaymentSettleResponse.mockReturnValueOnce({
      transaction: mockPaymentTxHash,
    });

    // Mock verify endpoint response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        backendWalletAddress: mockBackendWalletAddress,
        fundedAmountEth: customAmount.toString(),
        transactionHash: mockPaymentTxHash,
      }),
    });

    const result = await fundBackendWallet({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      fetchWithPayment: mockFetchWithPayment as any,
      httpClient: mockHttpClient as any,
      amount: customAmount,
    });

    expect(result.paymentTxHash).toBe(mockPaymentTxHash);
    expect(result.backendWalletAddress).toBe(mockBackendWalletAddress);
    // Verify URL includes amount query param
    expect(mockFetchWithPayment).toHaveBeenCalledWith(
      `${mockApiUrl}/api/relay/${mockChainId}/fund?amount=${customAmount}`,
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("should handle 402 Payment Required status", async () => {
    mockFetchWithPayment.mockResolvedValueOnce({
      ok: false,
      status: 402,
      headers: {
        get: vi.fn((name: string) => {
          if (name === "X-PAYMENT-RESPONSE") {
            return JSON.stringify({ transaction: mockPaymentTxHash });
          }
          return null;
        }),
      },
      json: async () => ({
        success: true,
        payer: mockOperatorAddress,
        amount: "0.01",
      }),
    });

    mockHttpClient.getPaymentSettleResponse.mockReturnValueOnce({
      transaction: mockPaymentTxHash,
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        backendWalletAddress: mockBackendWalletAddress,
        fundedAmountEth: "0.01",
        transactionHash: mockPaymentTxHash,
      }),
    });

    const result = await fundBackendWallet({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      fetchWithPayment: mockFetchWithPayment as any,
      httpClient: mockHttpClient as any,
    });

    expect(result.paymentTxHash).toBe(mockPaymentTxHash);
  });

  it("should throw error if paymentTxHash cannot be extracted", async () => {
    mockFetchWithPayment.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: vi.fn(() => null),
      },
      json: async () => ({
        success: true,
      }),
    });

    mockHttpClient.getPaymentSettleResponse.mockReturnValueOnce(null);

    await expect(
      fundBackendWallet({
        apiUrl: mockApiUrl,
        chainId: mockChainId,
        operatorAddress: mockOperatorAddress,
        secretKey: mockSecretKey,
        fetchWithPayment: mockFetchWithPayment as any,
        httpClient: mockHttpClient as any,
      })
    ).rejects.toThrow("Failed to extract payment transaction hash");
  });

  it("should throw error if verify endpoint fails with non-retryable error", async () => {
    mockFetchWithPayment.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: vi.fn(() => null),
      },
      json: async () => ({
        success: true,
      }),
    });

    mockHttpClient.getPaymentSettleResponse.mockReturnValueOnce({
      transaction: mockPaymentTxHash,
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: "No USDC transfer to treasury address found",
      }),
    });

    await expect(
      fundBackendWallet({
        apiUrl: mockApiUrl,
        chainId: mockChainId,
        operatorAddress: mockOperatorAddress,
        secretKey: mockSecretKey,
        fetchWithPayment: mockFetchWithPayment as any,
        httpClient: mockHttpClient as any,
      })
    ).rejects.toThrow("Fund verify failed");

    expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
  });

  it("should retry on network error and succeed", async () => {
    mockFetchWithPayment.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: vi.fn(() => null),
      },
      json: async () => ({
        success: true,
      }),
    });

    mockHttpClient.getPaymentSettleResponse.mockReturnValueOnce({
      transaction: mockPaymentTxHash,
    });

    let verifyCallCount = 0;
    (global.fetch as any).mockImplementation(async () => {
      verifyCallCount++;
      if (verifyCallCount === 1) {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            success: false,
            error: "Failed to fetch payment transaction or receipt: Network error",
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          success: true,
          backendWalletAddress: mockBackendWalletAddress,
        }),
      };
    });

    const result = await fundBackendWallet({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      fetchWithPayment: mockFetchWithPayment as any,
      httpClient: mockHttpClient as any,
    });

    expect(verifyCallCount).toBe(2); // Verify retry happened
    expect(result.backendWalletAddress).toBe(mockBackendWalletAddress);
  });

  it("should retry on 500 error", async () => {
    mockFetchWithPayment.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: vi.fn(() => null),
      },
      json: async () => ({
        success: true,
      }),
    });

    mockHttpClient.getPaymentSettleResponse.mockReturnValueOnce({
      transaction: mockPaymentTxHash,
    });

    let verifyCallCount = 0;
    (global.fetch as any).mockImplementation(async () => {
      verifyCallCount++;
      return verifyCallCount === 1
        ? {
            ok: false,
            status: 500,
            json: async () => ({
              success: false,
              error: "Server error",
            }),
          }
        : {
            ok: true,
            json: async () => ({
              success: true,
              backendWalletAddress: mockBackendWalletAddress,
            }),
          };
    });

    await fundBackendWallet({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      fetchWithPayment: mockFetchWithPayment as any,
      httpClient: mockHttpClient as any,
    });

    expect(verifyCallCount).toBe(2); // Verify retry happened
  });
});

