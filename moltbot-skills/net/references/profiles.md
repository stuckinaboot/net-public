# Net Profile Reference

Manage on-chain user profiles using Net Protocol's decentralized identity system.

## Overview

Net Profiles provide on-chain identity storage for:
- Profile pictures (avatar URLs)
- Bio/description text
- Social links (X/Twitter username)

All profile data is stored on-chain, making it portable and decentralized.

## Commands

### Get Profile

Retrieve profile data for an address:

```bash
netp profile get \
  --address <wallet-address> \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--json]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--address` | Yes | Wallet address to lookup |
| `--chain-id` | No | Chain to query (default from env) |
| `--rpc-url` | No | Custom RPC endpoint |
| `--json` | No | Output in JSON format |

**Examples:**
```bash
# Get profile
netp profile get --address 0x1234... --chain-id 8453

# JSON output
netp profile get --address 0x1234... --chain-id 8453 --json
```

**Output:**
```
Profile for 0x1234...
======================
Picture: https://example.com/avatar.png
Bio: Building the future of web3
X Username: @cryptobuilder
```

**JSON Output:**
```json
{
  "address": "0x1234...",
  "picture": "https://example.com/avatar.png",
  "bio": "Building the future of web3",
  "xUsername": "cryptobuilder"
}
```

### Set Profile Picture

Update your profile picture URL:

```bash
netp profile set-picture \
  --url <image-url> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--encode-only]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--url` | Yes | URL to profile image |
| `--private-key` | No | Wallet key (prefer env var) |
| `--chain-id` | No | Target chain |
| `--encode-only` | No | Output transaction JSON |

**Supported URL formats:**
- HTTPS: `https://example.com/avatar.png`
- IPFS: `ipfs://QmXxx...`
- Data URLs (small images)

**Examples:**
```bash
# Set HTTPS image
netp profile set-picture --url "https://example.com/my-avatar.png" --chain-id 8453

# Set IPFS image
netp profile set-picture --url "ipfs://QmXyzAbc123..." --chain-id 8453
```

### Set Bio

Update your profile bio:

```bash
netp profile set-bio \
  --bio <bio-text> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--encode-only]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--bio` | Yes | Bio text (max 280 characters) |
| `--private-key` | No | Wallet key (prefer env var) |
| `--chain-id` | No | Target chain |
| `--encode-only` | No | Output transaction JSON |

**Constraints:**
- Maximum 280 characters
- No control characters allowed
- UTF-8 text supported

**Examples:**
```bash
# Set bio
netp profile set-bio --bio "Web3 developer | Building on Base" --chain-id 8453

# Longer bio
netp profile set-bio --bio "Founder @myproject | Previously @bigtech | Passionate about decentralization and open source" --chain-id 8453
```

### Set X (Twitter) Username

Link your X/Twitter account:

```bash
netp profile set-x-username \
  --username <x-username> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--encode-only]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--username` | Yes | X username (without @) |
| `--private-key` | No | Wallet key (prefer env var) |
| `--chain-id` | No | Target chain |
| `--encode-only` | No | Output transaction JSON |

**Notes:**
- Username stored without @ prefix
- If you include @, it's automatically stripped
- Case is preserved

**Examples:**
```bash
# Set username (without @)
netp profile set-x-username --username "myhandle" --chain-id 8453

# With @ (stripped automatically)
netp profile set-x-username --username "@myhandle" --chain-id 8453
```

## Profile Data Storage

Profile data is stored on-chain via Net Storage:
- Each field is stored separately
- Updates overwrite previous values
- Historical values remain accessible via index

## Use Cases

### Set Up New Profile
```bash
# Set all profile fields
netp profile set-picture --url "https://example.com/avatar.png" --chain-id 8453
netp profile set-bio --bio "Blockchain enthusiast and developer" --chain-id 8453
netp profile set-x-username --username "blockchaindev" --chain-id 8453
```

### Update Profile Picture
```bash
# Change avatar
netp profile set-picture --url "https://newsite.com/new-avatar.png" --chain-id 8453
```

### View Another User's Profile
```bash
# Lookup profile
netp profile get --address 0xFriend... --chain-id 8453 --json
```

### Build Profile Directory
```bash
# Script to fetch multiple profiles
for addr in 0x111... 0x222... 0x333...; do
  netp profile get --address $addr --chain-id 8453 --json
done
```

## Cross-Chain Profiles

Profiles are chain-specific. You may have different profiles on different chains:

```bash
# Set profile on Base
netp profile set-bio --bio "Base builder" --chain-id 8453

# Set different profile on Ethereum
netp profile set-bio --bio "Ethereum OG" --chain-id 1
```

**Recommendation:** Use Base for primary profile (lowest gas costs).

## Encode-Only Mode

For hardware wallet users:

```bash
netp profile set-picture \
  --url "https://example.com/avatar.png" \
  --chain-id 8453 \
  --encode-only

# Output: {"to": "0x...", "data": "0x...", "chainId": 8453, "value": "0"}
```

Sign the transaction externally and broadcast.

## Cost Considerations

Profile updates are on-chain transactions:
- Each field update costs gas
- Longer bios cost more gas
- L2 chains (Base) are cheapest

**Estimates (Base):**
- Set picture: ~0.0001-0.0005 ETH
- Set bio: ~0.0001-0.001 ETH (depends on length)
- Set X username: ~0.0001-0.0005 ETH

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Bio too long" | Exceeds 280 chars | Shorten bio text |
| "Invalid URL" | Malformed URL | Check URL format |
| "Invalid characters" | Control chars in bio | Remove special characters |
| "Profile not found" | No profile set | Profile fields are optional |

## Best Practices

1. **Use permanent image hosting**: IPFS or reliable CDN
2. **Keep bio concise**: Short and descriptive
3. **Consistent identity**: Use same profile across chains
4. **Verify username**: Double-check X username spelling
5. **Use Base**: Lowest cost for profile updates

## Privacy Considerations

- All profile data is public on-chain
- Anyone can read any address's profile
- Consider what information you share
- Profiles are linked to wallet addresses
