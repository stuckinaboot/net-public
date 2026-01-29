"use client";

import { useState, useEffect } from "react";
import { WagmiProvider, http, createConfig, useConnect, useAccount } from "wagmi";
import { base } from "wagmi/chains";
import { mock } from "wagmi/connectors";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { NetProvider } from "@net-protocol/core";
import "@rainbow-me/rainbowkit/styles.css";

// Test mode address - matches e2e/fixtures/mock-wallet.ts
const TEST_ADDRESS = "0x1234567890123456789012345678901234567890" as const;

// Extend window type for test mode flag
declare global {
  interface Window {
    __E2E_TEST_MODE__?: boolean;
  }
}

/**
 * Create wagmi config for E2E test mode
 * Uses mock connector that auto-connects with test address
 */
function createTestConfig() {
  return createConfig({
    chains: [base],
    connectors: [
      mock({
        accounts: [TEST_ADDRESS],
        features: { reconnect: true },
      }),
    ],
    transports: {
      [base.id]: http(),
    },
  });
}

/**
 * Create wagmi config for production mode
 * Uses RainbowKit's default configuration
 */
function createProductionConfig() {
  return getDefaultConfig({
    appName: "Net Protocol Example App",
    projectId: "YOUR_PROJECT_ID",
    chains: [base],
    transports: {
      [base.id]: http(),
    },
    ssr: true,
  });
}

/**
 * Auto-connect component for test mode
 * Automatically connects the mock connector when in test mode
 */
function TestModeAutoConnect() {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected && connectors.length > 0) {
      // Connect using the first available connector (mock connector in test mode)
      connect({ connector: connectors[0] });
    }
  }, [connect, connectors, isConnected]);

  return null;
}

/**
 * Providers setup
 * Creates config synchronously on client using useState initializer
 * Supports E2E test mode with auto-connected mock wallet
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [wagmiConfig] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    // Check for E2E test mode flag (set by Playwright tests)
    if (window.__E2E_TEST_MODE__) {
      return createTestConfig();
    }

    return createProductionConfig();
  });

  const [isMounted, setIsMounted] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsTestMode(!!window.__E2E_TEST_MODE__);
  }, []);

  // Don't render WagmiProvider until mounted (prevents hydration issues)
  if (!isMounted || !wagmiConfig) {
    return null;
  }

  // Always use RainbowKitProvider (even in test mode) because
  // components like ConnectButton depend on it
  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider>
        {isTestMode && <TestModeAutoConnect />}
        <NetProvider>{children}</NetProvider>
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
