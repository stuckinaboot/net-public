"use client";

import { useEffect, useRef } from "react";
import { useNetMessages, useNetMessageCount } from "@net-protocol/core";
import { CHAIN_ID, NULL_ADDRESS } from "@/lib/constants";
import { truncateAddress, formatRelativeTime } from "@/lib/utils";

interface MessageListProps {
  topic: string;
}

/**
 * MessageList component displays the most recent 20 messages for a topic
 * Uses Net Protocol hooks to fetch and display messages from the blockchain
 * 
 * Key concepts demonstrated:
 * - useNetMessageCount: Get total number of messages for a filter
 * - useNetMessages: Fetch a range of messages
 * - NULL_ADDRESS: Used for topic-based global messaging
 */
export function MessageList({ topic }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get total message count for this topic
  const { count: totalCount } = useNetMessageCount({
    chainId: CHAIN_ID,
    filter: {
      appAddress: NULL_ADDRESS, // NULL_ADDRESS for topic-based messaging
      topic: topic,
    },
  });

  // Calculate the range to fetch the last 20 messages
  const endIndex = totalCount || 0;
  const startIndex = Math.max(0, endIndex - 20);

  // Fetch messages in the calculated range
  const { messages, isLoading } = useNetMessages({
    chainId: CHAIN_ID,
    filter: {
      appAddress: NULL_ADDRESS,
      topic: topic,
    },
    startIndex,
    endIndex,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading messages...</p>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No messages yet</p>
          <p className="text-sm text-gray-400">Be the first to send a message!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {truncateAddress(message.sender)}
            </span>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(Number(message.timestamp))}
            </span>
          </div>
          <p className="text-gray-900 dark:text-gray-100 break-words">{message.text}</p>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

