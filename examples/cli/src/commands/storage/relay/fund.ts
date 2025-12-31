import type { Hash, Address } from "viem";
import type { FundBackendWalletParams, RelayFundResult } from "./types";
import { x402HTTPClient } from "@x402/fetch";

/**
 * Response from /api/relay/[chainId]/fund endpoint
 */
interface FundResponse {
  success: boolean;
  message?: string;
  payer?: Address;
  amount?: string;
  error?: string;
}

/**
 * Response from /api/relay/fund/verify endpoint
 */
interface VerifyFundResponse {
  success: boolean;
  paymentTxHash?: Hash;
  backendWalletAddress?: Address;
  fundedAmountEth?: string;
  paymentRecordTxHash?: Hash;
  fundingTxHash?: Hash;
  alreadyProcessed?: boolean;
  message?: string;
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
 * Extract payment transaction hash from response headers
 */
function extractPaymentTxHash(
  response: Response,
  httpClient: FundBackendWalletParams["httpClient"]
): string | null {
  try {
    const paymentResponse = httpClient.getPaymentSettleResponse(
      (name: string) => response.headers.get(name)
    );
    return paymentResponse?.transaction || paymentResponse?.txHash || null;
  } catch (error) {
    console.error("Failed to extract payment transaction hash:", error);
    return null;
  }
}

/**
 * Fund backend wallet via x402 relay service
 *
 * This function:
 * 1. Calls /api/relay/[chainId]/fund with x402 payment (using fetchWithPayment)
 * 2. Extracts paymentTxHash from X-PAYMENT-RESPONSE header
 * 3. Waits for payment confirmation (2 seconds)
 * 4. Calls /api/relay/fund/verify to get backendWalletAddress
 * 5. Returns { paymentTxHash, backendWalletAddress }
 *
 * @param params - Funding parameters
 * @returns Result with paymentTxHash and backendWalletAddress
 * @throws Error if funding fails
 */
export async function fundBackendWallet(
  params: FundBackendWalletParams
): Promise<RelayFundResult> {
  const {
    apiUrl,
    operatorAddress,
    secretKey,
    fetchWithPayment,
    httpClient,
    chainId,
  } = params;

  const fundUrl = `${apiUrl}/api/relay/${chainId}/fund`;

  console.log("💰 Funding backend wallet", {
    url: fundUrl,
    chainId,
    operatorAddress,
    facilitator:
      chainId === 8453
        ? "Coinbase CDP (Base Mainnet)"
        : chainId === 84532
        ? "x402.org (Base Sepolia)"
        : "unknown",
  });

  // Step 1: Call /api/relay/[chainId]/fund (Payment)
  let fundResponse: Response;
  try {
    fundResponse = await fetchWithPayment(fundUrl, {
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
  } catch (error) {
    console.error("❌ Fund request failed", {
      error: error instanceof Error ? error.message : String(error),
      chainId,
      url: fundUrl,
    });
    throw error;
  }

  const fundData = (await fundResponse.json()) as FundResponse | ErrorResponse;

  // Handle 402 Payment Required
  if (fundResponse.status === 402) {
    // Check if payment was actually processed despite 402
    if ("payer" in fundData && fundData.payer) {
      // Payment appears to have been processed
    } else if ("success" in fundData && fundData.success) {
      // Payment appears to have been processed
    } else {
      throw new Error(
        `Fund endpoint returned 402 Payment Required: ${JSON.stringify(
          fundData
        )}`
      );
    }
  } else if (!fundResponse.ok) {
    throw new Error(
      `Fund endpoint failed: ${fundResponse.status} ${JSON.stringify(fundData)}`
    );
  }

  // Extract payment transaction hash from response headers
  const paymentTxHash = extractPaymentTxHash(fundResponse, httpClient);

  if (!paymentTxHash) {
    throw new Error(
      "Failed to extract payment transaction hash from payment response headers"
    );
  }

  // Step 2: Wait for payment confirmation
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 3: Call /api/relay/fund/verify (Verification & Funding)
  const verifyFundResponse = await fetch(`${apiUrl}/api/relay/fund/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chainId,
      paymentTxHash: paymentTxHash as Hash,
      operatorAddress,
      secretKey,
    }),
  });

  if (!verifyFundResponse.ok) {
    const errorData = (await verifyFundResponse.json()) as ErrorResponse;
    throw new Error(
      `Fund verify endpoint failed: ${
        verifyFundResponse.status
      } ${JSON.stringify(errorData)}`
    );
  }

  const verifyData = (await verifyFundResponse.json()) as VerifyFundResponse;
  console.log("✓ Payment verified and backend wallet funded", {
    backendWalletAddress: verifyData.backendWalletAddress,
  });

  if (!verifyData.success) {
    throw new Error(
      `Fund verify failed: ${verifyData.error || "Unknown error"}`
    );
  }

  if (!verifyData.backendWalletAddress) {
    throw new Error("Backend wallet address not found in verify response");
  }

  return {
    paymentTxHash: paymentTxHash as Hash,
    backendWalletAddress: verifyData.backendWalletAddress,
  };
}
