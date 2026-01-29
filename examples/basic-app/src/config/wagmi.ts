import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base } from "wagmi/chains";
import { http, createConfig } from "wagmi";
import { mock } from "wagmi/connectors";

// Test mode address - matches e2e/fixtures/mock-wallet.ts
const TEST_ADDRESS = "0x1234567890123456789012345678901234567890" as const;

export const config = getDefaultConfig({
  appName: "Net Protocol Example App",
  projectId: "YOUR_PROJECT_ID",
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});

/**
 * Config for E2E test mode with mock connector
 */
export const testConfig = createConfig({
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
  ssr: true,
});
