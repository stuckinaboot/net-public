# @net-protocol/cli

Command-line tool for Net Protocol — send messages, store data onchain, and deploy tokens across Base and other EVM chains.

## Installation

```bash
# Global install
npm install -g @net-protocol/cli

# Or with yarn
yarn global add @net-protocol/cli
```

## Usage

The CLI uses a subcommand pattern. Each command is isolated and has its own options:

```bash
netp <command> [options]
```

### Available Commands

#### Storage Command

Storage operations for Net Protocol. The `storage` command is a command group with subcommands for different operations.

**Available Subcommands:**

- `storage upload` - Upload files to Net Storage
- `storage preview` - Preview storage upload without submitting transactions
- `storage read` - Read data from Net Storage

##### Storage Upload

Upload files to Net Storage using either normal storage (for files ≤ 20KB) or XML storage (for files > 20KB or containing XML references).

```bash
netp storage upload \
  --file <path> \
  --key <storage-key> \
  --text <description> \
  [--private-key <0x...>] \
  --chain-id <8453|1|...> \
  [--rpc-url <custom-rpc>] \
  [--chunk-size <bytes>]
```

**Storage Upload Arguments:**

- `--file` (required): Path to file to upload
- `--key` (required): Storage key (filename/identifier)
- `--text` (required): Text description/filename
- `--private-key` (optional): Private key (0x-prefixed hex, 66 characters). Can also be set via `NET_PRIVATE_KEY` or `PRIVATE_KEY` environment variable
- `--chain-id` (optional): Chain ID (8453 for Base, 1 for Ethereum, etc.). Can also be set via `NET_CHAIN_ID` environment variable
- `--rpc-url` (optional): Custom RPC URL. Can also be set via `NET_RPC_URL` environment variable
- `--chunk-size` (optional): Size of each XML chunk in bytes (default: 80000). Controls how large files are split for XML storage

**Examples:**

```bash
# Using command-line flags
netp storage upload \
  --file ./example.txt \
  --key "my-file" \
  --text "Example file" \
  --private-key 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef \
  --chain-id 8453

# Using environment variables (recommended)
export NET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
export NET_CHAIN_ID=8453
netp storage upload \
  --file ./example.txt \
  --key "my-file" \
  --text "Example file"

# Using .env file
# Create .env file with:
# NET_PRIVATE_KEY=0x...
# NET_CHAIN_ID=8453
# NET_RPC_URL=https://base-mainnet.public.blastapi.io  # optional
netp storage upload --file ./example.txt --key "my-file" --text "Example file"

# Custom chunk size (40KB instead of default 80KB)
netp storage upload \
  --file ./large-file.bin \
  --key "my-file" \
  --text "Large file" \
  --chunk-size 40000 \
  --chain-id 8453
```

##### Storage Preview

Preview what would be uploaded without actually submitting transactions. Shows statistics about chunks, transactions, and what's already stored.

```bash
netp storage preview \
  --file <path> \
  --key <storage-key> \
  --text <description> \
  [--private-key <0x...>] \
  --chain-id <8453|1|...> \
  [--rpc-url <custom-rpc>] \
  [--chunk-size <bytes>]
```

**Storage Preview Arguments:**

Same as `storage upload` - see above.

**Example:**

```bash
netp storage preview \
  --file ./example.txt \
  --key "my-file" \
  --text "Example file" \
  --chain-id 8453
```

**Output:**

```
📁 Reading file: ./example.txt

📊 Storage Preview:
  Storage Key: my-file
  Storage Type: Normal
  Total Chunks: 1
  Already Stored: 0
  Need to Store: 1
  Total Transactions: 1
  Transactions to Send: 1
  Transactions Skipped: 0
  Operator Address: 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf

⚠ 1 transaction(s) would be sent
```

##### Storage Read

Read data from Net Storage by key and operator address.

```bash
netp storage read \
  --key <storage-key> \
  --operator <address> \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--index <n>] \
  [--json]
```

**Storage Read Arguments:**

- `--key` (required): Storage key to read
- `--operator` (required): Operator address (wallet that stored the data)
- `--chain-id` (optional): Chain ID. Can also be set via `NET_CHAIN_ID` environment variable
- `--rpc-url` (optional): Custom RPC URL. Can also be set via `NET_RPC_URL` environment variable
- `--index` (optional): Historical version index (0 = oldest). Omit for latest.
- `--json` (optional): Output in JSON format

**Example:**

```bash
# Read latest version
netp storage read \
  --key "my-file" \
  --operator 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf \
  --chain-id 8453

# Read historical version
netp storage read \
  --key "my-file" \
  --operator 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf \
  --chain-id 8453 \
  --index 0

# JSON output
netp storage read \
  --key "my-file" \
  --operator 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf \
  --chain-id 8453 \
  --json
```

##### Encode-Only Mode

All write commands support `--encode-only` mode which outputs transaction data as JSON instead of executing transactions. This is useful for:
- Building transactions to sign with a hardware wallet
- Integrating with other tools
- Previewing exact transaction data

```bash
# Storage upload encode-only
netp storage upload \
  --file ./example.txt \
  --key "my-file" \
  --text "Example file" \
  --chain-id 8453 \
  --encode-only
```

**Output:**

```json
{
  "storageKey": "my-file",
  "storageType": "normal",
  "operatorAddress": "0x0000000000000000000000000000000000000000",
  "transactions": [
    {
      "to": "0x00000000db40fcb9f4466330982372e27fd7bbf5",
      "data": "0x...",
      "chainId": 8453,
      "value": "0"
    }
  ]
}
```

#### Message Command

Message operations for Net Protocol.

**Available Subcommands:**

- `message send` - Send a message to Net Protocol
- `message read` - Read messages from Net Protocol
- `message count` - Get message count

##### Message Send

```bash
netp message send \
  --text <message> \
  [--topic <topic>] \
  [--data <hex>] \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--encode-only]
```

**Personal Feeds:** Post to any feed with `--topic "feed-<address lowercase>"`. Anyone can post to any feed.

##### Message Read

```bash
netp message read \
  [--app <address>] \
  [--topic <topic>] \
  [--sender <address>] \
  [--limit <n>] \
  [--start <n>] \
  [--end <n>] \
  [--chain-id <8453|1|...>] \
  [--json]
```

**Personal Feeds:** Every address has a feed at topic `feed-<address lowercase>`. Use `--topic "feed-0x..."` to read someone's feed.

##### Message Count

```bash
netp message count \
  [--app <address>] \
  [--topic <topic>] \
  [--sender <address>] \
  [--chain-id <8453|1|...>] \
  [--json]
```

#### Token Command

Token operations for Netr/Banger tokens (memecoin deployment).

**Available Subcommands:**

- `token deploy` - Deploy a new Netr token
- `token info` - Get information about a Netr token

##### Token Deploy

Deploy a new memecoin with automatic Uniswap V3 pool creation and locked liquidity.

```bash
netp token deploy \
  --name <name> \
  --symbol <symbol> \
  --image <url> \
  [--animation <url>] \
  [--fid <number>] \
  [--private-key <0x...>] \
  [--chain-id <8453|9745|143|999>] \
  [--encode-only]
```

**Token Deploy Arguments:**

- `--name` (required): Token name
- `--symbol` (required): Token symbol
- `--image` (required): Token image URL
- `--animation` (optional): Token animation URL
- `--fid` (optional): Farcaster ID
- `--initial-buy` (optional): ETH amount to swap for tokens on deploy (e.g., "0.001")
- `--private-key` (optional): Private key. Can also be set via `NET_PRIVATE_KEY` environment variable
- `--chain-id` (optional): Chain ID. Supported: Base (8453), Plasma (9745), Monad (143), HyperEVM (999)
- `--encode-only` (optional): Output transaction data as JSON instead of executing

**Example:**

```bash
# Deploy token
netp token deploy \
  --name "My Token" \
  --symbol "MTK" \
  --image "https://example.com/image.png" \
  --chain-id 8453

# Deploy with initial buy (swap 0.001 ETH for tokens on deploy)
netp token deploy \
  --name "My Token" \
  --symbol "MTK" \
  --image "https://example.com/image.png" \
  --initial-buy "0.001" \
  --chain-id 8453

# Deploy with animation
netp token deploy \
  --name "My Token" \
  --symbol "MTK" \
  --image "https://example.com/image.png" \
  --animation "https://example.com/video.mp4" \
  --chain-id 8453

# Encode-only (get transaction data without executing)
netp token deploy \
  --name "My Token" \
  --symbol "MTK" \
  --image "https://example.com/image.png" \
  --chain-id 8453 \
  --encode-only
```

##### Token Info

Get information about an existing Netr token.

```bash
netp token info \
  --address <token-address> \
  [--chain-id <8453|9745|143|999>] \
  [--json]
```

**Example:**

```bash
netp token info \
  --address 0x1234567890abcdef1234567890abcdef12345678 \
  --chain-id 8453 \
  --json
```

#### Profile Command

Profile operations for managing your Net Protocol profile.

**Available Subcommands:**

- `profile get` - Get profile data for an address
- `profile set-picture` - Set your profile picture URL
- `profile set-x-username` - Set your X (Twitter) username
- `profile set-bio` - Set your profile bio
- `profile set-display-name` - Set your profile display name
- `profile set-token-address` - Set your profile token address (ERC-20 token)
- `profile set-canvas` - Set your profile canvas (HTML content)
- `profile get-canvas` - Get profile canvas for an address

##### Profile Get

Read profile data for any address.

```bash
netp profile get \
  --address <wallet-address> \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--json]
```

**Profile Get Arguments:**

- `--address` (required): Wallet address to get profile for
- `--chain-id` (optional): Chain ID. Can also be set via `NET_CHAIN_ID` environment variable
- `--rpc-url` (optional): Custom RPC URL. Can also be set via `NET_RPC_URL` environment variable
- `--json` (optional): Output in JSON format

**Example:**

```bash
# Human-readable output
netp profile get \
  --address 0x1234567890abcdef1234567890abcdef12345678 \
  --chain-id 8453

# JSON output
netp profile get \
  --address 0x1234567890abcdef1234567890abcdef12345678 \
  --chain-id 8453 \
  --json
```

##### Profile Set Picture

Set your profile picture URL.

```bash
netp profile set-picture \
  --url <image-url> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--encode-only]
```

**Profile Set Picture Arguments:**

- `--url` (required): Image URL for profile picture (HTTPS, IPFS, etc.)
- `--private-key` (optional): Private key. Can also be set via `NET_PRIVATE_KEY` environment variable
- `--chain-id` (optional): Chain ID. Can also be set via `NET_CHAIN_ID` environment variable
- `--rpc-url` (optional): Custom RPC URL. Can also be set via `NET_RPC_URL` environment variable
- `--encode-only` (optional): Output transaction data as JSON instead of executing

**Example:**

```bash
# Set profile picture
netp profile set-picture \
  --url "https://example.com/my-avatar.jpg" \
  --chain-id 8453

# Encode-only (get transaction data without executing)
netp profile set-picture \
  --url "https://example.com/my-avatar.jpg" \
  --chain-id 8453 \
  --encode-only
```

##### Profile Set X Username

Set your X (Twitter) username for your profile.

**Note:** The username is stored without the @ prefix. If you provide @ it will be stripped automatically.

```bash
netp profile set-x-username \
  --username <x-username> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--encode-only]
```

**Profile Set X Username Arguments:**

- `--username` (required): Your X (Twitter) username (with or without @, stored without @)
- `--private-key` (optional): Private key. Can also be set via `NET_PRIVATE_KEY` environment variable
- `--chain-id` (optional): Chain ID. Can also be set via `NET_CHAIN_ID` environment variable
- `--rpc-url` (optional): Custom RPC URL. Can also be set via `NET_RPC_URL` environment variable
- `--encode-only` (optional): Output transaction data as JSON instead of executing

**Example:**

```bash
# Set X username (@ is optional, will be stripped before storage)
netp profile set-x-username \
  --username "myusername" \
  --chain-id 8453

netp profile set-x-username \
  --username "@myusername" \
  --chain-id 8453

# Encode-only
netp profile set-x-username \
  --username "myusername" \
  --chain-id 8453 \
  --encode-only
```

##### Profile Set Bio

Set your profile bio (max 280 characters).

```bash
netp profile set-bio \
  --bio <bio-text> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--encode-only]
```

**Profile Set Bio Arguments:**

- `--bio` (required): Your profile bio (max 280 characters, no control characters)
- `--private-key` (optional): Private key. Can also be set via `NET_PRIVATE_KEY` environment variable
- `--chain-id` (optional): Chain ID. Can also be set via `NET_CHAIN_ID` environment variable
- `--rpc-url` (optional): Custom RPC URL. Can also be set via `NET_RPC_URL` environment variable
- `--encode-only` (optional): Output transaction data as JSON instead of executing

**Example:**

```bash
# Set bio
netp profile set-bio \
  --bio "Building cool stuff on Net Protocol" \
  --chain-id 8453

# Encode-only
netp profile set-bio \
  --bio "Building cool stuff on Net Protocol" \
  --chain-id 8453 \
  --encode-only
```

##### Profile Set Display Name

Set your profile display name (max 25 characters).

```bash
netp profile set-display-name \
  --name <display-name> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--encode-only]
```

**Profile Set Display Name Arguments:**

- `--name` (required): Your display name (max 25 characters, no control characters)
- `--private-key` (optional): Private key. Can also be set via `NET_PRIVATE_KEY` environment variable
- `--chain-id` (optional): Chain ID. Can also be set via `NET_CHAIN_ID` environment variable
- `--rpc-url` (optional): Custom RPC URL. Can also be set via `NET_RPC_URL` environment variable
- `--encode-only` (optional): Output transaction data as JSON instead of executing

**Example:**

```bash
# Set display name
netp profile set-display-name \
  --name "Alice" \
  --chain-id 8453

# Encode-only
netp profile set-display-name \
  --name "Alice" \
  --chain-id 8453 \
  --encode-only
```

##### Profile Set Token Address

Set an ERC-20 token address that represents you on your profile.

```bash
netp profile set-token-address \
  --token-address <address> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--encode-only]
```

**Profile Set Token Address Arguments:**

- `--token-address` (required): ERC-20 token contract address (0x-prefixed, 40 hex characters)
- `--private-key` (optional): Private key. Can also be set via `NET_PRIVATE_KEY` environment variable
- `--chain-id` (optional): Chain ID. Can also be set via `NET_CHAIN_ID` environment variable
- `--rpc-url` (optional): Custom RPC URL. Can also be set via `NET_RPC_URL` environment variable
- `--encode-only` (optional): Output transaction data as JSON instead of executing

**Example:**

```bash
# Set token address
netp profile set-token-address \
  --token-address 0x1234567890abcdef1234567890abcdef12345678 \
  --chain-id 8453

# Encode-only (get transaction data without executing)
netp profile set-token-address \
  --token-address 0x1234567890abcdef1234567890abcdef12345678 \
  --chain-id 8453 \
  --encode-only
```

##### Profile Set Canvas

Set your profile canvas (HTML content, max 60KB). Canvas content is stored using ChunkedStorage with gzip compression.

```bash
netp profile set-canvas \
  --file <path> | --content <html> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--encode-only]
```

**Profile Set Canvas Arguments:**

- `--file` (optional): Path to file containing canvas content (HTML, images, etc.)
- `--content` (optional): HTML content for canvas (inline). Must provide either `--file` or `--content`, but not both.
- `--private-key` (optional): Private key. Can also be set via `NET_PRIVATE_KEY` environment variable
- `--chain-id` (optional): Chain ID. Can also be set via `NET_CHAIN_ID` environment variable
- `--rpc-url` (optional): Custom RPC URL. Can also be set via `NET_RPC_URL` environment variable
- `--encode-only` (optional): Output transaction data as JSON instead of executing

**Notes:**
- Maximum canvas size is 60KB
- Binary files (images) are automatically converted to data URIs
- Content is compressed using gzip before storage

**Example:**

```bash
# Set canvas from file
netp profile set-canvas \
  --file ./my-canvas.html \
  --chain-id 8453

# Set canvas from inline content
netp profile set-canvas \
  --content "<html><body><h1>My Profile</h1></body></html>" \
  --chain-id 8453

# Encode-only
netp profile set-canvas \
  --file ./my-canvas.html \
  --chain-id 8453 \
  --encode-only
```

##### Profile Get Canvas

Get profile canvas for an address.

```bash
netp profile get-canvas \
  --address <wallet-address> \
  [--output <path>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--json]
```

**Profile Get Canvas Arguments:**

- `--address` (required): Wallet address to get canvas for
- `--output` (optional): Write canvas content to file instead of stdout
- `--chain-id` (optional): Chain ID. Can also be set via `NET_CHAIN_ID` environment variable
- `--rpc-url` (optional): Custom RPC URL. Can also be set via `NET_RPC_URL` environment variable
- `--json` (optional): Output in JSON format (includes metadata like size and type)

**Notes:**
- Binary content (data URIs) is automatically converted to binary files when using `--output`
- JSON output includes: canvas content, filename, size, and whether it's a data URI

**Example:**

```bash
# Output to stdout
netp profile get-canvas \
  --address 0x1234567890abcdef1234567890abcdef12345678 \
  --chain-id 8453

# Save to file
netp profile get-canvas \
  --address 0x1234567890abcdef1234567890abcdef12345678 \
  --output ./canvas.html \
  --chain-id 8453

# JSON output
netp profile get-canvas \
  --address 0x1234567890abcdef1234567890abcdef12345678 \
  --chain-id 8453 \
  --json
```

#### Info Command

Show contract info and stats.

```bash
netp info [--chain-id <id>] [--json]
```

#### Chains Command

List supported chains.

```bash
netp chains [--json]
```

## Storage Types

### Normal Storage

For files up to 20KB, the tool uses normal storage:

- Stores data directly in `Storage.sol`
- Single transaction
- Simple key-value storage

### XML Storage

For files larger than 20KB or containing XML references, the tool uses XML storage:

- Breaks file into 80KB XML chunks (configurable via `--chunk-size`)
- Each XML chunk is stored in ChunkedStorage (compressed and chunked into 20KB pieces)
- XML metadata references all chunks
- Multiple sequential transactions (metadata first, then chunks)

## Idempotency

The storage command includes built-in idempotency checks:

1. **Pre-flight Checks**: Before uploading, checks if data already exists
2. **Content Comparison**: For normal storage, compares file content with stored content
3. **Chunk-Level Deduplication**: For XML storage, checks each chunk individually
4. **Per-Transaction Checks**: Before sending each transaction, verifies data doesn't already exist

### Retry Behavior

If an upload fails mid-way:

- Retry the same command
- The tool will check which chunks already exist
- Only missing chunks will be uploaded
- Safe to retry multiple times

### Example: Upload Same File Twice

```bash
# First upload
netp storage upload --file example.txt --key "test" --text "Test" --chain-id 8453
# Output: ✓ File uploaded successfully!

# Second upload (same file, same key)
netp storage upload --file example.txt --key "test" --text "Test" --chain-id 8453
# Output: ✓ All data already stored - skipping upload
```

## Architecture

The CLI is organized into a modular, extensible architecture:

```
src/
├── cli/
│   ├── index.ts          # Main entry point, sets up commander program
│   └── shared.ts         # Shared option parsing and validation
├── commands/
│   ├── storage/          # Storage command module
│   │   ├── index.ts      # Storage command definition
│   │   ├── core/         # Upload and preview logic
│   │   ├── storage/      # Storage operations
│   │   ├── transactions/ # Transaction handling
│   │   ├── utils.ts      # Storage-specific utilities
│   │   └── types.ts      # Storage-specific types
│   ├── profile/          # Profile command module
│   │   ├── index.ts      # Profile command definition
│   │   ├── get.ts        # Profile get logic
│   │   ├── set-picture.ts    # Set profile picture
│   │   ├── set-username.ts   # Set X username
│   │   ├── set-token-address.ts  # Set token address
│   │   └── types.ts      # Profile-specific types
│   ├── message/          # Message command module
│   └── token/            # Token command module
└── shared/               # Shared utilities across commands
    └── types.ts          # Common types (CommonOptions, etc.)
```

### Key Components

- **`cli/index.ts`**: Main CLI entry point that sets up the commander program and registers all commands
- **`cli/shared.ts`**: Shared utilities for parsing common options (private-key, chain-id, rpc-url) that are available to all commands
- **`commands/{name}/index.ts`**: Each command module exports a `register{Name}Command()` function that defines the command's options and behavior
- **`shared/types.ts`**: Common types shared across commands (e.g., `CommonOptions`)

### Command Structure

Each command can have its own internal structure:

- **`core/`**: Core business logic for the command
- **`storage/`**: Storage-specific operations (if applicable)
- **`transactions/`**: Transaction preparation, filtering, and sending
- **`utils.ts`**: Command-specific utility functions
- **`types.ts`**: Command-specific types

## Extensibility

### Adding a New Command

To add a new top-level command:

1. **Create command directory**: `src/commands/{name}/`
2. **Create command index**: `src/commands/{name}/index.ts` with a `register{Name}Command(program: Command)` function
3. **Register in main CLI**: Import and call `register{Name}Command(program)` in `src/cli/index.ts`
4. **Add command-specific code**: Create subdirectories as needed (core/, storage/, transactions/, etc.)

### Adding a Storage Subcommand

To add a new subcommand to the `storage` command group:

1. **Create subcommand**: Use `new Command("subcommand-name")` in `src/commands/storage/index.ts`
2. **Add options**: Use `.requiredOption()` or `.option()` to define subcommand options
3. **Add action**: Use `.action()` to define the subcommand behavior
4. **Register**: Use `storageCommand.addCommand(subcommand)` to register it

**Example:**

```typescript
// In src/commands/storage/index.ts
const verifyCommand = new Command("verify")
  .description("Verify storage integrity")
  .requiredOption("--key <key>", "Storage key to verify")
  .action(async (options) => {
    // Implementation
  });

storageCommand.addCommand(verifyCommand);
```

### Example: Adding a New Command

```typescript
// src/commands/mycommand/index.ts
import { Command } from "commander";
import { parseCommonOptions } from "../../cli/shared";

export function registerMyCommand(program: Command): void {
  program
    .command("mycommand")
    .description("Description of my command")
    .option("--my-option <value>", "My option")
    .action(async (options) => {
      const commonOptions = parseCommonOptions({
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
      });

      // Command logic here
    });
}

// src/cli/index.ts
import { registerMyCommand } from "../commands/mycommand";

// ... existing code ...
registerMyCommand(program);
```

### Shared Options

All commands automatically have access to common options:

- `--private-key` (or `NET_PRIVATE_KEY` env var)
- `--chain-id` (or `NET_CHAIN_ID` env var)
- `--rpc-url` (or `NET_RPC_URL` env var)

These are parsed and validated by `parseCommonOptions()` from `cli/shared.ts`.

## Security & Environment Variables

⚠️ **Warning**: Private keys are sensitive. Always use environment variables instead of passing the private key via command line:

```bash
# Set environment variable
export NET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Run without --private-key flag (it will use the env var)
netp storage upload \
  --file ./example.txt \
  --key "my-file" \
  --text "Example file" \
  --chain-id 8453
```

The tool supports both `NET_PRIVATE_KEY` and `PRIVATE_KEY` environment variables. If neither is set, you must provide `--private-key` flag.

## Development

```bash
# Install dependencies (from repo root)
yarn install

# Build
yarn workspace @net-protocol/cli build

# Run in dev mode
yarn workspace @net-protocol/cli start storage upload --file example.txt --key "test" --text "Test" --chain-id 8453

# Watch mode
yarn workspace @net-protocol/cli dev

# Run tests
yarn workspace @net-protocol/cli test
```

## Error Handling

The CLI handles various error scenarios:

- Invalid private key format
- File not found
- Transaction failures (continues with remaining transactions)
- Network errors
- Storage read errors

If a transaction fails mid-upload, you can safely retry the command - it will only upload missing chunks.

#### Bazaar Command

NFT Bazaar operations — list, buy, sell, and trade NFTs via Seaport.

**Available Subcommands:**

- `bazaar list-listings` - List active NFT listings
- `bazaar list-offers` - List active collection offers
- `bazaar list-sales` - List recent sales
- `bazaar owned-nfts` - List NFTs owned by an address
- `bazaar create-listing` - Create an NFT listing
- `bazaar create-offer` - Create a collection offer
- `bazaar submit-listing` - Submit a signed listing
- `bazaar submit-offer` - Submit a signed offer
- `bazaar buy-listing` - Buy an NFT listing
- `bazaar accept-offer` - Accept a collection offer

##### Read Commands

```bash
# List active listings (--nft-address optional for cross-collection)
netp bazaar list-listings [--nft-address <address>] --chain-id 8453 [--json]

# List collection offers
netp bazaar list-offers --nft-address <address> --chain-id 8453 [--json]

# List recent sales
netp bazaar list-sales --nft-address <address> --chain-id 8453 [--json]

# Check NFTs owned by an address
netp bazaar owned-nfts --nft-address <address> --owner <address> --chain-id 8453 [--json]
```

##### Create Commands (Dual Mode)

Create commands support two modes: with `--private-key` for full flow (approve + sign + submit), or without for EIP-712 output (external signing).

```bash
# Full flow with private key
netp bazaar create-listing \
  --nft-address <address> --token-id <id> --price <eth> \
  --chain-id 8453 --private-key 0x...

# Keyless: outputs EIP-712 data + approval txs for external signing
netp bazaar create-listing \
  --nft-address <address> --token-id <id> --price <eth> \
  --offerer <address> --chain-id 8453

# Same pattern for offers
netp bazaar create-offer \
  --nft-address <address> --price <eth> \
  --chain-id 8453 --private-key 0x...
```

##### Submit Commands

Follow-up to keyless create commands:

```bash
netp bazaar submit-listing \
  --order-data <path> --signature <sig> \
  --chain-id 8453 [--private-key 0x... | --encode-only]

netp bazaar submit-offer \
  --order-data <path> --signature <sig> \
  --chain-id 8453 [--private-key 0x... | --encode-only]
```

##### Fulfillment Commands

```bash
# Buy a listing
netp bazaar buy-listing \
  --order-hash <hash> --nft-address <address> \
  --chain-id 8453 [--private-key 0x... | --buyer <address> --encode-only]

# Accept an offer (sell your NFT)
netp bazaar accept-offer \
  --order-hash <hash> --nft-address <address> --token-id <id> \
  --chain-id 8453 [--private-key 0x... | --seller <address> --encode-only]
```

##### Encode-Only Mode

All write commands support `--encode-only` for agent integration:

```bash
netp bazaar buy-listing \
  --order-hash 0x... --nft-address 0x... \
  --buyer 0xAgentWallet --chain-id 8453 --encode-only
```

Output:
```json
{
  "approvals": [],
  "fulfillment": {
    "to": "0x...",
    "data": "0x...",
    "chainId": 8453,
    "value": "10000000000000"
  }
}
```
