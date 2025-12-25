"use client";

import { useState } from "react";
import { UploadForm } from "./UploadForm";
import { ContentList } from "./ContentList";
import { ContentView } from "./ContentView";
import { useWalletRequirement } from "@/hooks/useWalletRequirement";

type View = "list" | "upload" | "view";

/**
 * StorageTab component - Main container for storage functionality
 * 
 * Combines:
 * - UploadForm: Store new data on the blockchain
 * - ContentList: View all stored items
 * - ContentView: Display individual stored item
 * 
 * Requires wallet connection for all operations
 */
export function StorageTab() {
  const [currentView, setCurrentView] = useState<View>("list");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const { isConnected, requirementMessage, address } = useWalletRequirement();

  const handleSelectContent = (key: string) => {
    setSelectedKey(key);
    setCurrentView("view");
  };

  const handleUploadSuccess = () => {
    setCurrentView("list");
    setRefreshKey((prev) => prev + 1); // Trigger refresh of content list
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto h-full flex items-center justify-center">
        <div className="text-center p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-200 mb-2">
            {requirementMessage}
          </p>
          <p className="text-sm text-yellow-600 dark:text-yellow-300">
            Storage operations require a connected wallet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto h-full flex flex-col">
      {/* Header with view switcher */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-1">Storage</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Store and retrieve data permanently on the blockchain
          </p>
        </div>
        
        {currentView !== "view" && (
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView("list")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              My Content
            </button>
            <button
              onClick={() => setCurrentView("upload")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === "upload"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Upload New
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {currentView === "list" && (
          <ContentList
            key={refreshKey}
            operatorAddress={address!}
            onSelectContent={handleSelectContent}
          />
        )}
        {currentView === "upload" && <UploadForm onSuccess={handleUploadSuccess} />}
        {currentView === "view" && (
          <ContentView
            storageKey={selectedKey}
            operatorAddress={address!}
            onBack={() => setCurrentView("list")}
          />
        )}
      </div>
    </div>
  );
}

