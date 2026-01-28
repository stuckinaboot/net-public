# @net-protocol/cli

A command-line tool for interacting with Net Protocol. Supports storage uploads and more.

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
  [--rpc-url <custom-rpc>]
```

**Storage Upload Arguments:**

- `--file` (required): Path to file to upload
- `--key` (required): Storage key (filename/identifier)
- `--text` (required): Text description/filename
- `--private-key` (optional): Private key (0x-prefixed hex, 66 characters). Can also be set via `NET_PRIVATE_KEY` or `PRIVATE_KEY` environment variable
- `--chain-id` (optional): Chain ID (8453 for Base, 1 for Ethereum, etc.). Can also be set via `NET_CHAIN_ID` environment variable
- `--rpc-url` (optional): Custom RPC URL. Can also be set via `NET_RPC_URL` environment variable

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
  [--rpc-url <custom-rpc>]
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

- Breaks file into 80KB XML chunks
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
│   └── storage/          # Storage command module
│       ├── index.ts      # Storage command definition
│       ├── core/         # Upload and preview logic
│       ├── storage/      # Storage operations
│       ├── transactions/ # Transaction handling
│       ├── utils.ts      # Storage-specific utilities
│       └── types.ts      # Storage-specific types
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
