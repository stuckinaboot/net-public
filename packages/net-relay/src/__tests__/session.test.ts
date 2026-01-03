import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRelaySession } from "../session";
import { privateKeyToAccount } from "viem/accounts";
import type { LocalAccount, Address } from "viem/accounts";

// Mock fetch globally
global.fetch = vi.fn();

describe("createRelaySession", () => {
  const mockAccount = privateKeyToAccount(
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  ) as LocalAccount;
  const mockOperatorAddress: Address =
    "0x1234567890123456789012345678901234567890";
  const mockSecretKey = "test-secret-key";
  const mockApiUrl = "http://localhost:3000";
  const mockChainId = 84532;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a session successfully", async () => {
    const mockSessionToken = "test-session-token";
    const mockExpiresAt = Math.floor(Date.now() / 1000) + 3600;

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sessionToken: mockSessionToken,
        expiresAt: mockExpiresAt,
      }),
    });

    const result = await createRelaySession({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      account: mockAccount,
    });

    expect(result.sessionToken).toBe(mockSessionToken);
    expect(result.expiresAt).toBe(mockExpiresAt);
    expect(global.fetch).toHaveBeenCalledWith(
      `${mockApiUrl}/api/relay/session`,
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.stringContaining('"chainId"'),
      })
    );
  });

  it("should throw error on API failure", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        success: false,
        error: "Invalid signature",
      }),
    });

    await expect(
      createRelaySession({
        apiUrl: mockApiUrl,
        chainId: mockChainId,
        operatorAddress: mockOperatorAddress,
        secretKey: mockSecretKey,
        account: mockAccount,
      })
    ).rejects.toThrow("Session creation failed");
  });

  it("should throw error if sessionToken is missing", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      }),
    });

    await expect(
      createRelaySession({
        apiUrl: mockApiUrl,
        chainId: mockChainId,
        operatorAddress: mockOperatorAddress,
        secretKey: mockSecretKey,
        account: mockAccount,
      })
    ).rejects.toThrow("Missing sessionToken");
  });

  it("should use custom expiresIn if provided", async () => {
    const customExpiresIn = 7200; // 2 hours
    const mockExpiresAt = Math.floor(Date.now() / 1000) + customExpiresIn;

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sessionToken: "test-token",
        expiresAt: mockExpiresAt,
      }),
    });

    const result = await createRelaySession({
      apiUrl: mockApiUrl,
      chainId: mockChainId,
      operatorAddress: mockOperatorAddress,
      secretKey: mockSecretKey,
      account: mockAccount,
      expiresIn: customExpiresIn,
    });

    expect(result.expiresAt).toBe(mockExpiresAt);
  });
});

