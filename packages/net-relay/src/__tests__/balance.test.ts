import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkBackendWalletBalance } from "../balance";
import type { Address } from "viem";

// Mock fetch globally
global.fetch = vi.fn();

describe("checkBackendWalletBalance", () => {
  const mockOperatorAddress: Address =
    "0x1234567890123456789012345678901234567890";
  const mockBackendWalletAddress: Address =
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  const mockSecretKey = "test-secret-key";
  const mockApiUrl = "http://localhost:3000";
  const mockChainId = 84532;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return balance info with sufficient balance", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        backendWalletAddress: mockBackendWalletAddress,
        balanceWei: "1000000000000000000", // 1 ETH
        balanceEth: "1.0",
        sufficientBalance: true,
        minRequiredWei: "100000000000000000", // 0.1 ETH
        minRequiredEth: "0.1",
      }),
    });

    const result = await checkBackendWalletBalance({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
    });

    expect(result.backendWalletAddress).toBe(mockBackendWalletAddress);
    expect(result.balanceWei).toBe("1000000000000000000");
    expect(result.balanceEth).toBe("1.0");
    expect(result.sufficientBalance).toBe(true);
    expect(result.minRequiredWei).toBe("100000000000000000");
    expect(result.minRequiredEth).toBe("0.1");
  });

  it("should return balance info with insufficient balance", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        backendWalletAddress: mockBackendWalletAddress,
        balanceWei: "10000000000000", // 0.00001 ETH
        balanceEth: "0.00001",
        sufficientBalance: false,
        minRequiredWei: "100000000000000000", // 0.1 ETH
        minRequiredEth: "0.1",
      }),
    });

    const result = await checkBackendWalletBalance({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
    });

    expect(result.sufficientBalance).toBe(false);
  });

  it("should throw error on API failure", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: "Internal server error",
      }),
    });

    await expect(
      checkBackendWalletBalance({
        apiUrl: mockApiUrl,
        chainId: mockChainId,
        operatorAddress: mockOperatorAddress,
        secretKey: mockSecretKey,
      })
    ).rejects.toThrow("Balance check endpoint failed");
  });

  it("should throw error if response indicates failure", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: "Invalid operator address",
      }),
    });

    await expect(
      checkBackendWalletBalance({
        apiUrl: mockApiUrl,
        chainId: mockChainId,
        operatorAddress: mockOperatorAddress,
        secretKey: mockSecretKey,
      })
    ).rejects.toThrow("Balance check failed");
  });
});

