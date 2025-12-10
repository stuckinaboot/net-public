# @net-protocol/core

Core Net protocol SDK for interacting with Net smart contracts. Provides both React hooks and non-React utility functions for reading Net messages and message counts.

## Installation

```bash
npm install @net-protocol/core wagmi viem react
# or
yarn add @net-protocol/core wagmi viem react
```

## Usage

### React Hooks

```typescript
import { useNetMessages, useNetMessageCount, NetProvider } from "@net-protocol/core";

function App() {
  return (
    <NetProvider overrides={{ rpcUrls: { 8453: ["https://custom-rpc.com"] } }}>
      <MyComponent />
    </NetProvider>
  );
}

function MyComponent() {
  const { messages, isLoading } = useNetMessages({
    chainId: 8453,
    filter: { appAddress: "0x..." },
    startIndex: 0,
    endIndex: 10,
  });

  const { count } = useNetMessageCount({
    chainId: 8453,
    filter: { appAddress: "0x..." },
  });

  return <div>Messages: {messages.length}, Total: {count}</div>;
}
```

### Non-React Utilities

```typescript
import { NetClient, getNetMessages, getNetMessageCount } from "@net-protocol/core";

// Using NetClient class
const client = new NetClient({
  chainId: 8453,
  overrides: { rpcUrls: ["https://custom-rpc.com"] },
});

const messages = await client.getMessages({
  filter: { appAddress: "0x..." },
  startIndex: 0,
  endIndex: 10,
});

// Using standalone functions
const messages = await getNetMessages({
  chainId: 8453,
  filter: { appAddress: "0x..." },
  startIndex: 0,
  endIndex: 10,
  rpcUrl: "https://custom-rpc.com", // Optional per-call override
});
```

## API Reference

See the [API documentation](./docs/api-reference.md) for complete API details.

## Supported Chains

- Base (8453)
- Ethereum Mainnet (1)
- Degen Chain (666666666)
- Ham Chain (5112)
- Ink Chain (57073)
- Unichain (130)
- Hyperliquid EVM (999)
- Plasma Chain (9745)
- Monad Chain (143)
- Base Sepolia (84532) - testnet
- Sepolia (11155111) - testnet

## License

MIT

