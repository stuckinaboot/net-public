import type { Hash } from "viem";
import type {
  FundBackendWalletParams,
  RelayFundResult,
  FundResponse,
  VerifyFundResponse,
  ErrorResponse,
} from "./types";

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
 * Determine if a verify error is retryable based on HTTP status and error message
 */
function isRetryableVerifyError(
  statusCode: number,
  errorMessage: string
): boolean {
  // 5xx = always retryable
  if (statusCode >= 500) return true;

  // 4xx = check for retryable patterns
  if (statusCode >= 400 && statusCode < 500) {
    const msg = errorMessage.toLowerCase();
    return (
      msg.includes("failed to fetch payment transaction") ||
      msg.includes("treasury wallet has insufficient balance") ||
      msg.includes("transferfailed")
    );
  }

  return false;
}

/**
 * Retry /fund/verify with exponential backoff
 */
async function verifyFundWithRetry(
  apiUrl: string,
  paymentTxHash: Hash,
  operatorAddress: string,
  secretKey: string,
  chainId: number
): Promise<VerifyFundResponse> {
  const maxRetries = 3;
  const initialDelayMs = 2000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(`${apiUrl}/api/relay/fund/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chainId,
        paymentTxHash,
        operatorAddress,
        secretKey,
      }),
    });

    const data = (await response.json()) as VerifyFundResponse | ErrorResponse;

    if (response.ok && data.success) {
      return data as VerifyFundResponse;
    }

    const errorMessage = (data as ErrorResponse).error || "Unknown error";

    // Don't retry non-retryable errors
    if (!isRetryableVerifyError(response.status, errorMessage)) {
      throw new Error(`Fund verify failed: ${response.status} ${errorMessage}`);
    }

    // Last attempt failed
    if (attempt === maxRetries) {
      throw new Error(
        `Fund verify failed after ${maxRetries + 1} attempts: ${errorMessage}`
      );
    }

    // Wait before retry (exponential backoff)
    const delayMs = initialDelayMs * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Verify failed after all retries");
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

  // Step 3: Call /api/relay/fund/verify with retry logic
  const verifyData = await verifyFundWithRetry(
    apiUrl,
    paymentTxHash as Hash,
    operatorAddress,
    secretKey,
    chainId
  );

  console.log("✓ Payment verified and backend wallet funded", {
    backendWalletAddress: verifyData.backendWalletAddress,
  });

  if (!verifyData.backendWalletAddress) {
    throw new Error("Backend wallet address not found in verify response");
  }

  return {
    paymentTxHash: paymentTxHash as Hash,
    backendWalletAddress: verifyData.backendWalletAddress,
  };
}
