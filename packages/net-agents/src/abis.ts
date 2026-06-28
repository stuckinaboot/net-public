/**
 * ABI definitions for contracts used by the agents SDK.
 *
 * Only includes the specific functions needed — not the full ABIs.
 */

/** Minimal ABI for the bulk helper contract (conversation listing) */
export const BULK_HELPER_ABI = [
  {
    type: "function",
    name: "getConversationList",
    inputs: [
      { name: "app", type: "address", internalType: "address" },
      { name: "user", type: "address", internalType: "address" },
      { name: "indexTopic", type: "string", internalType: "string" },
      {
        name: "maxPreviewLength",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "infos",
        type: "tuple[]",
        internalType: "struct NetMessageCountBulkHelper.TopicInfo[]",
        components: [
          {
            name: "messageCount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "lastMessageTimestamp",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "lastMessageData",
            type: "bytes",
            internalType: "bytes",
          },
          {
            name: "lastMessageText",
            type: "string",
            internalType: "string",
          },
        ],
      },
      { name: "topics", type: "string[]", internalType: "string[]" },
    ],
    stateMutability: "view",
  },
] as const;

/**
 * Minimal ABI for WillieNet message reading (conversation history).
 * The full ABI lives in @net-protocol/core — we only need these two functions.
 */
export const NET_MESSAGE_ABI = [
  {
    type: "function",
    name: "getTotalMessagesForAppUserTopicCount",
    inputs: [
      { name: "app", type: "address", internalType: "address" },
      { name: "user", type: "address", internalType: "address" },
      { name: "topic", type: "string", internalType: "string" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMessagesInRangeForAppUserTopic",
    inputs: [
      { name: "startIndex", type: "uint256", internalType: "uint256" },
      { name: "endIndex", type: "uint256", internalType: "uint256" },
      { name: "app", type: "address", internalType: "address" },
      { name: "user", type: "address", internalType: "address" },
      { name: "topic", type: "string", internalType: "string" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct INet.Message[]",
        components: [
          { name: "sender", type: "address", internalType: "address" },
          { name: "app", type: "address", internalType: "address" },
          { name: "timestamp", type: "uint256", internalType: "uint256" },
          { name: "text", type: "string", internalType: "string" },
          { name: "data", type: "bytes", internalType: "bytes" },
          { name: "topic", type: "string", internalType: "string" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;
