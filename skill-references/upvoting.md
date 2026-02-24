# Net Upvoting Reference

Upvote tokens on-chain using Net Protocol's scoring system. The CLI automatically discovers the best Uniswap pool for each token and selects the appropriate upvoting strategy.

## Overview

Token upvoting supports three strategies based on whether a Uniswap pool exists for the token:

| Strategy | When Used | Behavior |
|----------|-----------|----------|
| **Pure Alpha** | No pool found | 100% of upvote value goes to ALPHA token |
| **Dynamic Split** | Pool found (default) | Majority to token, remainder to ALPHA (ratio determined on-chain) |
| **50/50 Pools** | Pool found + `--split-type 50/50` | 50% token / 50% ALPHA split |

The CLI handles pool discovery and strategy selection automatically. You only need to specify `--split-type 50/50` if you want to override the default dynamic split.

## Supported Chains

| Chain | Chain ID | Status |
|-------|----------|--------|
| Base | 8453 | Supported |

## Commands

### Upvote Token

Upvote a token on-chain:

```bash
netp upvote token \
  --token-address <address> \
  --count <n> \
  [--split-type <dynamic|50/50>] \
  [--private-key <0x...>] \
  [--chain-id <8453>] \
  [--rpc-url <url>] \
  [--encode-only]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--token-address` | Yes | Token contract address to upvote |
| `--count` | Yes | Number of upvotes (positive integer) |
| `--split-type` | No | Strategy override: `dynamic` (default) or `50/50` |
| `--chain-id` | No | Chain ID (default: 8453 for Base) |
| `--rpc-url` | No | Custom RPC endpoint |
| `--private-key` | No | Wallet key (prefer `NET_PRIVATE_KEY` env var) |
| `--encode-only` | No | Output transaction JSON without executing |

**Examples:**

Basic upvote:
```bash
netp upvote token \
  --token-address 0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb \
  --count 1 \
  --chain-id 8453
```

With 50/50 split override:
```bash
netp upvote token \
  --token-address 0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb \
  --count 5 \
  --split-type 50/50 \
  --chain-id 8453
```

### Encode-Only Mode (For Agents)

**For Bankr agent and other services that submit transactions themselves**, use `--encode-only` to generate transaction data:

```bash
netp upvote token \
  --token-address 0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb \
  --count 1 \
  --chain-id 8453 \
  --encode-only
```

**Output:**
```json
{
  "to": "0x1234567890abcdef1234567890abcdef12345678",
  "data": "0xabcdef...",
  "chainId": 8453,
  "value": "25000000000000"
}
```

The `value` field is in wei. Each upvote costs 0.000025 ETH (25000000000000 wei). For multiple upvotes, `value` scales linearly (e.g. 5 upvotes = 125000000000000 wei).

The agent **must** include the `value` when submitting the transaction.

**Note:** `--encode-only` still requires RPC access for pool discovery (on-chain contract calls). No private key is needed, but the CLI must reach an RPC endpoint.

### Get Upvote Info

Retrieve upvote counts for a token:

```bash
netp upvote info \
  --token-address <address> \
  [--chain-id <8453>] \
  [--rpc-url <url>] \
  [--json]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--token-address` | Yes | Token contract address |
| `--chain-id` | No | Chain ID (default: 8453 for Base) |
| `--rpc-url` | No | Custom RPC endpoint |
| `--json` | No | Output in JSON format |

**Example:**
```bash
netp upvote info --token-address 0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb --chain-id 8453 --json
```

**JSON Output:**
```json
{
  "tokenAddress": "0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb",
  "scoreKey": "0x...",
  "total": 4190,
  "strategies": [
    { "name": "Pure Alpha", "address": "0x...", "count": 0 },
    { "name": "50/50 Pools", "address": "0x...", "count": 2020 },
    { "name": "Dynamic Split", "address": "0x...", "count": 0 }
  ]
}
```

The `total` includes upvotes from all strategies plus any legacy upvotes. Individual strategy counts may not sum to the total if legacy upvotes exist.

## Cost Considerations

- **Each upvote costs 0.000025 ETH** (fixed, regardless of strategy)
- **Gas fees**: ~0.0001-0.0005 ETH on Base
- **Reading upvote info**: Free (view calls)

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Count must be a positive integer" | Invalid count value | Use a positive whole number |
| "Invalid token address format" | Malformed address | Use 0x-prefixed, 42-character address |
| "Failed to discover token pool" | RPC or contract issue | Check RPC endpoint and chain ID |
| "Insufficient funds" | Not enough ETH | Fund wallet with upvote cost + gas |
