"use client";

import { useStorageForOperator } from "@net-protocol/storage/react";
import { formatStorageKeyForDisplay } from "@net-protocol/storage";
import { CHAIN_ID } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";

interface ContentListProps {
  operatorAddress: string;
  onSelectContent: (key: string) => void;
}

/**
 * ContentList component displays all storage items for a user
 * 
 * Demonstrates:
 * - useStorageForOperator: Fetches all storage entries for a wallet address
 * - Formatting storage keys for display
 * - Handling empty states
 * 
 * Returns array of [key, value, timestamp, data] tuples
 */
export function ContentList({ operatorAddress, onSelectContent }: ContentListProps) {
  const { data, isLoading } = useStorageForOperator({
    chainId: CHAIN_ID,
    operatorAddress: operatorAddress,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading your stored content...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No stored content yet</p>
          <p className="text-sm text-gray-400">
            Upload some data to see it here
          </p>
        </div>
      </div>
    );
  }

  // Group by key and keep only the latest version
  const latestByKey = new Map<string, { key: string; timestamp: number; text: string }>();
  
  data.forEach(([rawKey, text, timestamp]) => {
    const { displayText } = formatStorageKeyForDisplay(rawKey as string);
    const existing = latestByKey.get(displayText);
    
    if (!existing || Number(timestamp) > existing.timestamp) {
      latestByKey.set(displayText, {
        key: rawKey as string,
        timestamp: Number(timestamp),
        text: text as string,
      });
    }
  });

  const sortedItems = Array.from(latestByKey.values()).sort(
    (a, b) => b.timestamp - a.timestamp
  );

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-lg font-semibold mb-4">Your Stored Content</h3>
      {sortedItems.map((item, index) => {
        const { displayText } = formatStorageKeyForDisplay(item.key);
        
        return (
          <button
            key={index}
            onClick={() => onSelectContent(item.key)}
            className="w-full text-left p-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {item.text || displayText}
              </span>
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                {formatRelativeTime(item.timestamp)}
              </span>
            </div>
            <span className="text-sm text-gray-500 font-mono truncate block">
              {displayText}
            </span>
          </button>
        );
      })}
    </div>
  );
}

