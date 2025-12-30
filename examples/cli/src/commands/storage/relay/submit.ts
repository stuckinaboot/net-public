import type { Hash, Address } from "viem";
import type {
  SubmitTransactionsViaRelayParams,
  RelaySubmitResult,
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
  const { apiUrl, paymentTxHash, operatorAddress, secretKey, transactions } =
    params;

  const response = await fetch(`${apiUrl}/api/relay/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentTxHash,
      operatorAddress,
      secretKey,
      transactions: transactions.map((tx) => ({
        ...tx,
        // Only include value if it exists and is > 0
        ...(tx.value !== undefined && tx.value > BigInt(0)
          ? { value: tx.value.toString() }
          : {}),
      })),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Relay submit endpoint failed: ${response.status} ${JSON.stringify(
        errorData
      )}`
    );
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(
      `Relay submit failed: ${result.error || "Unknown error"}`
    );
  }

  return {
    transactionHashes: result.transactionHashes.map((h: string) => h as Hash),
    successfulIndexes: result.successfulIndexes || [],
    failedIndexes: result.failedIndexes || [],
    errors: result.errors || [],
    transactionsSent: result.transactionsSent || 0,
    transactionsFailed: result.transactionsFailed || 0,
    backendWalletAddress: result.backendWalletAddress as Address,
  };
}

