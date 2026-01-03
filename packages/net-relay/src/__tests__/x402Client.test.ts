import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRelayX402Client } from "../client/x402Client";
import { privateKeyToAccount } from "viem/accounts";
import type { LocalAccount } from "viem/accounts";

// Mock x402 packages
vi.mock("@x402/fetch", () => ({
  x402Client: vi.fn().mockImplementation(() => ({})),
  wrapFetchWithPayment: vi.fn((fetch, client) => fetch),
  x402HTTPClient: vi.fn().mockImplementation(() => ({
    getPaymentSettleResponse: vi.fn(),
  })),
}));

vi.mock("@x402/evm/exact/client", () => ({
  registerExactEvmScheme: vi.fn(),
}));

describe("createRelayX402Client", () => {
  let mockAccount: LocalAccount;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAccount = privateKeyToAccount(
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    ) as LocalAccount;
  });

  it("should create x402 client with account", async () => {
    const { x402Client } = await import("@x402/fetch");
    const { registerExactEvmScheme } = await import("@x402/evm/exact/client");
    const { wrapFetchWithPayment, x402HTTPClient } = await import(
      "@x402/fetch"
    );

    const result = createRelayX402Client(mockAccount, 84532);

    expect(x402Client).toHaveBeenCalled();
    expect(registerExactEvmScheme).toHaveBeenCalled();
    expect(wrapFetchWithPayment).toHaveBeenCalled();
    expect(x402HTTPClient).toHaveBeenCalled();
    expect(result.fetchWithPayment).toBeDefined();
    expect(result.httpClient).toBeDefined();
    expect(result.httpClient.getPaymentSettleResponse).toBeDefined();
  });

  it("should work without chainId", () => {
    const result = createRelayX402Client(mockAccount);
    expect(result.fetchWithPayment).toBeDefined();
    expect(result.httpClient).toBeDefined();
  });

  it("should return correct structure", () => {
    const result = createRelayX402Client(mockAccount, 84532);
    expect(result).toHaveProperty("fetchWithPayment");
    expect(result).toHaveProperty("httpClient");
    expect(result.httpClient).toHaveProperty("getPaymentSettleResponse");
    expect(typeof result.httpClient.getPaymentSettleResponse).toBe("function");
  });
});

