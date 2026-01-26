"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { TabLayout } from "@/components/layout/TabLayout";
import { ChatTab } from "@/components/chat/ChatTab";
import { StorageTab } from "@/components/storage/StorageTab";
import { LaunchTab } from "@/components/launch/LaunchTab";

type Tab = "chat" | "storage" | "launch";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <TabLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "chat" && <ChatTab />}
        {activeTab === "storage" && <StorageTab />}
        {activeTab === "launch" && <LaunchTab />}
      </TabLayout>
    </div>
  );
}
