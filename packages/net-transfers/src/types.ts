import type { Address } from "viem";
import type { WriteTransactionConfig } from "@net-protocol/core";

/** A decoded transfer, read back from its Net message */
export type TokenTransfer = {
  from: Address;
  to: Address;
  /** Token address, or NATIVE_TOKEN_ADDRESS (zero address) for ETH */
  token: Address;
  amount: bigint;
  /** The note; may be empty */
  message: string;
  /** Unix seconds */
  timestamp: number;
};

/**
 * Which transfers to read. Exactly one shape:
 * - `{ sentBy }` — transfers sent by an address
 * - `{ receivedBy }` — transfers received by an address
 * - `{ sentBy, receivedBy }` — transfers from one address to another
 * - `{ token }` — every transfer of a token (zero address for ETH)
 */
export type TransferQuery =
  | { sentBy: Address; receivedBy?: Address; token?: never }
  | { sentBy?: Address; receivedBy: Address; token?: never }
  | { token: Address; sentBy?: never; receivedBy?: never };

/** A page of transfers plus the total matching the query */
export type TransfersPage = { total: number; transfers: TokenTransfer[] };

export type GetTransfersOptions = {
  /** Max rows to return (default 20) */
  limit?: number;
  /** Rows to skip from the newest (default 0) */
  offset?: number;
};

export type TokenTransferClientOptions = {
  chainId: number;
  overrides?: { rpcUrls?: string[]; contractAddress?: Address };
};

export type PrepareSendParams = {
  /** Token address, or NATIVE_TOKEN_ADDRESS for ETH */
  token: Address;
  to: Address;
  /** Base units (wei for ETH) */
  amount: bigint;
  message?: string;
  /** The address that will send; used to check the current allowance */
  sender: Address;
};

export type PreparedSend = {
  /** Approvals still needed, in order (empty for ETH or when allowance already covers it) */
  approvals: WriteTransactionConfig[];
  transaction: WriteTransactionConfig;
};
