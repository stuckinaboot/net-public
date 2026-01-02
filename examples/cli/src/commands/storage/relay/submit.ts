import type { Hash, Address } from "viem";
import type {
  SubmitTransactionsViaRelayParams,
  RelaySubmitResult,
  SubmitResponse,
  ErrorResponse,
} from "./types";

/**
 * Submit transactions via relay service
 *
 * Calls /api/relay/submit with transactions and returns result
 * with success/failure tracking by index.
 *
 * @param params - Submission parameters
 * @returns Result with transaction hashes and success/failure tracking
 * @throws Error if submission fails
 */
export async function submitTransactionsViaRelay(
  params: SubmitTransactionsViaRelayParams
): Promise<RelaySubmitResult> {
  const {
    apiUrl,
    chainId,
    operatorAddress,
    secretKey,
    transactions,
    sessionToken,
  } = params;

  const response = await fetch(`${apiUrl}/api/relay/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chainId,
      operatorAddress,
      secretKey,
      transactions: transactions.map((tx) => ({
        ...tx,
        // Only include value if it exists and is > 0
        ...(tx.value !== undefined && tx.value > BigInt(0)
          ? { value: tx.value.toString() }
          : {}),
      })),
      sessionToken,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ErrorResponse;
    throw new Error(
      `Relay submit endpoint failed: ${response.status} ${JSON.stringify(
        errorData
      )}`
    );
  }

  const result = (await response.json()) as SubmitResponse | ErrorResponse;
  if (!result.success || "error" in result) {
    throw new Error(
      `Relay submit failed: ${
        ("error" in result ? result.error : null) || "Unknown error"
      }`
    );
  }

  return {
    transactionHashes: result.transactionHashes.map((h: string) => h as Hash),
    successfulIndexes: result.successfulIndexes || [],
    failedIndexes: result.failedIndexes || [],
    errors: result.errors || [],
    backendWalletAddress: result.backendWalletAddress as Address,
  };
}
