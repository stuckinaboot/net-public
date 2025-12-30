import type { Address } from "viem";
import type { FundBackendWalletParams } from "./types";

/**
 * Response from /api/relay/balance endpoint
 */
interface BalanceResponse {
  success: boolean;
  backendWalletAddress: Address;
  balanceWei: string;
  balanceEth: string;
  sufficientBalance: boolean;
  minRequiredWei: string;
  minRequiredEth: string;
  error?: string;
}

/**
 * Error response from API endpoints
 */
interface ErrorResponse {
  success: false;
  error: string;
}

/**
 * Parameters for checking backend wallet balance
 */
export interface CheckBackendWalletBalanceParams {
  apiUrl: string;
  chainId: number;
  operatorAddress: Address;
  secretKey: string;
}

/**
 * Result of checking backend wallet balance
 */
export interface CheckBalanceResult {
  backendWalletAddress: Address;
  balanceWei: string;
  balanceEth: string;
  sufficientBalance: boolean;
  minRequiredWei: string;
  minRequiredEth: string;
}

/**
 * Check backend wallet balance via relay service
 *
 * This function:
 * 1. Calls /api/relay/balance with operatorAddress and secretKey
 * 2. Returns balance information including sufficientBalance flag
 *
 * @param params - Balance check parameters
 * @returns Result with balance information
 * @throws Error if balance check fails
 */
export async function checkBackendWalletBalance(
  params: CheckBackendWalletBalanceParams
): Promise<CheckBalanceResult> {
  const { apiUrl, chainId, operatorAddress, secretKey } = params;

  const response = await fetch(`${apiUrl}/api/relay/balance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chainId,
      operatorAddress,
      secretKey,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ErrorResponse;
    throw new Error(
      `Balance check endpoint failed: ${response.status} ${JSON.stringify(
        errorData
      )}`
    );
  }

  const result = (await response.json()) as BalanceResponse | ErrorResponse;
  if (!result.success || "error" in result) {
    throw new Error(
      `Balance check failed: ${("error" in result ? result.error : null) || "Unknown error"}`
    );
  }

  return {
    backendWalletAddress: result.backendWalletAddress,
    balanceWei: result.balanceWei,
    balanceEth: result.balanceEth,
    sufficientBalance: result.sufficientBalance,
    minRequiredWei: result.minRequiredWei,
    minRequiredEth: result.minRequiredEth,
  };
}

