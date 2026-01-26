# @net-protocol/netr

SDK for deploying and interacting with **Netr tokens** - memecoin-NFT pairs on Net Protocol.

## What is a Netr Token?

A Netr token is a memecoin-NFT pairing:

- **ERC-20 Token**: The memecoin itself with full liquidity
- **Optional NFT Drop**: A paired ERC1155 NFT collection (via Inscribed Drops)
- **Automatic Liquidity**: Uniswap V3 pool created at deployment
- **Locked Liquidity**: LP locked for ~1000 years (rug-pull protection)
- **Creator Fees**: 5% of trading fees go to token creator

> **Note**: At the smart contract level, this system is called "Banger" (e.g., `BangerV4.sol`). The SDK uses "Netr" for consistency with the Net Protocol brand.

## Installation

```bash
npm install @net-protocol/netr
# or
yarn add @net-protocol/netr
```

### Peer Dependencies

```bash
npm install react wagmi viem
```

## Quick Start

### React Hooks

```tsx
import { useNetrToken, useNetrPrice, useNetrLocker } from "@net-protocol/netr";

function TokenInfo({ tokenAddress }: { tokenAddress: `0x${string}` }) {
  // Fetch token metadata
  const { data: token, isLoading } = useNetrToken({
    chainId: 8453, // Base
    tokenAddress,
  });

  // Fetch current price (auto-refreshes every 5 seconds)
  const { data: price, poolAddress } = useNetrPrice({
    chainId: 8453,
    tokenAddress,
    refreshInterval: 5000,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>
        {token?.name} ({token?.symbol})
      </h1>
      <img src={token?.image} alt={token?.name} />
      <p>Deployer: {token?.deployer}</p>
      <p>Price: {price?.priceInEth} ETH</p>
    </div>
  );
}
```

### Non-React Client

```typescript
import { NetrClient } from "@net-protocol/netr";

const client = new NetrClient({ chainId: 8453 });

// Get token metadata
const token = await client.getToken("0x...");
console.log(token?.name, token?.symbol);

// Get current price
const price = await client.getPrice("0x...");
console.log(`Price: ${price?.priceInEth} ETH`);

// Get storage data (pool, locker addresses)
const storage = await client.getStorageData("0x...");
console.log(`Pool: ${storage?.poolAddress}`);
console.log(`Locker: ${storage?.lockerAddress}`);

// Get locker info
if (storage?.lockerAddress) {
  const locker = await client.getLocker(storage.lockerAddress);
  console.log(`Lock ends: ${new Date(Number(locker?.endTimestamp) * 1000)}`);
}
```

### Building Deploy Transactions

```typescript
import { NetrClient, DEFAULT_TOTAL_SUPPLY } from "@net-protocol/netr";

const client = new NetrClient({ chainId: 8453 });

// Generate salt and predict token address
const saltResult = await client.generateSalt({
  name: "My Token",
  symbol: "MTK",
  image: "https://example.com/image.png",
  deployer: "0x...", // Your address
});

console.log(`Predicted address: ${saltResult?.predictedAddress}`);

// Build deploy transaction config
const txConfig = client.buildDeployConfig(
  {
    name: "My Token",
    symbol: "MTK",
    image: "https://example.com/image.png",
    deployer: "0x...",
    // Optional NFT drop settings
    mintPrice: 0n, // Free mint
    mintEndTimestamp: 0n, // No end time
    maxMintSupply: 0n, // Unlimited
  },
  saltResult!.salt
);

// Use with wagmi's useWriteContract
// const { writeContract } = useWriteContract();
// writeContract(txConfig);
```

## API Reference

### React Hooks

| Hook             | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `useNetrToken`   | Fetch token metadata (name, symbol, etc) |
| `useNetrPrice`   | Fetch current WETH price with refresh    |
| `useNetrLocker`  | Fetch LP locker data                     |

### NetrClient Methods

| Method               | Purpose                               |
| -------------------- | ------------------------------------- |
| `getToken()`         | Get token metadata                    |
| `getStorageData()`   | Get pool, locker, drop addresses      |
| `getPrice()`         | Get current price from Uniswap pool   |
| `getPriceFromPool()` | Get price from known pool address     |
| `getLocker()`        | Get locker info                       |
| `generateSalt()`     | Generate salt and predict address     |
| `buildDeployConfig()`| Build deployment transaction config   |

### Utilities

```typescript
import {
  addressToBytes32,
  calculatePriceFromSqrtPriceX96,
  decodeBangerStorageData,
  estimateMarketCap,
  formatPrice,
} from "@net-protocol/netr";

// Convert address for storage key lookup
const key = addressToBytes32("0x...");

// Calculate price from Uniswap sqrtPriceX96
const price = calculatePriceFromSqrtPriceX96(sqrtPriceX96, tick);

// Estimate market cap
const marketCap = estimateMarketCap(price.priceInEth, totalSupply, 3000); // ETH at $3000
```

### Constants

```typescript
import {
  DEFAULT_TOTAL_SUPPLY, // 100 billion tokens
  DEFAULT_INITIAL_TICK, // ~$35k market cap
  CHAIN_INITIAL_TICKS, // Chain-specific initial ticks
  POOL_FEE_TIER, // 1% (10000)
  TOKEN_DECIMALS, // 18
} from "@net-protocol/netr";
```

### Chain Configuration

```typescript
import {
  getNetrContract,
  isNetrSupportedChain,
  getNetrSupportedChainIds,
} from "@net-protocol/netr";

// Get contract for chain
const contract = getNetrContract(8453); // Base
console.log(contract.address);

// Check chain support
if (isNetrSupportedChain(chainId)) {
  // Chain is supported
}

// Get all supported chains
const chains = getNetrSupportedChainIds(); // [8453, 9745, 143, 999]
```

## Supported Chains

| Chain       | Chain ID | Status |
| ----------- | -------- | ------ |
| Base        | 8453     | ✅     |
| Plasma      | 9745     | ✅     |
| Monad       | 143      | ✅     |
| Hyperliquid | 999      | ✅     |

## Types

All types are exported for TypeScript users:

```typescript
import type {
  NetrTokenMetadata,
  NetrPriceData,
  NetrLockerData,
  NetrStorageData,
  NetrDeployConfig,
  UseNetrTokenOptions,
} from "@net-protocol/netr";
```

## License

MIT
