import { encodeFunctionData } from "viem";
import type { WriteTransactionConfig } from "@net-protocol/core";
import type { EncodedTransaction } from "./types";

export type { EncodedTransaction };

/**
 * Encode a write transaction config into transaction data
 * Used for --encode-only mode where we output transaction data instead of executing
 */
export function encodeTransaction(
  config: WriteTransactionConfig,
  chainId: number
): EncodedTransaction {
  const calldata = encodeFunctionData({
    abi: config.abi,
    functionName: config.functionName,
    args: config.args,
  });

  return {
    to: config.to,
    data: calldata,
    chainId,
    value: config.value?.toString() ?? "0",
  };
}
