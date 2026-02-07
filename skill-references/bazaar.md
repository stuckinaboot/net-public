# Net Bazaar Reference

Buy, sell, and trade NFTs on NFT Bazaar using Net Protocol's Seaport-based exchange.

## Overview

NFT Bazaar is built on Seaport (v1.6). It supports:
- Fixed-price NFT listings
- Collection offers (bid on any token in a collection)
- Private listings (targeted to a specific buyer)
- EIP-712 signed orders (gasless order creation)

All commands support two modes:
1. **With `--private-key`**: Full flow (approve, sign, submit) executed directly
2. **Without `--private-key`**: Outputs transaction data / EIP-712 data for external signing (agents, hardware wallets)

## Supported Chains

| Chain | Chain ID | Status |
|-------|----------|--------|
| Base | 8453 | Supported |

## Commands

### List Listings

View active NFT listings:

```bash
netp bazaar list-listings \
  [--nft-address <address>] \
  [--chain-id <8453>] \
  [--rpc-url <url>] \
  [--json]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--nft-address` | No | NFT contract address (omit for cross-collection) |
| `--chain-id` | No | Chain ID (default from env) |
| `--json` | No | Output in JSON format |

**JSON Output:**
```json
[
  {
    "orderHash": "0x...",
    "maker": "0x...",
    "nftAddress": "0x...",
    "tokenId": "42",
    "price": 0.1,
    "priceWei": "100000000000000000",
    "currency": "eth",
    "expirationDate": 1770537792,
    "orderStatus": 2
  }
]
```

### List Offers

View active collection offers:

```bash
netp bazaar list-offers \
  --nft-address <address> \
  [--chain-id <8453>] \
  [--rpc-url <url>] \
  [--json]
```

### List Sales

View recent sales:

```bash
netp bazaar list-sales \
  --nft-address <address> \
  [--chain-id <8453>] \
  [--rpc-url <url>] \
  [--json]
```

### Owned NFTs

Query NFTs owned by an address (read-only, uses on-chain helper contract):

```bash
netp bazaar owned-nfts \
  --nft-address <address> \
  --owner <address> \
  [--chain-id <8453>] \
  [--rpc-url <url>] \
  [--json] \
  [--start-token-id <id>] \
  [--end-token-id <id>]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--nft-address` | Yes | NFT contract address |
| `--owner` | Yes | Owner address to check |
| `--start-token-id` | No | Start of token ID range (default: 0) |
| `--end-token-id` | No | End of token ID range (default: 10000) |
| `--json` | No | Output in JSON format |

### Create Listing

Create an NFT listing. Dual mode:

**With private key (full flow):**
```bash
netp bazaar create-listing \
  --nft-address <address> \
  --token-id <id> \
  --price <eth> \
  [--target-fulfiller <address>] \
  --chain-id 8453 \
  --private-key 0x...
```

Steps executed: approve Seaport for NFT -> sign EIP-712 order -> submit listing on-chain.

**Without private key (output EIP-712 data):**
```bash
netp bazaar create-listing \
  --nft-address <address> \
  --token-id <id> \
  --price <eth> \
  --offerer <address> \
  --chain-id 8453
```

**Output:**
```json
{
  "eip712": {
    "domain": { "name": "Seaport", "version": "1.6", "chainId": 8453, "verifyingContract": "0x..." },
    "types": { "OrderComponents": [...], "OfferItem": [...], "ConsiderationItem": [...] },
    "primaryType": "OrderComponents",
    "message": { ... }
  },
  "orderParameters": { ... },
  "counter": "0",
  "approvals": [
    { "to": "0x...", "data": "0x...", "description": "Approve setApprovalForAll" }
  ]
}
```

The agent should:
1. Submit each approval transaction via `/agent/submit`
2. Sign the `eip712` data via `/agent/sign` with `signatureType: "eth_signTypedData_v4"`
3. Save the output to a file, then use `submit-listing` to build the final transaction

### Create Offer

Create a collection offer (bid on any token in a collection). Same dual mode as create-listing:

**With private key:**
```bash
netp bazaar create-offer \
  --nft-address <address> \
  --price <eth> \
  --chain-id 8453 \
  --private-key 0x...
```

**Without private key:**
```bash
netp bazaar create-offer \
  --nft-address <address> \
  --price <eth> \
  --offerer <address> \
  --chain-id 8453
```

Output format is the same as create-listing. Use `submit-offer` for the follow-up.

### Submit Listing

Submit a signed listing (follow-up to keyless `create-listing`):

```bash
netp bazaar submit-listing \
  --order-data <path> \
  --signature <sig> \
  --chain-id 8453 \
  [--private-key 0x...] \
  [--encode-only]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--order-data` | Yes | Path to JSON file from create-listing output (contains orderParameters + counter) |
| `--signature` | Yes | EIP-712 signature (0x-prefixed) |
| `--private-key` | No | If provided, sends the submit tx directly |
| `--encode-only` | No | Output submit tx calldata as JSON |

**Encode-only output:**
```json
{
  "to": "0x...",
  "data": "0x...",
  "chainId": 8453,
  "value": "0"
}
```

### Submit Offer

Same as submit-listing but for offers:

```bash
netp bazaar submit-offer \
  --order-data <path> \
  --signature <sig> \
  --chain-id 8453 \
  [--private-key 0x...] \
  [--encode-only]
```

### Buy Listing

Buy an NFT listing by order hash:

**With private key:**
```bash
netp bazaar buy-listing \
  --order-hash <hash> \
  --nft-address <address> \
  --chain-id 8453 \
  --private-key 0x...
```

**Encode-only (for agents):**
```bash
netp bazaar buy-listing \
  --order-hash <hash> \
  --nft-address <address> \
  --buyer <address> \
  --chain-id 8453 \
  --encode-only
```

**Encode-only output:**
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

The `value` field is the listing price in wei. The agent must include this value when submitting the fulfillment transaction.

### Accept Offer

Accept a collection offer by selling your NFT:

**With private key:**
```bash
netp bazaar accept-offer \
  --order-hash <hash> \
  --nft-address <address> \
  --token-id <id> \
  --chain-id 8453 \
  --private-key 0x...
```

**Encode-only (for agents):**
```bash
netp bazaar accept-offer \
  --order-hash <hash> \
  --nft-address <address> \
  --token-id <id> \
  --seller <address> \
  --chain-id 8453 \
  --encode-only
```

## Agent Integration Workflows

### Buy a Listed NFT (Encode-Only)

```bash
# 1. Find available listings
netp bazaar list-listings --nft-address 0x... --chain-id 8453 --json

# 2. Get encoded buy transaction
netp bazaar buy-listing \
  --order-hash 0x... \
  --nft-address 0x... \
  --buyer 0xAgentWallet \
  --chain-id 8453 \
  --encode-only

# 3. Submit via agent (e.g., Bankr /agent/submit)
# Include the fulfillment.value as the transaction value
```

### Create and Submit a Listing (Keyless + Agent Signing)

```bash
# 1. Get EIP-712 data and approval txs
netp bazaar create-listing \
  --nft-address 0x... \
  --token-id 42 \
  --price 0.1 \
  --offerer 0xAgentWallet \
  --chain-id 8453

# 2. Submit approval txs via agent (from "approvals" array)

# 3. Sign the EIP-712 data via agent
#    signatureType: "eth_signTypedData_v4"
#    typedData: the "eip712" object from step 1

# 4. Save orderParameters + counter to a JSON file

# 5. Get encoded submit transaction
netp bazaar submit-listing \
  --order-data ./order.json \
  --signature 0xSignatureFromStep3 \
  --chain-id 8453 \
  --encode-only

# 6. Submit the encoded transaction via agent
```

### Accept a Collection Offer (Encode-Only)

```bash
# 1. Find available offers
netp bazaar list-offers --nft-address 0x... --chain-id 8453 --json

# 2. Get encoded accept transaction
netp bazaar accept-offer \
  --order-hash 0x... \
  --nft-address 0x... \
  --token-id 42 \
  --seller 0xAgentWallet \
  --chain-id 8453 \
  --encode-only

# 3. Submit approval txs (if any) and fulfillment tx via agent
```

## Finding the Order Hash

The `--order-hash` flag (used by `buy-listing` and `accept-offer`) comes from the `orderHash` field in the output of `list-listings` or `list-offers`. Always use `--json` for reliable parsing:

```bash
# Get order hashes from listings
netp bazaar list-listings --nft-address 0x... --chain-id 8453 --json | jq '.[].orderHash'
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Listing not found" | Order hash doesn't match any active listing | Listing may have been fulfilled or cancelled |
| "Insufficient funds" | Not enough ETH for purchase | Fund wallet with listing price + gas |
| "--offerer is required" | Keyless mode needs offerer address | Add `--offerer 0x...` flag |
| "--buyer is required" | Encode-only buy needs buyer address | Add `--buyer 0x...` flag |
| "--seller is required" | Encode-only accept needs seller address | Add `--seller 0x...` flag |

## Cost Considerations

- **Creating listings/offers**: Gas for approval tx + submit tx (~0.001-0.003 ETH on Base)
- **Buying listings**: Listing price + gas (~0.0005-0.002 ETH gas on Base)
- **Accepting offers**: Gas for approval + fulfillment (~0.001-0.003 ETH on Base)
- **Reading data**: Free (view calls)
