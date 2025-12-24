"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { TabLayout } from "@/components/layout/TabLayout";
import { ChatTab } from "@/components/chat/ChatTab";
import { StorageTab } from "@/components/storage/StorageTab";

type Tab = "chat" | "storage";

/**
 * Main page component
 * Combines header, tab navigation, and tab content
 */
export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex-1 overflow-hidden">
        <TabLayout activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === "chat" ? <ChatTab /> : <StorageTab />}
        </TabLayout>
      </div>
    </div>
  );
}

