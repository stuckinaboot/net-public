import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { mock } from "wagmi/connectors";
import type { Address } from "viem";

export interface MockWagmiOptions {
  address?: Address;
  chainId?: number;
}

export const TEST_ADDRESSES = {
  USER: "0x1234567890123456789012345678901234567890" as Address,
  TOKEN: "0xabcdef0123456789abcdef0123456789abcdef01" as Address,
  WETH: "0x4200000000000000000000000000000000000006" as Address,
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
};

export function createMockWagmiConfig(options: MockWagmiOptions = {}): ReturnType<typeof createConfig> {
  const { address = TEST_ADDRESSES.USER } = options;

  return createConfig({
    chains: [base, baseSepolia],
    connectors: [
      mock({
        accounts: [address],
        features: { reconnect: true },
      }),
    ],
    transports: {
      [base.id]: http(),
      [baseSepolia.id]: http(),
    },
  });
}
