// Message types
export type NetMessage = {
  app: `0x${string}`;
  sender: `0x${string}`;
  timestamp: bigint;
  data: `0x${string}`;
  text: string;
  topic: string;
};

// Filter for querying messages
export type NetMessageFilter = {
  appAddress: `0x${string}`;
  topic?: string;
  maker?: `0x${string}`; // user address
};

// Client method options (no chainId, no rpcUrl - uses client's chainId)
export type NetClientMessagesOptions = {
  filter?: NetMessageFilter;
  startIndex?: number;
  endIndex?: number;
};

export type NetClientMessageCountOptions = {
  filter?: NetMessageFilter;
};

// Options for reading messages (hooks still need chainId)
export type GetNetMessagesOptions = {
  chainId: number;
  filter?: NetMessageFilter;
  startIndex?: number;
  endIndex?: number;
  rpcUrl?: string | string[];
};

// Options for message count (hooks still need chainId)
export type GetNetMessageCountOptions = {
  chainId: number;
  filter?: NetMessageFilter;
  rpcUrl?: string | string[];
};

// Extended options for hooks (includes React-specific options)
export type UseNetMessagesOptions = GetNetMessagesOptions & {
  enabled?: boolean;
};

export type UseNetMessageCountOptions = GetNetMessageCountOptions & {
  refetchInterval?: number;
  enabled?: boolean;
};

export type UseNetMessagesBatchAsyncOptions = UseNetMessagesOptions & {
  batchCount?: number;
};

// Transaction writing types
import type { Abi } from "viem";

export type WriteTransactionConfig = {
  to: `0x${string}`;           // Contract address
  functionName: string;         // Contract function name
  args: unknown[];             // Function arguments
  value?: bigint;               // Optional ETH value to send
  abi: Abi;                    // Contract ABI (from viem)
};

