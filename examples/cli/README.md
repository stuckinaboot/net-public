# Net CLI

A command-line tool for interacting with Net Protocol. Supports multiple commands including storage uploads, core protocol operations, and more.

## Installation

```bash
cd examples/cli
yarn install
yarn build
```

## Usage

The CLI uses a subcommand pattern. Each command is isolated and has its own options:

```bash
net-cli <command> [options]
```

### Available Commands

#### Storage Command

Upload files to Net Storage using either normal storage (for files ≤ 20KB) or XML storage (for files > 20KB or containing XML references).

```bash
net-cli storage \
  --file <path> \
  --key <storage-key> \
  --text <description> \
  [--private-key <0x...>] \
  --chain-id <8453|1|...> \
  [--rpc-url <custom-rpc>]
```

**Storage Command Arguments:**

- `--file` (required): Path to file to upload
- `--key` (required): Storage key (filename/identifier)
- `--text` (required): Text description/filename
- `--private-key` (optional): Private key (0x-prefixed hex, 66 characters). Can also be set via `NET_PRIVATE_KEY` or `PRIVATE_KEY` environment variable
- `--chain-id` (optional): Chain ID (8453 for Base, 1 for Ethereum, etc.). Can also be set via `NET_CHAIN_ID` environment variable
- `--rpc-url` (optional): Custom RPC URL. Can also be set via `NET_RPC_URL` environment variable

**Examples:**

```bash
# Using command-line flags
net-cli storage \
  --file ./example.txt \
  --key "my-file" \
  --text "Example file" \
  --private-key 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef \
  --chain-id 8453

# Using environment variables (recommended)
export NET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
export NET_CHAIN_ID=8453
net-cli storage \
  --file ./example.txt \
  --key "my-file" \
  --text "Example file"

# Using .env file
# Create .env file with:
# NET_PRIVATE_KEY=0x...
# NET_CHAIN_ID=8453
# NET_RPC_URL=https://base-mainnet.public.blastapi.io  # optional
net-cli storage --file ./example.txt --key "my-file" --text "Example file"
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
net-cli storage --file example.txt --key "test" --text "Test" --chain-id 8453
# Output: ✓ File uploaded successfully!

# Second upload (same file, same key)
net-cli storage --file example.txt --key "test" --text "Test" --chain-id 8453
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
│   │   ├── core/         # Storage-specific core logic
│   │   ├── storage/     # Storage operations
│   │   ├── transactions/# Transaction handling
│   │   ├── utils.ts     # Storage-specific utilities
│   │   └── types.ts     # Storage-specific types
│   ├── core/             # Future: Core command module
│   └── upvote/           # Future: Upvote command module
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

To add a new command:

1. **Create command directory**: `src/commands/{name}/`
2. **Create command index**: `src/commands/{name}/index.ts` with a `register{Name}Command(program: Command)` function
3. **Register in main CLI**: Import and call `register{Name}Command(program)` in `src/cli/index.ts`
4. **Add command-specific code**: Create subdirectories as needed (core/, storage/, transactions/, etc.)

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
net-cli storage \
  --file ./example.txt \
  --key "my-file" \
  --text "Example file" \
  --chain-id 8453
```

The tool supports both `NET_PRIVATE_KEY` and `PRIVATE_KEY` environment variables. If neither is set, you must provide `--private-key` flag.

## Development

```bash
# Build
yarn build

# Run storage command
yarn start storage --file example.txt --key "test" --text "Test" --chain-id 8453

# Watch mode
yarn dev
```

## Error Handling

The CLI handles various error scenarios:

- Invalid private key format
- File not found
- Transaction failures (continues with remaining transactions)
- Network errors
- Storage read errors

If a transaction fails mid-upload, you can safely retry the command - it will only upload missing chunks.
