# Net Public SDK

Public TypeScript SDK packages for the Net Protocol. Provides React hooks and client classes for interacting with Net smart contracts and storage systems.

## What is Net Protocol?

Net Protocol is a decentralized onchain messaging system that stores all data permanently on the blockchain. Think of it as a **public bulletin board** where:

- **Anyone can post** (permissionless)
- **Posts are permanent** (immutable blockchain storage)
- **Everything is transparent** (publicly verifiable)
- **Works across multiple chains** (same contract address everywhere)

Net uses sophisticated multi-dimensional indexing, allowing you to query messages by:

- **App**: All messages from a specific application contract
- **User**: Messages from a specific user address
- **Topic**: Messages with a specific category/topic
- **Combinations**: App + User + Topic for precise queries

This SDK provides TypeScript/React tools to interact with Net Protocol and build applications on top of it.

## Documentation

For complete Net Protocol documentation, visit [docs.netprotocol.app](https://docs.netprotocol.app).

- [Getting Started Guide](https://docs.netprotocol.app/docs/intro)
- [How Net Works](https://docs.netprotocol.app/docs/02%20Core%20Protocol/how-net-works)
- [Smart Contract Reference](https://docs.netprotocol.app/docs/02%20Core%20Protocol/smart-contract-reference)

## Package Status

| Package                                                   | Status             | Description                                    |
| --------------------------------------------------------- | ------------------ | ---------------------------------------------- |
| [@net-protocol/core](./packages/net-core/README.md)       | **Alpha**          | Usable but may have breaking changes over time |
| [@net-protocol/storage](./packages/net-storage/README.md) | **Alpha**          | Usable but may have breaking changes over time |
| [@net-protocol/feeds](./packages/net-feeds/README.md)     | **In Development** | Do not use yet. Will have breaking changes     |

## Packages

### [@net-protocol/core](./packages/net-core/README.md)

**Core messaging primitives** - Read and write Net Protocol messages. This is the foundation for everything else.

**What you can do:**

- Query messages by app, user, topic, or combinations
- Get message counts
- Send messages via app contracts
- Build custom applications on Net Protocol

### [@net-protocol/storage](./packages/net-storage/README.md)

**Onchain key-value storage** - Store data permanently on the blockchain with complete version history.

**What you can do:**

- Store small data (< 20KB) with Regular Storage
- Store medium files (20KB-80KB) with Chunked Storage
- Store large files (multi-MB) with XML Storage pattern
- Access complete version history of all changes
- Build applications that need permanent, verifiable data storage

### [@net-protocol/feeds](./packages/net-feeds/README.md)

**Topic-based message streams** - Build social feeds, announcements, and community discussions.

**What you can do:**

- Read posts from topic-based feeds
- Post to feeds (social media style)
- Build decentralized social applications
- Create community discussion forums

## Quick Start

### Installation

```bash
npm install @net-protocol/core @net-protocol/storage @net-protocol/feeds wagmi viem react
# or
yarn add @net-protocol/core @net-protocol/storage @net-protocol/feeds wagmi viem react
```

### React Hooks Example

```typescript
import { useNetMessages, NetProvider } from "@net-protocol/core";
import { useStorage } from "@net-protocol/storage";

function App() {
  return (
    <NetProvider>
      <MyComponent />
    </NetProvider>
  );
}

function MyComponent() {
  const { messages, isLoading } = useNetMessages({
    chainId: 8453,
    filter: { appAddress: "0x..." },
  });

  const { data, isLoading: storageLoading } = useStorage({
    chainId: 8453,
    key: "my-key",
    operatorAddress: "0x...",
  });

  return (
    <div>
      <div>Messages: {messages.length}</div>
      {data && (
        <div>
          Storage: {data.text} - {data.value}
        </div>
      )}
    </div>
  );
}
```

### Non-React Client Example

```typescript
import { NetClient } from "@net-protocol/core";
import { StorageClient } from "@net-protocol/storage";

// Create clients
const netClient = new NetClient({ chainId: 8453 });
const storageClient = new StorageClient({ chainId: 8453 });

// Get messages
const messages = await netClient.getMessages({
  filter: { appAddress: "0x..." },
});

// Get storage value
const storageData = await storageClient.get({
  key: "my-key",
  operator: "0x...",
});
```

## Documentation

For detailed usage, API reference, and examples, see the individual package documentation:

- [@net-protocol/core documentation](./packages/net-core/README.md)
- [@net-protocol/storage documentation](./packages/net-storage/README.md)
- [@net-protocol/feeds documentation](./packages/net-feeds/README.md)

## Examples

Working examples demonstrating how to build with Net Protocol:

- **[Basic App](./examples/basic-app/)** - A Next.js React application showing chat messaging and storage features with wallet integration
- **[CLI](./examples/cli/)** - A command-line tool for interacting with Net Protocol, supporting storage operations and more

See the [examples directory](./examples/) for more details and setup instructions.

## Repository Structure

This is a monorepo managed with Yarn workspaces. Each package is independently versioned and can be used standalone.

- `packages/` - SDK packages
- `docs/` - Additional documentation
- `scripts/` - Build and utility scripts

## Development

### Prerequisites

- Node.js 18+
- Yarn 4.0+

### Setup

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Run tests
yarn test

# Type check
yarn typecheck
```

Packages are linked via Yarn workspaces for local development.

## Contributing

1. Make your changes
2. Run tests: `yarn test`
3. Type check: `yarn typecheck`
4. Build: `yarn build`
5. Submit a pull request

## License

MIT
