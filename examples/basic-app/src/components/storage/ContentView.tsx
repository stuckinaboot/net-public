"use client";

import { useStorage } from "@net-protocol/storage/react";
import { formatStorageKeyForDisplay } from "@net-protocol/storage";
import { CHAIN_ID } from "@/lib/constants";

interface ContentViewProps {
  storageKey: string;
  operatorAddress: string;
  onBack: () => void;
}

/**
 * ContentView component displays a single stored item
 * 
 * Demonstrates:
 * - useStorage with useRouter: true for automatic storage type detection
 * - outputFormat: "string" to get readable text instead of hex
 * - Displaying storage metadata and content
 * 
 * The useRouter option automatically detects whether data is stored in:
 * - Regular Storage (< 20KB)
 * - Chunked Storage (20KB-80KB, compressed)
 * - XML Storage (multi-MB, via references)
 */
export function ContentView({ storageKey, operatorAddress, onBack }: ContentViewProps) {
  const { data, isLoading } = useStorage({
    chainId: CHAIN_ID,
    key: storageKey,
    operatorAddress: operatorAddress,
    useRouter: true,      // Automatically detect storage type
    outputFormat: "string", // Get data as readable string
  });

  const { displayText } = formatStorageKeyForDisplay(storageKey);

  if (isLoading) {
    return (
      <div className="p-4">
        <button
          onClick={onBack}
          className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to list
        </button>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading content...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        <button
          onClick={onBack}
          className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to list
        </button>
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">Failed to load content</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <button
        onClick={onBack}
        className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
      >
        ← Back to list
      </button>

      <div className="space-y-4">
        {/* Metadata */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Metadata</h3>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-medium">Key:</span>{" "}
              <span className="font-mono text-gray-600 dark:text-gray-400">
                {displayText}
              </span>
            </div>
            {data.text && (
              <div>
                <span className="font-medium">Description:</span>{" "}
                <span className="text-gray-600 dark:text-gray-400">{data.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Content</h3>
          <pre className="whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-gray-100 font-mono">
            {data.value}
          </pre>
        </div>
      </div>
    </div>
  );
}

