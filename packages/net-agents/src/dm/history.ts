/**
 * Direct chain reads for DM conversation listing and history.
 *
 * Mirrors the frontend's useConversationList and loadConversationHistory
 * from useAIChat.ts — but as standalone functions for SDK/CLI use.
 */

import type { Address, Hex, PublicClient } from "viem";
import { readContract } from "viem/actions";
import {
  NET_CONTRACT_ADDRESS,
  NET_MESSAGE_COUNT_BULK_HELPER_ADDRESS,
  CONVERSATION_INDEX_TOPIC,
} from "../constants";
import { BULK_HELPER_ABI, NET_MESSAGE_ABI } from "../abis";
import { getMessageType, isMessageEncrypted } from "./messageTypes";
import type { ConversationInfo, ChatMessage } from "../types";

// Raw response from the bulk helper contract
interface TopicInfo {
  messageCount: bigint;
  lastMessageTimestamp: bigint;
  lastMessageData: Hex;
  lastMessageText: string;
}

/**
 * List all DM conversations for a user.
 *
 * Reads directly from the bulk helper contract (single RPC call),
 * same approach as the frontend's useConversationList hook.
 *
 * @param publicClient - viem PublicClient for the target chain
 * @param chatContractAddress - AI Chat contract address for the chain
 * @param userAddress - User's wallet address
 * @returns Array of conversations sorted by most recent first
 */
export async function listConversations(
  publicClient: PublicClient,
  chatContractAddress: Address,
  userAddress: Address,
): Promise<ConversationInfo[]> {
  const data = await readContract(publicClient, {
    address: NET_MESSAGE_COUNT_BULK_HELPER_ADDRESS,
    abi: BULK_HELPER_ABI,
    functionName: "getConversationList",
    args: [chatContractAddress, userAddress, CONVERSATION_INDEX_TOPIC, BigInt(100)],
  });

  const [infos, topics] = data as [TopicInfo[], string[]];

  return infos
    .map((info, i) => ({
      topic: topics[i],
      messageCount: Number(info.messageCount),
      lastMessageTimestamp: Number(info.lastMessageTimestamp),
      isEncrypted: isMessageEncrypted(info.lastMessageData),
      lastMessage: info.lastMessageText?.slice(0, 100),
    }))
    .filter((c) => c.messageCount > 0)
    .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
}

/**
 * Load conversation history from the chain.
 *
 * Reads messages directly from the WillieNet contract,
 * same approach as the frontend's loadConversationHistory.
 *
 * @param publicClient - viem PublicClient for the target chain
 * @param chatContractAddress - AI Chat contract address for the chain
 * @param userAddress - User's wallet address
 * @param topic - Conversation topic
 * @returns Array of messages in chronological order
 */
export async function getConversationHistory(
  publicClient: PublicClient,
  chatContractAddress: Address,
  userAddress: Address,
  topic: string,
): Promise<ChatMessage[]> {
  const messageCount = await readContract(publicClient, {
    address: NET_CONTRACT_ADDRESS,
    abi: NET_MESSAGE_ABI,
    functionName: "getTotalMessagesForAppUserTopicCount",
    args: [chatContractAddress, userAddress, topic],
  });

  if (!messageCount || BigInt(messageCount as bigint) === BigInt(0)) {
    return [];
  }

  const rawMessages = await readContract(publicClient, {
    address: NET_CONTRACT_ADDRESS,
    abi: NET_MESSAGE_ABI,
    functionName: "getMessagesInRangeForAppUserTopic",
    args: [
      BigInt(0),
      messageCount as bigint,
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
    const msgType = getMessageType(msg.data);
    const isAI = msgType === "ai" || msgType === "encrypted_ai";
    const isEncrypted =
      msgType === "encrypted_human" || msgType === "encrypted_ai";

    return {
      text: msg.text,
      sender: isAI ? ("ai" as const) : ("user" as const),
      timestamp: Number(msg.timestamp),
      encrypted: isEncrypted,
      data: msg.data,
    };
  });
}
