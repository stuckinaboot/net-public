import { keccak256, toBytes } from "viem";
import type { LocalAccount, Address } from "viem/accounts";
import {
  RELAY_DOMAIN_NAME,
  RELAY_DOMAIN_VERSION,
  RELAY_SESSION_TYPES,
} from "./constants";
import type { CreateSessionResponse, ErrorResponse } from "./types";

/**
 * Create a relay session token
 *
 * Signs an EIP-712 message proving ownership of operatorAddress
 * and receives a sessionToken that can be reused for multiple batch requests.
 *
 * @param params - Session creation parameters
 * @returns Session token and expiration timestamp
 * @throws Error if session creation fails
 */
export async function createRelaySession(params: {
  apiUrl: string;
  chainId: number;
  operatorAddress: Address;
  secretKey: string;
  account: LocalAccount;
  expiresIn?: number; // seconds, default 3600
}): Promise<{ sessionToken: string; expiresAt: number }> {
  const { apiUrl, chainId, operatorAddress, secretKey, account, expiresIn } =
    params;

  const expiresInSeconds = expiresIn || 3600; // Default 1 hour
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const secretKeyHash = keccak256(toBytes(secretKey));

  const domain = {
    name: RELAY_DOMAIN_NAME,
    version: RELAY_DOMAIN_VERSION,
    chainId,
  };

  const message = {
    operatorAddress,
    secretKeyHash,
    expiresAt: BigInt(expiresAt),
  };

  // Sign the typed data using account's signTypedData method
  const signature = await account.signTypedData({
    domain,
    types: RELAY_SESSION_TYPES,
    primaryType: "RelaySession",
    message,
  });

  // Call session endpoint
  const response = await fetch(`${apiUrl}/api/relay/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chainId,
      operatorAddress,
      secretKey,
      signature,
      expiresIn: expiresInSeconds,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ErrorResponse;
    throw new Error(
      `Session creation failed: ${response.status} ${
        errorData.error || response.statusText
      }`
    );
  }

  const result = (await response.json()) as
    | CreateSessionResponse
    | ErrorResponse;
  if (!result.success || "error" in result) {
    throw new Error(
      `Session creation failed: ${
        ("error" in result ? result.error : null) || "Unknown error"
      }`
    );
  }

  if (!result.sessionToken || !result.expiresAt) {
    throw new Error(
      "Session creation failed: Missing sessionToken or expiresAt in response"
    );
  }

  return {
    sessionToken: result.sessionToken,
    expiresAt: result.expiresAt,
  };
}
