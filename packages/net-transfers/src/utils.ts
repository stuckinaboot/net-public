import { decodeAbiParameters, type Address } from "viem";
import type { NetMessage } from "@net-protocol/core";
import {
  MAX_TRANSFER_MESSAGE_LENGTH,
  NATIVE_TOKEN_ADDRESS,
  TRANSFER_TOPIC_PREFIX,
} from "./constants";
import type { TokenTransfer } from "./types";

/** Net topic for transfers received by `to` */
export function getTransferTopic(to: Address): string {
  return `${TRANSFER_TOPIC_PREFIX}${to.toLowerCase()}`;
}

export function isNativeToken(token: Address): boolean {
  return token.toLowerCase() === NATIVE_TOKEN_ADDRESS;
}

/** Decode a NetTokenTransfer message into a transfer */
export function parseTransferMessage(message: NetMessage): TokenTransfer {
  const [token, to, amount] = decodeAbiParameters(
    [{ type: "address" }, { type: "address" }, { type: "uint256" }],
    message.data
  );
  return {
    from: message.sender,
    to,
    token,
    amount,
    message: message.text,
    timestamp: Number(message.timestamp),
  };
}

/** Returns an error string if the send params are invalid, otherwise undefined */
export function validateSendParams(params: {
  to: Address;
  amount: bigint;
  message?: string;
}): string | undefined {
  if (!/^0x[0-9a-fA-F]{40}$/.test(params.to)) return "Invalid recipient address";
  if (params.to.toLowerCase() === NATIVE_TOKEN_ADDRESS) return "Recipient cannot be the zero address";
  if (params.amount <= 0n) return "Amount must be greater than zero";
  const bytes = new TextEncoder().encode(params.message ?? "").length;
  if (bytes > MAX_TRANSFER_MESSAGE_LENGTH) {
    return `Message is ${bytes} bytes; the limit is ${MAX_TRANSFER_MESSAGE_LENGTH}`;
  }
  return undefined;
}
