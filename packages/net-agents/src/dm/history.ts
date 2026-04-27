/**
 * Direct chain reads for DM conversation listing and history.
 *
 * Mirrors the frontend's useConversationList and loadConversationHistory
 * from useAIChat.ts — but as standalone functions for SDK/CLI use.
 */

import type { Address, Hex, PublicClient } from "viem";
import { hexToString, stringToHex } from "viem";
import { readContract } from "viem/actions";
import {
  NET_CONTRACT_ADDRESS,
  NET_MESSAGE_COUNT_BULK_HELPER_ADDRESS,
  CONVERSATION_INDEX_TOPIC,
  DEFAULT_MAX_CONVERSATIONS,
  DEFAULT_MAX_HISTORY_MESSAGES,
} from "../constants";
import { BULK_HELPER_ABI, NET_MESSAGE_ABI } from "../abis";
import { getMessageType, isMessageEncrypted } from "./messageTypes";
import type { ConversationInfo, ChatMessage } from "../types";

interface TopicInfo {
  messageCount: bigint;
  lastMessageTimestamp: bigint;
  lastMessageData: Hex;
  lastMessageText: string;
}

/**
 * List DM conversations for a user via the bulk helper contract
 * (single RPC call, same approach as the frontend).
 *
 * @param publicClient - viem PublicClient for the target chain
 * @param chatContractAddress - AI Chat contract address for the chain
 * @param userAddress - User's wallet address
 * @param limit - Max conversations to fetch (default DEFAULT_MAX_CONVERSATIONS)
 */
export async function listConversations(
  publicClient: PublicClient,
  chatContractAddress: Address,
  userAddress: Address,
  limit: number = DEFAULT_MAX_CONVERSATIONS,
): Promise<ConversationInfo[]> {
  const data = await readContract(publicClient, {
    address: NET_MESSAGE_COUNT_BULK_HELPER_ADDRESS,
    abi: BULK_HELPER_ABI,
    functionName: "getConversationList",
    args: [chatContractAddress, userAddress, CONVERSATION_INDEX_TOPIC, BigInt(limit)],
  });

  const [infos, topics] = data as [TopicInfo[], string[]];

  return infos
    .map((info, i) => {
      // Same field swap as getConversationHistory: the marker byte is in
      // the contract's `text` field (here surfaced as `lastMessageText`)
      // as a raw string, and the human-readable plaintext is in
      // `lastMessageData` as bytes.
      const envelopeHex =
        info.lastMessageText && info.lastMessageText.length > 0
          ? stringToHex(info.lastMessageText)
          : "0x";
      const isEncrypted = isMessageEncrypted(envelopeHex);
      let preview = "";
      if (
        !isEncrypted &&
        info.lastMessageData &&
        info.lastMessageData !== "0x"
      ) {
        try {
          preview = hexToString(info.lastMessageData).slice(0, 100);
        } catch {
          // Non-UTF8 — leave empty.
        }
      }
      return {
        topic: topics[i],
        messageCount: Number(info.messageCount),
        lastMessageTimestamp: Number(info.lastMessageTimestamp),
        isEncrypted,
        lastMessage: preview,
      };
    })
    .filter((c) => c.messageCount > 0)
    .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
}

/**
 * Load conversation history for a DM topic.
 *
 * When `limit` is provided, fetches only the most recent `limit` messages
 * (saves RPC bandwidth for long conversations). Otherwise fetches up to
 * DEFAULT_MAX_HISTORY_MESSAGES.
 *
 * @param publicClient - viem PublicClient for the target chain
 * @param chatContractAddress - AI Chat contract address for the chain
 * @param userAddress - User's wallet address
 * @param topic - Conversation topic
 * @param limit - Max recent messages to fetch (default DEFAULT_MAX_HISTORY_MESSAGES)
 */
export async function getConversationHistory(
  publicClient: PublicClient,
  chatContractAddress: Address,
  userAddress: Address,
  topic: string,
  limit: number = DEFAULT_MAX_HISTORY_MESSAGES,
): Promise<ChatMessage[]> {
  const messageCount = (await readContract(publicClient, {
    address: NET_CONTRACT_ADDRESS,
    abi: NET_MESSAGE_ABI,
    functionName: "getTotalMessagesForAppUserTopicCount",
    args: [chatContractAddress, userAddress, topic],
  })) as bigint;

  if (!messageCount || messageCount === BigInt(0)) {
    return [];
  }

  const total = Number(messageCount);
  const startIndex = Math.max(0, total - limit);

  const rawMessages = await readContract(publicClient, {
    address: NET_CONTRACT_ADDRESS,
    abi: NET_MESSAGE_ABI,
    functionName: "getMessagesInRangeForAppUserTopic",
    args: [
      BigInt(startIndex),
      messageCount,
      chatContractAddress,
      userAddress,
      topic,
    ],
  });

  return (
    rawMessages as unknown as Array<{
      text: string;
      data: Hex;
      sender: Address;
      timestamp: bigint;
    }>
  ).map((msg) => {
    // The on-chain message envelope (version byte + type marker + optional
    // metadata like model id) lives in the contract's `text` field as a raw
    // string; the human-readable plaintext is stored as bytes in the
    // contract's `data` field. Convert `text` to hex so getMessageType /
    // isMessageEncrypted can read the marker byte; decode the plaintext
    // from `data`.
    const envelopeHex =
      msg.text && msg.text.length > 0 ? stringToHex(msg.text) : "0x";
    const msgType = getMessageType(envelopeHex);
    const isAI = msgType === "ai" || msgType === "encrypted_ai";
    const isEncrypted = isMessageEncrypted(envelopeHex);

    let plaintext = "";
    if (!isEncrypted && msg.data && msg.data !== "0x") {
      try {
        plaintext = hexToString(msg.data);
      } catch {
        // Non-UTF8 bytes — leave plaintext empty; raw `data` is preserved below.
      }
    }

    return {
      text: plaintext,
      sender: isAI ? ("ai" as const) : ("user" as const),
      timestamp: Number(msg.timestamp),
      encrypted: isEncrypted,
      envelope: msg.text,
      data: msg.data,
    };
  });
}
