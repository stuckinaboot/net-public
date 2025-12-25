"use client";

import { CHAT_TOPICS } from "@/lib/constants";

interface TopicSelectorProps {
  selectedTopic: string;
  onTopicChange: (topic: string) => void;
}

/**
 * Topic selector dropdown for chat
 * Allows users to switch between predefined chat topics
 * Each topic represents a separate conversation thread
 */
export function TopicSelector({ selectedTopic, onTopicChange }: TopicSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="topic-select" className="font-medium text-gray-700 dark:text-gray-300">
        Topic:
      </label>
      <select
        id="topic-select"
        value={selectedTopic}
        onChange={(e) => onTopicChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {CHAT_TOPICS.map((topic) => (
          <option key={topic} value={topic}>
            {topic}
          </option>
        ))}
      </select>
    </div>
  );
}

