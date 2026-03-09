"use client";

import { FEATURED_CHATS } from "@/lib/constants";

interface FeaturedChatsProps {
  selectedTopic: string;
  onTopicChange: (topic: string) => void;
}

export function FeaturedChats({ selectedTopic, onTopicChange }: FeaturedChatsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FEATURED_CHATS.map(({ topic, description }) => (
        <button
          key={topic}
          onClick={() => onTopicChange(topic)}
          className={`px-3 py-2 rounded-lg border text-left transition-colors ${
            selectedTopic === topic
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300"
          }`}
        >
          <span className="font-medium text-sm">{topic}</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">{description}</span>
        </button>
      ))}
    </div>
  );
}
