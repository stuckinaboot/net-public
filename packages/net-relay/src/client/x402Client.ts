import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import type { LocalAccount } from "viem/accounts";
import type { X402ClientResult } from "../types";

/**
 * Create x402 client for relay payments
 *
 * Sets up x402Client with user's account, registers EVM scheme,
 * and returns wrapped fetch function and HTTP client for header extraction.
 *
 * @param account - User's local account (from privateKeyToAccount)
 * @param chainId - Chain ID (optional, for logging purposes)
 * @returns Object with fetchWithPayment and httpClient
 */
export function createRelayX402Client(
  account: LocalAccount,
  chainId?: number
): X402ClientResult {
  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account });
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  const httpClient = new x402HTTPClient(client);

  return { fetchWithPayment, httpClient };
}

