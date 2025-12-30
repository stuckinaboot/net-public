import type { Hash, Address } from "viem";
import type {
  FundBackendWalletParams,
  RelayFundResult,
} from "./types";
import { x402HTTPClient } from "@x402/fetch";

/**
 * Extract payment transaction hash from response headers
 */
function extractPaymentTxHash(
  response: Response,
  httpClient: x402HTTPClient
): string | null {
  try {
    const paymentResponse = httpClient.getPaymentSettleResponse((name) =>
      response.headers.get(name)
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
 * 1. Calls /api/relay/fund with x402 payment (using fetchWithPayment)
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
  const { apiUrl, operatorAddress, secretKey, fetchWithPayment, httpClient } =
    params;

  // Step 1: Call /api/relay/fund (Payment)
  const fundResponse = await fetchWithPayment(`${apiUrl}/api/relay/fund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operatorAddress,
      secretKey,
    }),
  });

  const fundData = await fundResponse.json();

  // Handle 402 Payment Required
  if (fundResponse.status === 402) {
    // Check if payment was actually processed despite 402
    if (fundData.payer || fundData.success) {
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
      paymentTxHash: paymentTxHash as Hash,
      operatorAddress,
      secretKey,
    }),
  });

  if (!verifyFundResponse.ok) {
    const errorData = await verifyFundResponse.json();
    throw new Error(
      `Fund verify endpoint failed: ${verifyFundResponse.status} ${JSON.stringify(
        errorData
      )}`
    );
  }

  const verifyData = await verifyFundResponse.json();
  if (!verifyData.success) {
    throw new Error(
      `Fund verify failed: ${verifyData.error || "Unknown error"}`
    );
  }

  return {
    paymentTxHash: paymentTxHash as Hash,
    backendWalletAddress: verifyData.backendWalletAddress as Address,
  };
}

