# Net Bazaar Reference

Buy, sell, and trade NFTs **and ERC-20 tokens** on Net Bazaar using Net Protocol's Seaport-based exchange.

## Overview

Net Bazaar is built on Seaport (v1.6). It supports:
- Fixed-price NFT listings and ERC-20 token listings
- Collection offers (bid on any token in an NFT collection) and ERC-20 token offers
- Private listings (targeted to a specific buyer)
- EIP-712 signed orders (gasless order creation)

NFT listings and ERC-20 listings are paid in the chain's native currency (ETH on Base/Ethereum, HYPE on HyperEVM). NFT collection offers and ERC-20 offers are paid in the wrapped native currency (WETH or wrapped HYPE) — the offerer pre-approves it so the fulfiller can pull it on acceptance.

All commands support two modes:
1. **With `--private-key`**: Full flow (approve, sign, submit) executed directly
2. **Without `--private-key`**: Outputs transaction data / EIP-712 data for external signing (agents, hardware wallets)

## Approval Spender (Important)

**The bazaar CLI handles all approvals for you.** Every encode-only command (`buy-*`, `accept-*`, `create-*`, `submit-*`, `cancel-*`) returns an `approvals` array that is **exhaustive** — the CLI has already queried on-chain allowance / `isApprovedForAll` state and emitted exactly the approval transactions that are still needed. Submit each entry in `approvals` in order, then the `fulfillment` (or signed order). Do not invent extra approval transactions based on general NFT-marketplace intuition.

**You do not need to run your own separate checks before submitting.** Do not call `allowance(...)`, `isApprovedForAll(...)`, or any other read against the asset or Seaport to "verify" the CLI's output. The CLI already did that read. Submit `approvals` (if any) and then `fulfillment` — that's the whole flow.

In particular:

- **There is no conduit.** Net Bazaar uses Seaport **directly** — `conduitKey` is always `0x00…00` (zero bytes32). Do NOT add a `setApprovalForAll` or `approve` to any "conduit" / "OpenSea conduit" / "Seaport conduit" contract — no such address exists in this flow.
- **There is no separate "bazaar contract" to approve.** All approvals (when present) target Seaport itself, and the CLI has already built them into the `approvals` array.
- **An empty `approvals` array means no approval is needed** — the maker has already approved Seaport for this asset. It does NOT mean "approval needed but spender unknown." Skip straight to the fulfillment.

The Seaport address table below is provided for the rare case where you need to **read** allowance state independently (e.g., a UI pre-flight check). Never use it to construct an *additional* approval tx on top of what the CLI returned.

When checking an existing allowance or `isApprovedForAll` independently, use the Seaport address for the chain as the spender:

| Chain | Chain ID | Seaport address (spender for approvals) |
|-------|----------|------------------------------------------|
| Ethereum | 1 | `0x0000000000000068F116a894984e2DB1123eB395` |
| Base | 8453 | `0x0000000000000068F116a894984e2DB1123eB395` |
| Base Sepolia | 84532 | `0x0000000000000068F116a894984e2DB1123eB395` |
| HyperEVM | 999 | `0x0000000000000068F116a894984e2DB1123eB395` |
| Unichain | 130 | `0x0000000000000068F116a894984e2DB1123eB395` |
| Plasma | 9745 | `0x0000000000000068F116a894984e2DB1123eB395` |
| Monad | 143 | `0x0000000000000068F116a894984e2DB1123eB395` |
| MegaETH | 4326 | `0x0000000000000068F116a894984e2DB1123eB395` |
| Degen | 666666666 | `0x0000000000000068F116a894984e2DB1123eB395` |
| Ham | 5112 | `0x0000000000000068F116a894984e2DB1123eB395` |
| Ink | 57073 | `0xD00C96804e9fF35f10C7D2a92239C351Ff3F94e5` |

Recap: the `approvals` array in keyless-mode output is **empty when the maker has already approved Seaport** — so an empty `approvals` array means "no approval needed", not "approval needed but spender unknown." If you need to verify the allowance yourself, query it against the Seaport address above for the chain — but do not turn that verification into an extra approval tx.

## Supported Chains

| Feature | Chain | Chain ID |
|---------|-------|----------|
| NFT bazaar | Base | 8453 |
| NFT bazaar | Ethereum | 1 |
| ERC-20 bazaar | Base | 8453 |
| ERC-20 bazaar | HyperEVM | 999 |

# NFT Commands

## List Listings

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

## List Offers

View active collection offers:

```bash
netp bazaar list-offers \
  --nft-address <address> \
  [--chain-id <8453>] \
  [--rpc-url <url>] \
  [--json]
```

## List Sales

View recent sales:

```bash
netp bazaar list-sales \
  --nft-address <address> \
  [--chain-id <8453>] \
  [--rpc-url <url>] \
  [--json]
```

## Owned NFTs

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

## Create Listing

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

Steps executed: approve Seaport (directly — no conduit) for the NFT -> sign EIP-712 order -> submit listing on-chain.

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

## Create Offer

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

## Submit Listing

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

## Submit Offer

Same as submit-listing but for offers:

```bash
netp bazaar submit-offer \
  --order-data <path> \
  --signature <sig> \
  --chain-id 8453 \
  [--private-key 0x...] \
  [--encode-only]
```

## Buy Listing

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

## Accept Offer

Accept a collection offer by selling your NFT. The `value` on the fulfillment transaction is **zero** — collection offers are paid in WETH (pre-approved by the buyer), not raw ETH.

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

# ERC-20 Commands

ERC-20 bazaar lets you list a specific quantity of an ERC-20 token for the chain's native currency, or offer wrapped native currency for a specific quantity of an ERC-20 token. Supported on **Base (8453)** and **HyperEVM (999)** only. The command shape mirrors the NFT commands, with `--token-address` in place of `--nft-address` and an explicit `--token-amount` (raw units, bigint string).

## List ERC-20 Listings

View active ERC-20 listings for a token:

```bash
netp bazaar list-erc20-listings \
  --token-address <address> \
  [--chain-id <8453|999>] \
  [--rpc-url <url>] \
  [--json]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--token-address` | Yes | ERC-20 token contract address |
| `--chain-id` | No | Chain ID (default from env) |
| `--json` | No | Output in JSON format |

**JSON Output:**
```json
[
  {
    "orderHash": "0x...",
    "maker": "0x...",
    "tokenAddress": "0x...",
    "tokenAmount": "1000000000000000000",
    "price": 1,
    "priceWei": "1000000000000000000",
    "pricePerToken": "0.000000000000000001",
    "pricePerTokenWei": "1",
    "currency": "eth",
    "expirationDate": 1770537792,
    "orderStatus": 2
  }
]
```

Field semantics (from `packages/net-bazaar/src/types.ts`):

- `tokenAmount`: raw token units as a bigint string (no decimal scaling applied).
- `price`: total price as a JS number (the chain's native currency — ETH on Base, HYPE on HyperEVM).
- `priceWei`: total price in wei as a bigint string.
- `pricePerTokenWei`: **bigint string**, computed as `priceWei / tokenAmount` (integer division — frequently rounds to `"0"` for 18-decimal tokens with sub-ETH-per-token prices).
- `pricePerToken`: **string** (not a number), full-decimal-precision native currency per single raw token unit. Use this field, not `pricePerTokenWei`, when you need an accurate per-unit price.
- `currency`: native-chain currency symbol (`"eth"`, `"hype"`, etc.) — not the wrapped-token name.
- `expirationDate`: Unix seconds.

Listings are sorted by price per token ascending.

## List ERC-20 Offers

View active ERC-20 offers for a token:

```bash
netp bazaar list-erc20-offers \
  --token-address <address> \
  [--chain-id <8453|999>] \
  [--rpc-url <url>] \
  [--json]
```

JSON output has the same field shapes and types as `list-erc20-listings` (`pricePerToken` is a string, `currency` is the native symbol such as `"eth"` / `"hype"`). Offer **payment is in the wrapped native currency** — WETH on Base, wrapped HYPE on HyperEVM — and the offerer pre-approves it so the seller can pull it on acceptance. Offers are sorted by price per token descending and filtered to those where the maker still has enough wrapped-currency balance.

## Create ERC-20 Listing

Create an ERC-20 listing (sell `tokenAmount` of a token for the chain's native currency). Dual mode:

**With private key (full flow):**
```bash
netp bazaar create-erc20-listing \
  --token-address <address> \
  --token-amount <raw-units> \
  --price <native-amount> \
  [--target-fulfiller <address>] \
  --chain-id 8453 \
  --private-key 0x...
```

Steps executed: approve Seaport (directly — no conduit) to spend the ERC-20 -> sign EIP-712 order -> submit listing on-chain.

**Without private key (output EIP-712 data):**
```bash
netp bazaar create-erc20-listing \
  --token-address <address> \
  --token-amount <raw-units> \
  --price <native-amount> \
  --offerer <address> \
  --chain-id 8453
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--token-address` | Yes | ERC-20 token contract address |
| `--token-amount` | Yes | Amount to sell in **raw units** (bigint string, e.g. `1000000000000000000` for 1.0 of an 18-decimal token) |
| `--price` | Yes | **Total** price in the chain's native currency (ETH on Base, HYPE on HyperEVM) for the whole `token-amount`, expressed as a decimal (e.g. `0.05`) |
| `--target-fulfiller` | No | Make a private listing for this address |
| `--offerer` | No | Required without `--private-key` |

Output format is the same as `create-listing` (EIP-712 data + approvals). Use `submit-erc20-listing` for the follow-up.

## Create ERC-20 Offer

Create an ERC-20 offer (bid wrapped native currency for `tokenAmount` of a token). Same dual mode:

**With private key:**
```bash
netp bazaar create-erc20-offer \
  --token-address <address> \
  --token-amount <raw-units> \
  --price <wrapped-native-amount> \
  --chain-id 8453 \
  --private-key 0x...
```

**Without private key:**
```bash
netp bazaar create-erc20-offer \
  --token-address <address> \
  --token-amount <raw-units> \
  --price <wrapped-native-amount> \
  --offerer <address> \
  --chain-id 8453
```

`--price` is the **total** amount of the wrapped native currency (WETH on Base, wrapped HYPE on HyperEVM) the offerer is bidding for the whole `token-amount`, expressed as a decimal. The approval emitted is a wrapped-native `approve` to **Seaport directly** (not a conduit — see "Approval Spender" above). Use `submit-erc20-offer` for the follow-up.

## Submit ERC-20 Listing

Submit a signed ERC-20 listing (follow-up to keyless `create-erc20-listing`):

```bash
netp bazaar submit-erc20-listing \
  --order-data <path> \
  --signature <sig> \
  --chain-id 8453 \
  [--private-key 0x...] \
  [--encode-only]
```

Parameters and output mirror `submit-listing`.

## Submit ERC-20 Offer

Same as `submit-erc20-listing` but for offers:

```bash
netp bazaar submit-erc20-offer \
  --order-data <path> \
  --signature <sig> \
  --chain-id 8453 \
  [--private-key 0x...] \
  [--encode-only]
```

## Buy ERC-20 Listing

Buy an ERC-20 listing by order hash (pays in the chain's native currency):

**With private key:**
```bash
netp bazaar buy-erc20-listing \
  --order-hash <hash> \
  --token-address <address> \
  --chain-id 8453 \
  --private-key 0x...
```

**Encode-only (for agents):**
```bash
netp bazaar buy-erc20-listing \
  --order-hash <hash> \
  --token-address <address> \
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
    "value": "50000000000000000"
  }
}
```

The `value` field is the listing's total price in wei of the chain's native currency (ETH on Base, HYPE on HyperEVM). The agent must include this value when submitting the fulfillment transaction.

## Accept ERC-20 Offer

Accept an ERC-20 offer by selling your tokens (receive wrapped native currency — WETH on Base, wrapped HYPE on HyperEVM). The fulfillment transaction's `value` is **zero** — the buyer's wrapped currency was pre-approved and is pulled by Seaport on acceptance.

**With private key:**
```bash
netp bazaar accept-erc20-offer \
  --order-hash <hash> \
  --token-address <address> \
  --chain-id 8453 \
  --private-key 0x...
```

**Encode-only (for agents):**
```bash
netp bazaar accept-erc20-offer \
  --order-hash <hash> \
  --token-address <address> \
  --seller <address> \
  --chain-id 8453 \
  --encode-only
```

The token amount being sold comes from the offer itself — there is no `--token-id` for ERC-20 offers. The `approvals` array will contain a Seaport ERC-20 approval if the seller hasn't already approved.

## Cancel ERC-20 Listing

Cancel an ERC-20 listing you created:

```bash
netp bazaar cancel-erc20-listing \
  --order-hash <hash> \
  --token-address <address> \
  --chain-id 8453 \
  [--private-key 0x... | --maker <address> --encode-only]
```

`--maker` is required when using `--encode-only`. The CLI verifies the order belongs to the maker (using `includeExpired: true` so the maker can still locate and cancel expired listings).

## Cancel ERC-20 Offer

Cancel an ERC-20 offer you created:

```bash
netp bazaar cancel-erc20-offer \
  --order-hash <hash> \
  --token-address <address> \
  --chain-id 8453 \
  [--private-key 0x... | --maker <address> --encode-only]
```

# Agent Integration Workflows

## Buy a Listed NFT (Encode-Only)

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

## Create and Submit a Listing (Keyless + Agent Signing)

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

## Accept a Collection Offer (Encode-Only)

```bash
# 1. Find available offers
netp bazaar list-offers --nft-address 0x... --chain-id 8453 --json

# 2. Get encoded accept transaction (fulfillment.value will be 0 — buyer pays in WETH)
netp bazaar accept-offer \
  --order-hash 0x... \
  --nft-address 0x... \
  --token-id 42 \
  --seller 0xAgentWallet \
  --chain-id 8453 \
  --encode-only

# 3. Submit approval txs (if any) and fulfillment tx via agent
```

## Buy an ERC-20 Listing (Encode-Only)

```bash
# 1. Find available ERC-20 listings (sorted by price per token ascending)
netp bazaar list-erc20-listings --token-address 0x... --chain-id 8453 --json

# 2. Get encoded buy transaction
netp bazaar buy-erc20-listing \
  --order-hash 0x... \
  --token-address 0x... \
  --buyer 0xAgentWallet \
  --chain-id 8453 \
  --encode-only

# 3. Submit via agent. Include fulfillment.value (total native-currency price in wei).
```

## Accept an ERC-20 Offer (Encode-Only)

```bash
# 1. Find available ERC-20 offers (sorted by price per token descending, balance-validated)
netp bazaar list-erc20-offers --token-address 0x... --chain-id 8453 --json

# 2. Get encoded accept transaction (no --token-id; amount is in the offer; fulfillment.value is 0)
netp bazaar accept-erc20-offer \
  --order-hash 0x... \
  --token-address 0x... \
  --seller 0xAgentWallet \
  --chain-id 8453 \
  --encode-only

# 3. Submit approval txs (Seaport ERC-20 approval if needed), then the fulfillment tx, via agent
```

## Finding the Order Hash

The `--order-hash` flag (used by `buy-listing`, `accept-offer`, `buy-erc20-listing`, `accept-erc20-offer`, and the cancel commands) comes from the `orderHash` field in the output of the corresponding `list-*` command. Always use `--json` for reliable parsing:

```bash
# NFT
netp bazaar list-listings --nft-address 0x... --chain-id 8453 --json | jq '.[].orderHash'

# ERC-20
netp bazaar list-erc20-listings --token-address 0x... --chain-id 8453 --json | jq '.[].orderHash'
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Listing not found" | Order hash doesn't match any active listing | Listing may have been fulfilled or cancelled |
| "ERC-20 listing with order hash ... not found or no longer active" | Same, for ERC-20 listings | Re-query `list-erc20-listings` |
| "ERC-20 offer with order hash ... not found or no longer active" | Same, for ERC-20 offers | Re-query `list-erc20-offers` |
| "Insufficient funds" | Not enough native currency (NFT/ERC-20 listing buy) or wrapped native currency (ERC-20 offer accept) | Fund wallet with price + gas |
| "--offerer is required" | Keyless mode needs offerer address | Add `--offerer 0x...` flag |
| "--buyer is required" | Encode-only buy needs buyer address | Add `--buyer 0x...` flag |
| "--seller is required" | Encode-only accept needs seller address | Add `--seller 0x...` flag |
| "--maker is required" | Encode-only cancel needs maker address | Add `--maker 0x...` flag |

## Cost Considerations

Gas estimates below are for Base; HyperEVM and Ethereum will differ.

- **Creating listings/offers (NFT or ERC-20)**: Gas for approval tx + submit tx (~0.001-0.003 ETH on Base)
- **Buying NFT listings / ERC-20 listings**: Listing price (in the chain's native currency) + gas (~0.0005-0.002 ETH on Base)
- **Accepting NFT offers**: Gas for NFT approval + fulfillment (~0.001-0.003 ETH on Base); payment received in WETH (no ETH transfer in the fulfillment tx)
- **Accepting ERC-20 offers**: Gas for ERC-20 approval (if needed) + fulfillment; payment received in the wrapped native currency (WETH on Base, wrapped HYPE on HyperEVM); fulfillment tx `value` is zero
- **Reading data**: Free (view calls)
