# Net CLI Storage Upload Tool

A command-line tool for uploading files to Net Storage using either normal storage (for small files < 20KB) or XML storage (for large files). The tool includes idempotency checks to avoid re-uploading data that already exists.

## Installation

```bash
cd examples/cli-storage-upload
yarn install
yarn build
```

## Usage

```bash
net-storage-upload \
  --file <path> \
  --key <storage-key> \
  --text <description> \
  [--private-key <0x...>] \
  --chain-id <8453|1|...> \
  [--rpc-url <custom-rpc>]
```

### Arguments

- `--file` (required): Path to file to upload
- `--key` (required): Storage key (filename/identifier)
- `--text` (required): Text description/filename
- `--private-key` (optional): Private key (0x-prefixed hex, 66 characters). Can also be set via `NET_PRIVATE_KEY` or `PRIVATE_KEY` environment variable
- `--chain-id` (required): Chain ID (8453 for Base, 1 for Ethereum, etc.)
- `--rpc-url` (optional): Custom RPC URL

### Examples

**Using command-line flag:**

```bash
net-storage-upload \
  --file ./example.txt \
  --key "my-file" \
  --text "Example file" \
  --private-key 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef \
  --chain-id 8453
```

**Using environment variable (recommended):**

```bash
export NET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
net-storage-upload \
  --file ./example.txt \
  --key "my-file" \
  --text "Example file" \
  --chain-id 8453
```

## Storage Types

### Normal Storage

For files smaller than 20KB, the tool uses normal storage:

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

The tool includes built-in idempotency checks:

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
net-storage-upload --file example.txt --key "test" --text "Test" --private-key 0x... --chain-id 8453
# Output: ✓ File uploaded successfully!

# Second upload (same file, same key)
net-storage-upload --file example.txt --key "test" --text "Test" --private-key 0x... --chain-id 8453
# Output: ✓ All data already stored - skipping upload
```

## Security & Environment Variables

⚠️ **Warning**: Private keys are sensitive. You can use environment variables instead of passing the private key via command line:

### Using Environment Variable (Recommended)

```bash
# Set environment variable
export NET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Run without --private-key flag (it will use the env var)
net-storage-upload \
  --file ./example.txt \
  --key "my-file" \
  --text "Example file" \
  --chain-id 8453
```

The tool supports both `NET_PRIVATE_KEY` and `PRIVATE_KEY` environment variables. If neither is set, you must provide `--private-key` flag.

### Testing Example

```bash
# 1. Build the tool
cd examples/cli-storage-upload
yarn install
yarn build

# 2. Set your private key (use a test account, not your main wallet!)
export NET_PRIVATE_KEY=0x...

# 3. Create a test file
echo "Hello, Net Storage!" > test.txt

# 4. Upload the file
yarn start --file test.txt --key "test-file" --text "My test file" --chain-id 8453

# 5. Upload again (should skip - already stored)
yarn start --file test.txt --key "test-file" --text "My test file" --chain-id 8453
```

## Architecture

The tool is organized into clean, modular components:

- **`types.ts`**: TypeScript types and interfaces
- **`storage-check.ts`**: Pure functions for checking storage existence
- **`transaction-prep.ts`**: Pure functions for preparing transactions
- **`transaction-filter.ts`**: Filters transactions based on existence
- **`transaction-send.ts`**: Sends transactions with idempotency checks
- **`upload.ts`**: Main orchestration logic
- **`index.ts`**: CLI entry point

## Development

```bash
# Build
yarn build

# Run
yarn start --file example.txt --key "test" --text "Test" --private-key 0x... --chain-id 8453

# Watch mode
yarn dev
```

## Error Handling

The tool handles various error scenarios:

- Invalid private key format
- File not found
- Transaction failures (continues with remaining transactions)
- Network errors
- Storage read errors

If a transaction fails mid-upload, you can safely retry the command - it will only upload missing chunks.
