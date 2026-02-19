# Net Profile Reference

Manage on-chain user profiles using Net Protocol's decentralized identity system.

## Overview

Net Profiles provide on-chain identity storage for:
- Profile pictures (avatar URLs)
- Bio/description text
- Social links (X/Twitter username)
- Token address (ERC-20 token that represents you)
- Canvas (custom HTML profile page)
- Custom CSS theme (profile color/style customization)

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
  [--encode-only] \
  [--address <address>]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--bio` | Yes | Bio text (max 280 characters) |
| `--private-key` | No | Wallet key (prefer env var) |
| `--chain-id` | No | Target chain |
| `--encode-only` | No | Output transaction JSON |
| `--address` | No | Wallet address to preserve existing metadata for (used with --encode-only) |

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
  [--encode-only] \
  [--address <address>]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--username` | Yes | X username (without @) |
| `--private-key` | No | Wallet key (prefer env var) |
| `--chain-id` | No | Target chain |
| `--encode-only` | No | Output transaction JSON |
| `--address` | No | Wallet address to preserve existing metadata for (used with --encode-only) |

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

### Set Token Address

Associate an ERC-20 token contract address with your profile:

```bash
netp profile set-token-address \
  --token-address <address> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--encode-only] \
  [--address <address>]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--token-address` | Yes | ERC-20 token contract address (0x-prefixed) |
| `--private-key` | No | Wallet key (prefer env var) |
| `--chain-id` | No | Target chain |
| `--encode-only` | No | Output transaction JSON |
| `--address` | No | Wallet address to preserve existing metadata for (used with --encode-only) |

**Notes:**
- Token address is stored as lowercase
- Must be a valid EVM address (0x-prefixed, 40 hex characters)
- Preserves existing profile metadata (bio, X username, display name) when updating

**Examples:**
```bash
# Set token address
netp profile set-token-address --token-address 0x1234... --chain-id 8453

# Encode-only (for agents)
netp profile set-token-address --token-address 0x1234... --chain-id 8453 --encode-only
```

### Set Canvas

Set a custom HTML profile canvas (max 60KB):

```bash
netp profile set-canvas \
  --file <path> | --content <html> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--encode-only]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--file` | No* | Path to HTML file |
| `--content` | No* | Inline HTML content |
| `--private-key` | No | Wallet key (prefer env var) |
| `--chain-id` | No | Target chain |
| `--encode-only` | No | Output transaction JSON |

*Must provide either `--file` or `--content`, but not both.

**Notes:**
- Maximum canvas size: 60KB
- Binary files (images) are automatically converted to data URIs
- Content is compressed using gzip before storage
- Uses ChunkedStorage for efficient on-chain storage

**Examples:**
```bash
# Set canvas from file
netp profile set-canvas --file ./my-canvas.html --chain-id 8453

# Set canvas from inline content
netp profile set-canvas --content "<html><body><h1>My Profile</h1></body></html>" --chain-id 8453

# Encode-only (for agents)
netp profile set-canvas --file ./canvas.html --chain-id 8453 --encode-only
```

### Set CSS Theme

Set a custom CSS theme for your profile (max 10KB):

```bash
netp profile set-css \
  --file <path> | --content <css> | --theme <name> \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--encode-only]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--file` | No* | Path to CSS file |
| `--content` | No* | Inline CSS content |
| `--theme` | No* | Built-in demo theme name |
| `--private-key` | No | Wallet key (prefer env var) |
| `--chain-id` | No | Target chain |
| `--rpc-url` | No | Custom RPC endpoint |
| `--encode-only` | No | Output transaction JSON |

*Must provide exactly one of `--file`, `--content`, or `--theme`.

**Notes:**
- Maximum CSS size: 10KB
- CSS is validated before storage (no script injection allowed)
- Uses regular Net Storage (not chunked — CSS is small)
- CSS targets the `.profile-themed` wrapper class on the profile page
- Available CSS variables: `--background`, `--foreground`, `--primary`, `--card`, `--border`, etc. (HSL values without the `hsl()` wrapper)

**Examples:**
```bash
# Set CSS from file
netp profile set-css --file ./my-theme.css --chain-id 8453

# Set CSS from inline content
netp profile set-css --content ".profile-themed { --background: 0 0% 5%; --primary: 330 100% 60%; }" --chain-id 8453

# Use a built-in demo theme (run --list-themes to see available names)
netp profile set-css --theme sunset --chain-id 8453

# Encode-only (for agents)
netp profile set-css --theme sunset --chain-id 8453 --encode-only
```

### Get CSS Theme

Retrieve a user's custom CSS theme:

```bash
netp profile get-css \
  --address <wallet-address> \
  [--output <path>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--json]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--address` | Yes | Wallet address to lookup |
| `--output` | No | Write to file instead of stdout |
| `--chain-id` | No | Chain to query (default from env) |
| `--rpc-url` | No | Custom RPC endpoint |
| `--json` | No | Output in JSON format |

**Notes:**
- Outputs CSS to stdout by default
- JSON output includes metadata (has CSS flag, content length)

**Examples:**
```bash
# Output CSS to stdout
netp profile get-css --address 0x1234... --chain-id 8453

# Save CSS to file
netp profile get-css --address 0x1234... --output ./theme.css --chain-id 8453

# JSON output with metadata
netp profile get-css --address 0x1234... --chain-id 8453 --json
```

**JSON Output:**
```json
{
  "address": "0x1234...",
  "chainId": 8453,
  "css": ".profile-themed { --background: 0 0% 5%; }",
  "hasCSS": true,
  "contentLength": 44
}
```

### CSS Prompt

Print the AI prompt for generating profile CSS themes, or list available demo themes:

```bash
netp profile css-prompt [--list-themes]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--list-themes` | No | List available demo theme names |

**Examples:**
```bash
# Print the full AI prompt for CSS generation
netp profile css-prompt

# List available demo themes
netp profile css-prompt --list-themes
```

### Get Canvas

Retrieve a user's profile canvas:

```bash
netp profile get-canvas \
  --address <wallet-address> \
  [--output <path>] \
  [--chain-id <8453|1|...>] \
  [--rpc-url <custom-rpc>] \
  [--json]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--address` | Yes | Wallet address to lookup |
| `--output` | No | Write to file instead of stdout |
| `--chain-id` | No | Chain to query (default from env) |
| `--rpc-url` | No | Custom RPC endpoint |
| `--json` | No | Output in JSON format |

**Notes:**
- Outputs canvas HTML to stdout by default
- Binary content (data URIs) is automatically converted to binary files when using `--output`
- JSON output includes metadata (size, type, filename)

**Examples:**
```bash
# Output canvas to stdout
netp profile get-canvas --address 0x1234... --chain-id 8453

# Save canvas to file
netp profile get-canvas --address 0x1234... --output ./canvas.html --chain-id 8453

# JSON output with metadata
netp profile get-canvas --address 0x1234... --chain-id 8453 --json
```

**JSON Output:**
```json
{
  "address": "0x1234...",
  "chainId": 8453,
  "canvas": "<html>...</html>",
  "filename": "profile-compressed.html",
  "hasCanvas": true,
  "isDataUri": false,
  "contentLength": 25591
}
```

## Encode-Only Mode (For Agents)

**For Bankr agent and other services that submit transactions themselves**, use `--encode-only` to generate transaction data for any profile update.

**Important:** When updating metadata fields (bio, X username, display name, token address) in encode-only mode, pass `--address` to preserve existing metadata. Without it, unspecified fields are overwritten with empty values.

### Set Profile Picture
```bash
netp profile set-picture \
  --url "https://example.com/avatar.png" \
  --chain-id 8453 \
  --encode-only
```

**Output:**
```json
{
  "to": "0x7C1104263be8D5eF7d5E5e8D7f0f8E8E8E8E8E8E",
  "data": "0x1234abcd...",
  "chainId": 8453,
  "value": "0"
}
```

### Set Bio
```bash
# --address preserves existing x_username, display_name, and token_address
netp profile set-bio \
  --bio "Automated trading bot on Base" \
  --address 0xYourWalletAddress \
  --chain-id 8453 \
  --encode-only
```

### Set X Username
```bash
netp profile set-x-username \
  --username "mybothandle" \
  --address 0xYourWalletAddress \
  --chain-id 8453 \
  --encode-only
```

### Set Display Name
```bash
netp profile set-display-name \
  --name "My Bot" \
  --address 0xYourWalletAddress \
  --chain-id 8453 \
  --encode-only
```

### Set Token Address
```bash
netp profile set-token-address \
  --token-address 0xYourTokenAddress \
  --address 0xYourWalletAddress \
  --chain-id 8453 \
  --encode-only
```

### Set Canvas
```bash
netp profile set-canvas \
  --file ./custom-profile.html \
  --chain-id 8453 \
  --encode-only
```

### Set CSS Theme
```bash
netp profile set-css \
  --theme sunset \
  --chain-id 8453 \
  --encode-only

# Or from file
netp profile set-css \
  --file ./my-theme.css \
  --chain-id 8453 \
  --encode-only
```

The agent submits these transactions through its own wallet infrastructure. No private key is required for the CLI when using `--encode-only`.

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
netp profile set-token-address --token-address 0xYourTokenAddress --chain-id 8453
netp profile set-canvas --file ./my-profile.html --chain-id 8453
netp profile set-css --theme sunset --chain-id 8453
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
- Set picture: ~0.00001-0.0001 ETH
- Set bio: ~0.00001-0.0001 ETH
- Set X username: ~0.00001-0.0001 ETH
- Set token address: ~0.00001-0.0001 ETH
- Set canvas: ~0.0001-0.001 ETH (depends on size)
- Set CSS: ~0.00001-0.0001 ETH

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Bio too long" | Exceeds 280 chars | Shorten bio text |
| "Invalid URL" | Malformed URL | Check URL format |
| "Invalid characters" | Control chars in bio | Remove special characters |
| "Profile not found" | No profile set | Profile fields are optional |
| "File too large" | Canvas exceeds 60KB | Reduce canvas file size |
| "No canvas found" | Address has no canvas | Canvas is optional |
| "CSS too large" | CSS exceeds 10KB | Reduce CSS file size |
| "Invalid CSS" | Disallowed patterns | Remove script injection patterns |
| "No custom CSS found" | Address has no CSS | CSS is optional |

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
