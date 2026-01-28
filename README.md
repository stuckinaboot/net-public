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
| [@net-protocol/cli](./packages/net-cli/README.md)         | **Alpha**          | Usable but may have breaking changes over time |
| [@net-protocol/netr](./packages/net-netr/README.md)       | **Alpha**          | Usable but may have breaking changes over time |
| [@net-protocol/relay](./packages/net-relay/README.md)     | **In Development** | Do not use yet. Will have breaking changes     |
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

### [@net-protocol/relay](./packages/net-relay/README.md)

**Transaction relay service** - Submit on-chain transactions without holding ETH by paying with USDC via x402.

**What you can do:**

- Submit transactions via relay service (backend wallet pays gas)
- Fund backend wallets via x402 payments (USDC)
- Batch transactions automatically to respect API limits
- Retry failed transactions with exponential backoff
- Create session tokens for authenticated batch requests
- Check backend wallet balance before submitting
- Wait for transaction confirmations on-chain
- Build applications that allow users to interact without ETH

### [@net-protocol/feeds](./packages/net-feeds/README.md)

**Topic-based message streams** - Build social feeds, announcements, and community discussions.

**What you can do:**

- Read posts from topic-based feeds
- Post to feeds (social media style)
- Build decentralized social applications
- Create community discussion forums

### [@net-protocol/cli](./packages/net-cli/README.md)

**Command-line interface** - Interact with Net Protocol from the terminal.

**What you can do:**

- Send and read messages on Net Protocol
- Upload files to Net Storage (supports small and large files)
- Read data from Net Storage
- Deploy Netr tokens (memecoin-NFT pairs with automatic Uniswap pool, locked liquidity, and creator fee share)
- Preview transactions before executing
- Works with environment variables for secure key management

**Quick examples:**

```bash
# Install globally
npm install -g @net-protocol/cli

# Send a message
netp message send --text "Hello from CLI!" --private-key $PRIVATE_KEY --chain-id 8453

# Read recent messages from an app
netp message read --app 0x1234... --limit 10 --chain-id 8453

# Read messages by topic
netp message read --topic "announcements" --chain-id 8453

# Deploy a Netr token
netp token deploy \
  --name "My Token" \
  --symbol "MTK" \
  --image "https://example.com/image.png" \
  --private-key $PRIVATE_KEY \
  --chain-id 8453

# Encode-only mode (outputs transaction JSON without executing)
netp message send --text "Hello!" --chain-id 8453 --encode-only
netp token deploy --name "My Token" --symbol "MTK" --image "https://example.com/image.png" --chain-id 8453 --encode-only
```

### [@net-protocol/netr](./packages/net-netr/README.md)

**Netr token SDK** - Deploy and interact with memecoin-NFT pairs on Net Protocol.

**What you can do:**

- Deploy memecoins with automatic Uniswap V3 liquidity
- Query token metadata, prices, and pool information
- Build deployment transactions for external signing
- Access locker data (LP locked for ~1000 years)

**Quick examples:**

```typescript
import { NetrClient } from "@net-protocol/netr";

const client = new NetrClient({ chainId: 8453 });

// Get token info
const token = await client.getToken("0x...");
console.log(token?.name, token?.symbol);

// Get current price
const price = await client.getPrice("0x...");
console.log(`Price: ${price?.priceInEth} ETH`);

// Generate salt and build deploy transaction
const saltResult = await client.generateSalt({
  name: "My Token",
  symbol: "MTK",
  image: "https://example.com/image.png",
  deployer: "0x...",
});

const txConfig = client.buildDeployConfig(
  { name: "My Token", symbol: "MTK", image: "https://...", deployer: "0x..." },
  saltResult.salt
);
```

## Quick Start

### Installation

```bash
npm install @net-protocol/core @net-protocol/storage @net-protocol/relay @net-protocol/feeds wagmi viem react
# or
yarn add @net-protocol/core @net-protocol/storage @net-protocol/relay @net-protocol/feeds wagmi viem react
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
- [@net-protocol/cli documentation](./packages/net-cli/README.md)
- [@net-protocol/netr documentation](./packages/net-netr/README.md)
- [@net-protocol/relay documentation](./packages/net-relay/README.md)
- [@net-protocol/feeds documentation](./packages/net-feeds/README.md)

## Examples

Working examples demonstrating how to build with Net Protocol:

- **[Basic App](./examples/basic-app/)** - A Next.js React application showing chat messaging and storage features with wallet integration

See the [examples directory](./examples/) for more details and setup instructions.

## Claude Code Plugin

This repository includes a [Claude Code](https://claude.ai/claude-code) plugin that enables AI-assisted development with Net Protocol. The plugin provides skills and agents that understand Net Protocol's contracts, SDK patterns, and best practices.

### Installation

1. Add the marketplace:
   ```
   /plugin marketplace add stuckinaboot/net-public
   ```

2. Install the plugin:
   ```
   /plugin install net-protocol@net-protocol-marketplace
   ```

### What's Included

- **Net Protocol skill** - Contextual knowledge about Net contracts, SDK usage patterns, and best practices
- **Net Explorer agent** - Specialized agent for exploring and building with Net Protocol

See the [plugin README](./plugins/net-protocol/README.md) for more details.

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
