import type { Abi, Address } from "viem";

/** Token address recorded for native ETH sends */
export const NATIVE_TOKEN_ADDRESS =
  "0x0000000000000000000000000000000000000000" as Address;

/** Maximum note length in bytes, enforced on-chain */
export const MAX_TRANSFER_MESSAGE_LENGTH = 1024;

/** Topic prefix for the recipient; the full topic is `to-<lowercase address>` */
export const TRANSFER_TOPIC_PREFIX = "to-";

export const TOKEN_TRANSFER_ABI = [
  {
    type: "function",
    name: "send",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "message", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "sendNative",
    stateMutability: "payable",
    inputs: [
      { name: "to", type: "address" },
      { name: "message", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "sendWithPermit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "message", type: "string" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getTokenTransferCount",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getTokenTransfers",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "startIdx", type: "uint256" },
      { name: "endIdx", type: "uint256" },
    ],
    outputs: [
      {
        name: "messages",
        type: "tuple[]",
        components: [
          { name: "app", type: "address" },
          { name: "sender", type: "address" },
          { name: "timestamp", type: "uint256" },
          { name: "data", type: "bytes" },
          { name: "text", type: "string" },
          { name: "topic", type: "string" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "TokenSent",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "netMessageIndex", type: "uint256", indexed: false },
    ],
  },
  { type: "error", name: "ZeroAmount", inputs: [] },
  { type: "error", name: "ZeroRecipient", inputs: [] },
  { type: "error", name: "MessageTooLong", inputs: [] },
  { type: "error", name: "NativeTransferFailed", inputs: [] },
] as const satisfies Abi;

/**
 * NetTokenTransfer — same CREATE2 address on every chain it is deployed to.
 */
export const TOKEN_TRANSFER_CONTRACT = {
  address: "0x000000a169fE01175bb91d35A70A852ebDC9D869" as Address,
  abi: TOKEN_TRANSFER_ABI,
} as const;

/** Chains where NetTokenTransfer is deployed */
export const SUPPORTED_TRANSFER_CHAINS = [8453] as const;

