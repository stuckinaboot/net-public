# Net Storage Reference

Store files and data permanently on-chain using Net Protocol's storage system.

## Overview

Net Storage provides permanent, decentralized data storage on EVM chains. Data is stored directly in transaction calldata, making it immutable and permanently accessible.

## Storage Types

### Normal Storage (≤20KB)
Files up to 20KB are stored in a single transaction.

```bash
netp storage upload \
  --file small-data.json \
  --key "my-key" \
  --text "Description" \
  --chain-id 8453
```

### XML Chunked Storage (>20KB)
Larger files are automatically chunked into 80KB segments (configurable via `--chunk-size`) using XML format.

```bash
# CLI handles chunking automatically
netp storage upload \
  --file large-file.json \
  --key "big-data" \
  --text "Large dataset" \
  --chain-id 8453

# Custom chunk size (40KB instead of default 80KB)
netp storage upload \
  --file large-file.json \
  --key "big-data" \
  --text "Large dataset" \
  --chunk-size 40000 \
  --chain-id 8453
```

## Commands

### Upload

Store a file on-chain:

```bash
netp storage upload \
  --file <path> \
  --key <storage-key> \
  --text <description> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--chunk-size <bytes>] \
  [--encode-only]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--file` | Yes | Path to file to upload |
| `--key` | Yes | Storage key/identifier for retrieval |
| `--text` | Yes | Text description stored with data |
| `--private-key` | No | Wallet key (prefer `NET_PRIVATE_KEY` env var) |
| `--chain-id` | No | Target chain (default from `NET_CHAIN_ID`) |
| `--rpc-url` | No | Custom RPC endpoint |
| `--chunk-size` | No | Size of each XML chunk in bytes (default: 80000) |
| `--encode-only` | No | Output transaction JSON without executing |

**Example Output (Direct Execution):**
```
Uploading to Net Storage...
Storage type: normal
Chunks needed: 1
✓ Upload complete
Storage URL: net://8453/0xOperator/my-key
```

### Encode-Only Mode (For Agents)

**For Bankr agent and other services that submit transactions themselves**, use `--encode-only` to generate transaction data without executing:

```bash
netp storage upload \
  --file ./data.json \
  --key "my-key" \
  --text "Description" \
  --chain-id 8453 \
  --encode-only
```

**Output (normal storage - single transaction):**
```json
{
  "storageKey": "my-key",
  "storageType": "normal",
  "operatorAddress": "0x0000000000000000000000000000000000000000",
  "transactions": [
    {"to": "0x...", "data": "0x...", "chainId": 8453, "value": "0"}
  ]
}
```

The agent submits each transaction in the `transactions` array through its own wallet infrastructure. No private key is required for the CLI when using `--encode-only`.

**For large files (XML chunked storage)**, the output includes multiple transactions:
```bash
netp storage upload \
  --file ./large-file.json \
  --key "big-data" \
  --text "Large file" \
  --chain-id 8453 \
  --encode-only
```

**Output:**
```json
{
  "storageKey": "big-data",
  "storageType": "xml",
  "operatorAddress": "0x0000000000000000000000000000000000000000",
  "transactions": [
    {"to": "0x...", "data": "0x...", "chainId": 8453, "value": "0"},
    {"to": "0x...", "data": "0x...", "chainId": 8453, "value": "0"},
    {"to": "0x...", "data": "0x...", "chainId": 8453, "value": "0"}
  ],
  "topLevelHash": "0xabc123..."
}
```

Submit each transaction in order. The `topLevelHash` is used internally for XML storage reassembly.

### Preview

Preview upload without submitting transactions:

```bash
netp storage preview \
  --file <path> \
  --key <storage-key> \
  --text <description> \
  [--chain-id <8453|1|...>]
```

**Example Output:**
```
Storage Preview
===============
Storage type: xml
Total chunks: 3
Already stored: 1
Need to store: 2
Transactions: 2
Operator: 0xYourAddress
Storage URL: net://8453/0xYourAddress/my-key
```

### Read

Retrieve stored data:

```bash
netp storage read \
  --key <storage-key> \
  --operator <address> \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--index <n>] \
  [--json] \
  [--raw]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--key` | Yes | Storage key to read |
| `--operator` | Yes | Address that stored the data |
| `--chain-id` | No | Chain to read from |
| `--index` | No | Version index (0=oldest, omit for latest) |
| `--json` | No | Output in JSON format |
| `--raw` | No | Output raw data without truncation (with --json) |

**Example:**
```bash
# Read latest version
netp storage read --key "config" --operator 0x1234... --chain-id 8453

# Read specific version (0 = first upload)
netp storage read --key "config" --operator 0x1234... --chain-id 8453 --index 0

# Get JSON output
netp storage read --key "config" --operator 0x1234... --chain-id 8453 --json --raw
```

### Upload via Relay

Upload where backend pays gas fees:

```bash
netp storage upload-relay \
  --file <path> \
  --key <storage-key> \
  --text <description> \
  --api-url <backend-url> \
  --secret-key <key> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>]
```

**Additional Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--api-url` | Yes | Backend API URL for relay |
| `--secret-key` | Yes | Key for wallet derivation (use `X402_SECRET_KEY` env var) |

## Idempotency

Net Storage uploads are idempotent - safe to retry:

```bash
# First upload
netp storage upload --file data.json --key "test" --text "Test" --chain-id 8453
# Output: ✓ Upload complete

# Retry same upload
netp storage upload --file data.json --key "test" --text "Test" --chain-id 8453
# Output: ✓ All data already stored - skipping upload
```

For chunked uploads, only missing chunks are uploaded on retry.

## Storage URL Format

Data is addressable via Net Storage URLs:

```
net://<chainId>/<operatorAddress>/<key>
```

Example: `net://8453/0x1234.../my-config`

## Use Cases

### Configuration Storage
```bash
# Store app config
echo '{"theme": "dark", "notifications": true}' > config.json
netp storage upload --file config.json --key "app-config-v1" --text "App config" --chain-id 8453
```

### Document Archival
```bash
# Store important document
netp storage upload --file contract.pdf --key "contract-2024" --text "Signed contract" --chain-id 8453
```

### Metadata Storage
```bash
# Store NFT metadata
netp storage upload --file metadata.json --key "nft-42" --text "NFT #42 metadata" --chain-id 8453
```

### Version History
```bash
# Upload multiple versions (same key)
netp storage upload --file v1.json --key "data" --text "Version 1" --chain-id 8453
netp storage upload --file v2.json --key "data" --text "Version 2" --chain-id 8453

# Read specific version
netp storage read --key "data" --operator 0x... --chain-id 8453 --index 0  # v1
netp storage read --key "data" --operator 0x... --chain-id 8453           # latest (v2)
```

## Cost Considerations

Storage costs depend on:
1. **File size**: More bytes = more gas
2. **Chain**: L2s (Base) much cheaper than Ethereum mainnet
3. **Chunking**: Large files require multiple transactions

**Recommendations:**
- Use Base (chain 8453) for lowest costs
- Compress data before uploading when possible
- Use `preview` to estimate transaction count
- Consider relay for gas-free uploads

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "File not found" | Invalid path | Check file path exists |
| "Key already exists" | Same key+text combo | Data already stored, safe to continue |
| "Insufficient funds" | Low wallet balance | Add native token for gas |
| "Transaction failed" | Network issue | Retry - idempotent |

## Best Practices

1. **Choose descriptive keys**: Use meaningful, unique keys for easy retrieval
2. **Include version in key**: `config-v1`, `config-v2` for explicit versioning
3. **Preview large uploads**: Check chunk count before committing
4. **Use environment variables**: Never expose private keys in commands
5. **Test on Sepolia first**: Validate before mainnet uploads
