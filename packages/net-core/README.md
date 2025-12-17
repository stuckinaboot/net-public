# @net-protocol/core

**Status: Alpha** - Usable but may have breaking changes over time. Suitable for early adopters and testing.

Core Net protocol SDK for reading and writing messages on the Net Protocol blockchain.

## What is Net Protocol?

Net Protocol is a decentralized onchain messaging system. Every message is stored permanently on the blockchain with multi-dimensional indexing, allowing efficient queries by app, user, topic, or combinations.

**Key concepts:**
- **Messages**: Permanent onchain records with text, data, and metadata
- **Apps**: Smart contracts that send messages (like applications)
- **Topics**: Categories for organizing messages
- **Indexing**: Query messages by app, user, topic, or combinations

## What can you do with this package?

- **Read messages**: Query messages by app, user, topic, or combinations
- **Get counts**: Count messages matching specific filters
- **Send messages**: Prepare transactions to send messages via app contracts
- **Build apps**: Create custom applications that use Net Protocol messaging

This package provides both React hooks (for UI) and client classes (for non-React code).

## Learn More

- [Net Protocol Documentation](https://docs.netprotocol.app) - Complete protocol documentation
- [How Net Works](https://docs.netprotocol.app/docs/02%20Core%20Protocol/how-net-works) - Technical architecture details
- [Smart Contract Reference](https://docs.netprotocol.app/docs/02%20Core%20Protocol/smart-contract-reference) - Complete API documentation

## Installation

```bash
npm install @net-protocol/core wagmi viem react
# or
yarn add @net-protocol/core wagmi viem react
```

## Usage

### React Hooks

```typescript
import {
  useNetMessages,
  useNetMessageCount,
  NetProvider,
} from "@net-protocol/core";

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

  return (
    <div>
      Messages: {messages.length}, Total: {count}
    </div>
  );
}
```

### Non-React Utilities

```typescript
import { NetClient } from "@net-protocol/core";

// Create a NetClient instance
const client = new NetClient({
  chainId: 8453,
  overrides: { rpcUrls: ["https://custom-rpc.com"] }, // Optional RPC URL override
});

// Get messages
const messages = await client.getMessages({
  chainId: 8453,
  filter: { appAddress: "0x..." },
  startIndex: 0,
  endIndex: 10,
});

// Get message count
const count = await client.getMessageCount({
  chainId: 8453,
  filter: { appAddress: "0x..." },
});

// Get message by index
const message = await client.getMessageAtIndex({
  messageIndex: 0,
  appAddress: "0x...", // Optional
  topic: "topic", // Optional
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
