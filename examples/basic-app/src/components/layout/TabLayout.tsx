"use client";

import { ReactNode } from "react";

type Tab = "chat" | "storage" | "launch";

interface TabLayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: ReactNode;
}

/**
 * Tab navigation layout component
 * Provides a simple tab switcher between Chat and Storage views
 */
export function TabLayout({ activeTab, onTabChange, children }: TabLayoutProps) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "chat", label: "Chat" },
    { id: "storage", label: "Storage" },
    { id: "launch", label: "Launch" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab buttons */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

