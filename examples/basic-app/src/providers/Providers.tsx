"use client";

import { useState, useEffect } from "react";
import { WagmiProvider, http } from "wagmi";
import { base } from "wagmi/chains";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { NetProvider } from "@net-protocol/core";
import "@rainbow-me/rainbowkit/styles.css";

/**
 * Providers setup
 * Creates config synchronously on client using useState initializer
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Create config synchronously on client-side only
  const [wagmiConfig] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return getDefaultConfig({
      appName: "Net Protocol Example App",
      projectId: "YOUR_PROJECT_ID",
      chains: [base],
      transports: {
        [base.id]: http(),
      },
      ssr: true,
    });
  });

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render WagmiProvider until mounted (prevents hydration issues)
  // Match Net site pattern: return null (not loading div) until ready
  if (!isMounted || !wagmiConfig) {
    return null;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider>
        <NetProvider>{children}</NetProvider>
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
