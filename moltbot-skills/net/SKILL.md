---
name: net
description: On-chain data storage and messaging protocol via CLI. Use when the user wants to store data on-chain permanently, read on-chain data, send/read messages to feeds, deploy memecoins with Uniswap V3 liquidity, or manage on-chain user profiles (picture, bio, X username). Supports Base, Ethereum, Degen, Ham, Ink, Unichain, HyperEVM, Plasma, and Monad. Capabilities include permanent file storage (up to 80KB chunks), key-value storage, personal feeds, topic-based messaging, token deployment with locked liquidity, and decentralized identity profiles.
metadata: {"clawdbot":{"emoji":"🌐","homepage":"https://github.com/stuckinaboot/net-public","requires":{"bins":["node","yarn"]}}}
---

# Net Protocol CLI

Store data on-chain permanently, send messages to decentralized feeds, deploy memecoins, and manage on-chain profiles using the Net Protocol CLI.

## Quick Start

### Installation

```bash
# Install globally via npm
npm install -g @net-protocol/cli

# Or via yarn
yarn global add @net-protocol/cli
```

### Agent Integration (Encode-Only Mode)

**For Bankr agent and other services that handle their own transaction submission**, use `--encode-only` mode. This generates the transaction data without requiring a private key, allowing your agent to submit the transaction through its own infrastructure.

```bash
# Generate transaction data for storage upload
netp storage upload \
  --file ./data.json \
  --key "my-data" \
  --text "My stored data" \
  --chain-id 8453 \
  --encode-only
```

**Output (single transaction commands like message, profile, token):**
```json
{
  "to": "0x7C1104263be8D5eF7d5E5e8D7f0f8E8E8E8E8E8E",
  "data": "0x1234abcd...",
  "chainId": 8453,
  "value": "0"
}
```

**Output (storage upload - includes metadata):**
```json
{
  "storageKey": "my-data",
  "storageType": "normal",
  "operatorAddress": "0x0000000000000000000000000000000000000000",
  "transactions": [
    {"to": "0x...", "data": "0x...", "chainId": 8453, "value": "0"}
  ]
}
```

The agent submits each transaction in the `transactions` array. For large files (XML storage), there will be multiple transactions. This works for all write commands:
- `netp storage upload --encode-only`
- `netp message send --encode-only`
- `netp token deploy --encode-only`
- `netp profile set-picture --encode-only`
- `netp profile set-bio --encode-only`
- `netp profile set-x-username --encode-only`

### Direct CLI Usage (With Private Key)

For users running the CLI directly with their own wallet:

```bash
# Set private key via environment variable (recommended)
export NET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
export NET_CHAIN_ID=8453

# Or create a .env file
mkdir -p ~/.net
cat > ~/.net/.env << 'EOF'
NET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
NET_CHAIN_ID=8453
EOF
```

### Verify Setup

```bash
# Check supported chains
netp chains

# View chain info
netp info --chain-id 8453
```

## Core Usage

### Data Storage

Store files and data permanently on-chain:

```bash
# Upload a file
netp storage upload --file ./data.json --key "my-data" --text "My stored data" --chain-id 8453

# Preview upload (dry run)
netp storage preview --file ./data.json --key "my-data" --text "My stored data" --chain-id 8453

# Read stored data
netp storage read --key "my-data" --operator 0xYourAddress --chain-id 8453
```

**Reference**: [references/storage.md](references/storage.md)

### Messaging & Feeds

Send and read messages on decentralized feeds:

```bash
# Send a message
netp message send --text "Hello Net!" --topic "my-feed" --chain-id 8453

# Read messages from a topic
netp message read --topic "my-feed" --chain-id 8453 --limit 10

# Get message count
netp message count --topic "my-feed" --chain-id 8453
```

**Reference**: [references/messaging.md](references/messaging.md)

### Token Deployment

Deploy memecoins with automatic Uniswap V3 liquidity:

```bash
# Deploy a new token
netp token deploy \
  --name "My Token" \
  --symbol "MTK" \
  --image "https://example.com/logo.png" \
  --chain-id 8453

# Get token info
netp token info --address 0xTokenAddress --chain-id 8453
```

**Reference**: [references/tokens.md](references/tokens.md)

### Profile Management

Manage on-chain user profiles:

```bash
# Get a profile
netp profile get --address 0xUserAddress --chain-id 8453

# Set profile picture
netp profile set-picture --url "https://example.com/avatar.png" --chain-id 8453

# Set bio
netp profile set-bio --bio "Web3 builder" --chain-id 8453

# Set X (Twitter) username
netp profile set-x-username --username "myhandle" --chain-id 8453
```

**Reference**: [references/profiles.md](references/profiles.md)

## Capabilities Overview

### On-Chain Storage
- **File Upload**: Store files up to 20KB in single transaction, larger files chunked to 80KB
- **Key-Value Storage**: Store data by key, retrieve by key + operator address
- **Idempotent Uploads**: Safe to retry - CLI checks what's already stored
- **Preview Mode**: See transaction count before committing
- **Relay Upload**: Backend pays gas via x402 relay

### Messaging System
- **Topic-Based**: Send messages to any topic
- **Personal Feeds**: Each address has a feed at `feed-<address>`
- **Filtering**: Query by app, topic, sender, or index range
- **Pagination**: Limit and offset support

### Token Deployment (Netr/Banger)
- **One-Command Deploy**: Token + Uniswap V3 pool in one transaction
- **Locked Liquidity**: LP tokens locked automatically
- **Initial Buy**: Optionally swap ETH for tokens on deploy
- **NFT Metadata**: Support for drop metadata

### Profile System
- **Decentralized Identity**: On-chain profile data
- **Profile Picture**: Store avatar URL on-chain
- **Bio**: Up to 280 characters
- **Social Links**: X (Twitter) username linking

## Supported Chains

| Chain | Chain ID | Storage | Messages | Tokens | Profiles |
|-------|----------|---------|----------|--------|----------|
| Base | 8453 | ✅ | ✅ | ✅ | ✅ |
| Ethereum | 1 | ✅ | ✅ | ❌ | ✅ |
| Degen | 666666666 | ✅ | ✅ | ❌ | ✅ |
| Ham | 5112 | ✅ | ✅ | ❌ | ✅ |
| Ink | 57073 | ✅ | ✅ | ❌ | ✅ |
| Unichain | 130 | ✅ | ✅ | ❌ | ✅ |
| HyperEVM | 999 | ✅ | ✅ | ✅ | ✅ |
| Plasma | 9745 | ✅ | ✅ | ✅ | ✅ |
| Monad | 143 | ✅ | ✅ | ✅ | ✅ |

**Testnets**: Base Sepolia (84532), Sepolia (11155111)

## Common Patterns

### Agent Patterns (Encode-Only)

For Bankr agent and other services that submit transactions themselves:

#### Store Data On-Chain
```bash
# Generate transaction to store JSON data
echo '{"setting": "value"}' > config.json
netp storage upload \
  --file config.json \
  --key "app-config" \
  --text "App configuration" \
  --chain-id 8453 \
  --encode-only

# Output includes transactions array:
# {"storageKey": "app-config", "storageType": "normal", "transactions": [...]}
# Agent submits each transaction in the transactions array
```

#### Post to Feed
```bash
# Generate transaction to post a message
netp message send \
  --text "Hello from the bot!" \
  --topic "announcements" \
  --chain-id 8453 \
  --encode-only
```

#### Deploy a Token
```bash
# Generate transaction to deploy memecoin
netp token deploy \
  --name "Bot Token" \
  --symbol "BOT" \
  --image "https://example.com/bot.png" \
  --chain-id 8453 \
  --encode-only

# For tokens with initial buy, include value in the transaction
netp token deploy \
  --name "Bot Token" \
  --symbol "BOT" \
  --image "https://example.com/bot.png" \
  --initial-buy 0.1 \
  --chain-id 8453 \
  --encode-only
# Output includes "value": "100000000000000000" (0.1 ETH in wei)
```

#### Update User Profile
```bash
# Generate transaction to set profile picture
netp profile set-picture \
  --url "https://example.com/avatar.png" \
  --chain-id 8453 \
  --encode-only

# Generate transaction to set bio
netp profile set-bio \
  --bio "Automated trading bot" \
  --chain-id 8453 \
  --encode-only
```

### Reading Data (No Transaction Needed)

Read operations don't require transactions - they query the chain directly:

```bash
# Read stored data (free, no gas)
netp storage read --key "app-config" --operator 0xAddress --chain-id 8453 --json

# Read messages from a feed (free, no gas)
netp message read --topic "announcements" --chain-id 8453 --json

# Get message count (free, no gas)
netp message count --topic "announcements" --chain-id 8453 --json

# Get token info (free, no gas)
netp token info --address 0xTokenAddress --chain-id 8453 --json

# Get user profile (free, no gas)
netp profile get --address 0xUserAddress --chain-id 8453 --json
```

### Direct CLI Patterns (With Private Key)

For users running CLI directly with their own wallet:

```bash
# Store data (executes transaction immediately)
netp storage upload --file config.json --key "app-config" --text "Config" --chain-id 8453

# Post to personal feed
netp message send --text "My first post!" --topic "feed-0xabcd..." --chain-id 8453

# Deploy token with initial buy
netp token deploy \
  --name "Cool Token" \
  --symbol "COOL" \
  --image "https://example.com/cool.png" \
  --initial-buy 0.1 \
  --chain-id 8453
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NET_CHAIN_ID` | Default chain ID | Optional |
| `NET_RPC_URL` | Custom RPC endpoint | Optional |
| `NET_PRIVATE_KEY` | Wallet private key (0x-prefixed) | Only for direct CLI execution (not needed with --encode-only) |
| `PRIVATE_KEY` | Alternative to NET_PRIVATE_KEY | Only for direct CLI execution |
| `X402_SECRET_KEY` | Secret key for relay uploads | For relay ops |

**Note for agents:** When using `--encode-only`, no private key is needed. The CLI generates the transaction data, and your agent submits it through its own wallet infrastructure.

## Error Handling

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| "Private key required" | Missing NET_PRIVATE_KEY | Set environment variable |
| "Insufficient funds" | Wallet needs gas | Fund wallet with native token |
| "Storage key already exists" | Data exists for key | Use different key or check existing |
| "File too large" | File exceeds limits | CLI auto-chunks, but check file size |

### Best Practices

1. **Use environment variables** for private keys, never command-line flags
2. **Preview before upload** using `storage preview` command
3. **Use Base** for cheapest transactions
4. **Test on Sepolia** before mainnet operations

## Prompt Examples

### For Agents (Encode-Only Transactions)
- "Generate a transaction to store this data on Base"
- "Create the calldata to post a message to my feed"
- "Build a transaction to deploy a memecoin called 'Bot Token'"
- "Generate the transaction data to update my profile picture"
- "Create a token deployment transaction with 0.1 ETH initial buy"

### Storage Operations
- "Store this JSON file on Base"
- "Read my stored data with key 'config'"
- "Preview how many transactions this upload will take"
- "What data is stored at this key by this operator?"

### Messaging
- "Post a message to my personal feed"
- "Read the last 20 messages from topic 'announcements'"
- "How many messages are in this feed?"
- "Send a message to the public feed"

### Token Deployment
- "Deploy a new memecoin called 'Test Token' with symbol TEST"
- "Create a token with 0.1 ETH initial buy"
- "What's the info for this token address?"

### Profile Management
- "Set my profile picture to this URL"
- "Update my bio to 'Building on Base'"
- "Link my X account @myhandle"
- "What's the profile for this address?"

## Resources

- **GitHub**: [stuckinaboot/net-public](https://github.com/stuckinaboot/net-public)
- **NPM**: [@net-protocol/cli](https://www.npmjs.com/package/@net-protocol/cli)
- **Chains**: Run `netp chains` for full list

## Troubleshooting

### CLI Not Found
```bash
# Ensure global bin is in PATH
export PATH="$PATH:$(yarn global bin)"
# or for npm
export PATH="$PATH:$(npm bin -g)"
```

### Transaction Failing
1. Check wallet has sufficient native token for gas
2. Verify chain ID is correct
3. Try with custom RPC: `--rpc-url https://...`

### Data Not Found
1. Verify correct operator address (who stored it)
2. Check chain ID matches where data was stored
3. Use `--json` flag for detailed output
