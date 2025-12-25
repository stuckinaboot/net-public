"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { NET_CONTRACT_ABI } from "@net-protocol/core";
import { NET_CONTRACT_ADDRESS } from "@/lib/constants";

interface SendMessageProps {
  topic: string;
}

/**
 * SendMessage component for sending messages to the blockchain
 * 
 * Demonstrates:
 * - Using wagmi's useWriteContract to call Net Protocol's sendMessage function
 * - Transaction status handling (pending, success, error)
 * - Form state management
 * 
 * Net Protocol sendMessage signature:
 * function sendMessage(string text, string topic, bytes data)
 */
export function SendMessage({ topic }: SendMessageProps) {
  const [message, setMessage] = useState("");
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      // Call the Net Protocol sendMessage function
      writeContract({
        address: NET_CONTRACT_ADDRESS,
        abi: NET_CONTRACT_ABI,
        functionName: "sendMessage",
        args: [
          message,       // text: the message content
          topic,         // topic: the conversation topic
          "0x"          // data: optional additional data (empty for this example)
        ],
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Clear message on successful transaction
  if (isSuccess && message) {
    setMessage("");
  }

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-800">
      <div className="flex flex-col gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isPending || isConfirming}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
        />
        
        <div className="flex items-center justify-between">
          <div className="text-sm">
            {isPending && <span className="text-yellow-600">Sending transaction...</span>}
            {isConfirming && <span className="text-blue-600">Waiting for confirmation...</span>}
            {isSuccess && <span className="text-green-600">Message sent!</span>}
            {error && <span className="text-red-600">Error: {error.message}</span>}
          </div>
          
          <button
            onClick={handleSend}
            disabled={!message.trim() || isPending || isConfirming}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isPending || isConfirming ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

