"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { NetProvider } from "@net-protocol/core/react";
import { createMockWagmiConfig, type MockWagmiOptions } from "./mock-wagmi-config";

interface TestProvidersProps {
  children: React.ReactNode;
  wagmiOptions?: MockWagmiOptions;
}

export function TestProviders({ children, wagmiOptions = {} }: TestProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  const mockConfig = createMockWagmiConfig(wagmiOptions);

  return (
    <WagmiProvider config={mockConfig}>
      <QueryClientProvider client={queryClient}>
        <NetProvider>{children}</NetProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
