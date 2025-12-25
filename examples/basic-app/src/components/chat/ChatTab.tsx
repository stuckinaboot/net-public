"use client";

import { useState } from "react";
import { TopicSelector } from "./TopicSelector";
import { MessageList } from "./MessageList";
import { SendMessage } from "./SendMessage";
import { useWalletRequirement } from "@/hooks/useWalletRequirement";
import { CHAT_TOPICS } from "@/lib/constants";

/**
 * ChatTab component - Main container for chat functionality
 * 
 * Combines:
 * - TopicSelector: Choose which conversation to view
 * - MessageList: Display messages for the selected topic
 * - SendMessage: Send new messages to the topic
 * 
 * Requires wallet connection to send messages (reading is public)
 */
export function ChatTab() {
  const [selectedTopic, setSelectedTopic] = useState(CHAT_TOPICS[0]);
  const { isConnected, requirementMessage } = useWalletRequirement();

  return (
    <div className="container mx-auto h-full flex flex-col">
      {/* Header with topic selector */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="mb-2">
          <h2 className="text-xl font-semibold mb-1">Chat</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Messages are stored permanently on the blockchain
          </p>
        </div>
        <TopicSelector selectedTopic={selectedTopic} onTopicChange={setSelectedTopic} />
      </div>

      {/* Messages area (scrollable) */}
      <div className="flex-1 overflow-y-auto">
        <MessageList topic={selectedTopic} />
      </div>

      {/* Send message section */}
      {isConnected ? (
        <SendMessage topic={selectedTopic} />
      ) : (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-center text-yellow-800 dark:text-yellow-200">
            {requirementMessage}
          </p>
        </div>
      )}
    </div>
  );
}

