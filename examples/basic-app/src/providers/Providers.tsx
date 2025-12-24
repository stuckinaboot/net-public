"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { base } from "wagmi/chains";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { NetProvider } from "@net-protocol/core";
import "@rainbow-me/rainbowkit/styles.css";

// Configure wagmi for Base chain
const config = getDefaultConfig({
  appName: "Net Protocol Example App",
  projectId: "YOUR_PROJECT_ID", // Get from https://cloud.walletconnect.com
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});

// Create a react-query client
const queryClient = new QueryClient();

/**
 * Root providers for the application
 * Wraps the app with all necessary context providers:
 * - WagmiProvider: Wallet connection and blockchain interactions
 * - QueryClientProvider: React Query for data fetching
 * - RainbowKitProvider: Wallet connection UI
 * - NetProvider: Net Protocol message hooks
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <NetProvider>{children}</NetProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

