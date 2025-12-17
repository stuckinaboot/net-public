# Net Public SDK

Public TypeScript SDK packages for the Net Protocol. Provides React hooks and client classes for interacting with Net smart contracts and storage systems.

## Package Status

| Package                                                   | Status             | Description                                    |
| --------------------------------------------------------- | ------------------ | ---------------------------------------------- |
| [@net-protocol/core](./packages/net-core/README.md)       | **Alpha**          | Usable but may have breaking changes over time |
| [@net-protocol/storage](./packages/net-storage/README.md) | **Alpha**          | Usable but may have breaking changes over time |
| [@net-protocol/feeds](./packages/net-feeds/README.md)     | **In Development** | Do not use yet. Will have breaking changes     |

## Packages

- **[@net-protocol/core](./packages/net-core/README.md)** - Core Net protocol SDK for reading messages and message counts
- **[@net-protocol/storage](./packages/net-storage/README.md)** - Storage SDK for key-value storage, chunked storage, and XML storage patterns
- **[@net-protocol/feeds](./packages/net-feeds/README.md)** - Feed SDK for topic-based message streams and social feeds

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
