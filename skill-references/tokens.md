# Net Token Deployment Reference

Deploy memecoins with automatic Uniswap V3 liquidity using Net Protocol's token system (Netr/Banger).

## Overview

Net Protocol enables one-command token deployment with:
- ERC-20 token creation
- Automatic Uniswap V3 pool setup
- Locked liquidity (LP tokens locked)
- Optional initial token purchase

## Supported Chains

Token deployment is available on select chains:

| Chain | Chain ID | Status |
|-------|----------|--------|
| Base | 8453 | ✅ Supported |
| Plasma | 9745 | ✅ Supported |
| Monad | 143 | ✅ Supported |
| HyperEVM | 999 | ✅ Supported |

Other chains (Ethereum, Degen, etc.) support storage and messaging but not token deployment.

## Commands

### Deploy Token

Create a new token with Uniswap V3 pool:

```bash
netp token deploy \
  --name <name> \
  --symbol <symbol> \
  --image <url> \
  [--animation <url>] \
  [--fid <number>] \
  [--private-key <0x...>] \
  [--chain-id <8453|9745|143|999>] \
  [--encode-only] \
  [--initial-buy <eth>] \
  [--mint-price <wei>] \
  [--mint-end-timestamp <timestamp>] \
  [--max-mint-supply <amount>] \
  [--metadata-address <address>] \
  [--extra-string-data <data>]
```

**Required Parameters:**
| Parameter | Description |
|-----------|-------------|
| `--name` | Token name (e.g., "My Cool Token") |
| `--symbol` | Token symbol (e.g., "COOL") |
| `--image` | URL to token logo image |

**Optional Parameters:**
| Parameter | Description |
|-----------|-------------|
| `--animation` | URL to animation (video/gif) |
| `--fid` | Farcaster ID for creator attribution |
| `--initial-buy` | ETH amount to swap for tokens on deploy |
| `--mint-price` | Price per mint in wei (for NFT drops) |
| `--mint-end-timestamp` | Unix timestamp when minting ends |
| `--max-mint-supply` | Maximum mintable supply |
| `--metadata-address` | Custom metadata contract address |
| `--extra-string-data` | Additional string metadata |
| `--encode-only` | Output transaction JSON without executing |

**Examples:**

Basic deployment:
```bash
netp token deploy \
  --name "Test Token" \
  --symbol "TEST" \
  --image "https://example.com/logo.png" \
  --chain-id 8453
```

With initial buy (swap 0.1 ETH for tokens):
```bash
netp token deploy \
  --name "My Token" \
  --symbol "MTK" \
  --image "https://example.com/mtk.png" \
  --initial-buy 0.1 \
  --chain-id 8453
```

With animation:
```bash
netp token deploy \
  --name "Animated Token" \
  --symbol "ANIM" \
  --image "https://example.com/logo.png" \
  --animation "https://example.com/animation.mp4" \
  --chain-id 8453
```

### Encode-Only Mode (For Agents)

**For Bankr agent and other services that submit transactions themselves**, use `--encode-only` to generate transaction data:

```bash
netp token deploy \
  --name "Bot Token" \
  --symbol "BOT" \
  --image "https://example.com/bot.png" \
  --chain-id 8453 \
  --encode-only
```

**Output:**
```json
{
  "to": "0x1234567890abcdef1234567890abcdef12345678",
  "data": "0xabcdef...",
  "chainId": 8453,
  "value": "0"
}
```

**With initial buy** (includes ETH value):
```bash
netp token deploy \
  --name "Bot Token" \
  --symbol "BOT" \
  --image "https://example.com/bot.png" \
  --initial-buy 0.1 \
  --chain-id 8453 \
  --encode-only
```

**Output:**
```json
{
  "to": "0x1234567890abcdef1234567890abcdef12345678",
  "data": "0xabcdef...",
  "chainId": 8453,
  "value": "100000000000000000"
}
```

Note: The `value` field is in wei. 0.1 ETH = 100000000000000000 wei. The agent must include this value when submitting the transaction.

### Get Token Info

Retrieve information about a deployed token:

```bash
netp token info \
  --address <token-address> \
  [--chain-id <8453|9745|143|999>] \
  [--json]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--address` | Yes | Token contract address |
| `--chain-id` | No | Chain to query |
| `--json` | No | Output in JSON format |

**Example:**
```bash
netp token info --address 0x1234... --chain-id 8453 --json
```

**Output includes:**
- Token name and symbol
- Total supply
- Creator address
- Pool address
- Metadata URLs

## Token Economics

### Initial Supply
Tokens are deployed with a fixed initial supply distributed to:
1. Uniswap V3 liquidity pool
2. Creator (if initial-buy specified)

### Liquidity
- Liquidity is added to Uniswap V3 automatically
- LP tokens are locked (non-removable)
- Creates immediate trading availability

### Initial Buy
When `--initial-buy` is specified:
1. Token is created
2. Pool is created
3. ETH amount is swapped for tokens
4. Creator receives tokens from the swap

## Use Cases

### Launch a Memecoin
```bash
netp token deploy \
  --name "Doge But Better" \
  --symbol "DOGEB" \
  --image "https://example.com/dogeb.png" \
  --initial-buy 0.5 \
  --chain-id 8453
```

### Community Token
```bash
netp token deploy \
  --name "DAO Governance" \
  --symbol "DAOG" \
  --image "https://dao.example.com/logo.png" \
  --chain-id 8453
```

### NFT Drop Token
```bash
netp token deploy \
  --name "Drop Token" \
  --symbol "DROP" \
  --image "https://example.com/drop.png" \
  --mint-price 10000000000000000 \
  --max-mint-supply 10000 \
  --mint-end-timestamp 1735689600 \
  --chain-id 8453
```

## Deployment Output

Successful deployment shows:
```
Deploying token...
Token Name: My Token
Symbol: MTK
Chain: Base (8453)

✓ Token deployed!
Token Address: 0xAbCd...
Pool Address: 0xEfGh...
Transaction: 0x1234...

View on Explorer: https://basescan.org/token/0xAbCd...
```

## Cost Considerations

Token deployment costs include:
- Contract deployment gas
- Pool creation gas
- Initial liquidity transaction
- Initial buy swap (if specified)

**Estimates (Base):**
- Basic deploy: ~0.005-0.01 ETH
- With initial buy: ~0.01-0.02 ETH + buy amount

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Unsupported chain" | Chain doesn't support tokens | Use Base, Plasma, Monad, or HyperEVM |
| "Invalid image URL" | Malformed URL | Use valid HTTPS URL |
| "Insufficient funds" | Not enough ETH | Add ETH for gas + initial buy |
| "Symbol too long" | Symbol exceeds limit | Use shorter symbol |

## Best Practices

1. **Test on Plasma first**: Lower fees for testing
2. **Use reliable image hosting**: IPFS or permanent URLs recommended
3. **Plan initial buy**: Consider market cap implications
4. **Save addresses**: Record token and pool addresses after deploy
5. **Verify on explorer**: Check deployment on block explorer

## Security Notes

- Liquidity is locked automatically
- Creator has no special admin privileges
- Token is standard ERC-20
- Pool parameters are immutable after creation
