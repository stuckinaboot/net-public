# Net Protocol Plugin for Claude Code

Interact with Net Protocol - a decentralized onchain messaging and storage system on EVM chains.

## Features

- **Send & Read Messages**: Query and send messages indexed by app, user, and topic
- **Storage Operations**: Store and retrieve permanent key-value data onchain
- **Token Launching**: Deploy memecoins with automatic Uniswap V3 liquidity
- **Encode-Only Mode**: Generate transaction data for external signing

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/stuckinaboot/net-public.git
   cd net-public
   ```

2. Run Claude Code with the plugin:
   ```bash
   claude --plugin-dir ./claude/plugins/net-protocol
   ```

   Or add to your Claude Code settings for permanent use.

## Prerequisites

Install the Net Protocol CLI:

```bash
npm install -g @net-protocol/cli
```

Set environment variables (recommended):

```bash
export NET_CHAIN_ID=8453          # Default chain (Base)
export NET_PRIVATE_KEY=0x...      # For write operations
export NET_RPC_URL=https://...    # Optional custom RPC
```

## Usage

The plugin provides Claude with knowledge of the `netp` CLI tool. Simply ask Claude to perform Net Protocol operations:

**Messages:**
- "Show me the latest messages on Net"
- "Send a message with topic 'announcements'"
- "How many messages are there for app 0x...?"

**Storage:**
- "Store this config file on Net"
- "Read the storage value for key 'my-data' from operator 0x..."
- "Upload ./file.json to Net Storage"

**Tokens:**
- "Deploy a token called 'My Coin' with symbol 'COIN'"
- "Get info about token 0x..."
- "What's the price of this Net token?"

**Encode-Only (for hardware wallets):**
- "Generate the transaction data to send a message"
- "Show me the deployment transaction for a token without executing"

## Components

### Skill: net-protocol

Comprehensive knowledge of:
- CLI command syntax and options
- SDK patterns for programmatic access
- Contract addresses and ABIs
- Token launching workflows

### Agent: net-explorer

Autonomous exploration of Net Protocol data:
- Query messages by topic, app, or sender
- Investigate storage for operators
- Analyze token metadata and pricing

## Supported Chains

| Chain | Chain ID | Features |
|-------|----------|----------|
| Base | 8453 | Messages, Storage, Tokens |
| Ethereum | 1 | Messages, Storage |
| Plasma | 9745 | Messages, Storage, Tokens |
| Monad | 143 | Messages, Storage, Tokens |
| HyperEVM | 999 | Messages, Storage, Tokens |

## Documentation

- [Net Protocol Docs](https://docs.netprotocol.app)
- [SDK Packages](https://github.com/stuckinaboot/net-public)

## License

MIT
