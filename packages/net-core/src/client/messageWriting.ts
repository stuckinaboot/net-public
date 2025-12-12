import { getNetContract } from "../chainConfig";
import { normalizeDataOrEmpty } from "../utils/dataUtils";
import type { WriteTransactionConfig } from "../types";

/**
 * Validate message parameters
 */
function validateMessageParams(params: {
  text: string;
  data?: string | `0x${string}`;
}) {
  const hasText = params.text.length > 0;
  const hasData =
    params.data !== undefined &&
    (typeof params.data === "string"
      ? params.data.length > 0
      : params.data !== "0x");

  if (!hasText && !hasData) {
    throw new Error("Message must have non-empty text or data");
  }
}

/**
 * Prepare transaction config for sending a direct Net message (user sends directly, not via app).
 */
export function prepareSendMessage(params: {
  text: string;
  topic: string;
  data?: `0x${string}` | string;
  chainId: number;
}): WriteTransactionConfig {
  validateMessageParams({ text: params.text, data: params.data });

  const netContract = getNetContract(params.chainId);
  const data = normalizeDataOrEmpty(params.data);

  return {
    to: netContract.address,
    functionName: "sendMessage",
    args: [params.text, params.topic, data],
    abi: netContract.abi,
  };
}

/**
 * Prepare transaction config for sending a message via an app contract.
 *
 * Note: This transaction should be called FROM the app contract, not directly from a user wallet.
 */
export function prepareSendMessageViaApp(params: {
  sender: `0x${string}`;
  text: string;
  topic: string;
  data?: `0x${string}` | string;
  appAddress: `0x${string}`;
  chainId: number;
}): WriteTransactionConfig {
  validateMessageParams({ text: params.text, data: params.data });

  const netContract = getNetContract(params.chainId);
  const data = normalizeDataOrEmpty(params.data);

  return {
    to: netContract.address,
    functionName: "sendMessageViaApp",
    args: [params.sender, params.text, params.topic, data],
    abi: netContract.abi,
  };
}
