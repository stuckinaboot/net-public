"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useConnect, useAccount } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { NetProvider } from "@net-protocol/core";
import { config, testConfig } from "@/config/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

// Extend window type for test mode flag
declare global {
  interface Window {
    __E2E_TEST_MODE__?: boolean;
  }
}

const queryClient = new QueryClient();

/**
 * Auto-connect component for test mode
 */
function TestModeAutoConnect() {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected && connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  }, [connect, connectors, isConnected]);

  return null;
}

/**
 * Providers following RainbowKit's official example
 * https://github.com/rainbow-me/rainbowkit/tree/main/examples/with-next-app
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [isTestMode] = useState(
    () => typeof window !== "undefined" && !!window.__E2E_TEST_MODE__
  );

  const activeConfig = isTestMode ? testConfig : config;

  return (
    <WagmiProvider config={activeConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {isTestMode && <TestModeAutoConnect />}
          <NetProvider>{children}</NetProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
