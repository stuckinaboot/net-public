# @net-protocol/score

**Status: In Development** - This package is under active development. APIs may change without notice.

SDK for the Net Score system - an on-chain scoring/upvoting system for tokens, storage entries, and feed posts on Net Protocol.

## What is Net Score?

Net Score is a decentralized on-chain scoring system built on Net Protocol. It allows users to upvote content (tokens, storage entries, feed posts) using strategy-based voting where vote weight is derived from on-chain holdings.

**Key features:**
- **Token Upvotes**: Upvote tokens by address
- **Storage Upvotes**: Upvote storage entries by operator and key
- **Feed Upvotes**: Upvote feed posts by content
- **Strategy-Based Voting**: Vote weight is determined by on-chain strategies (Alpha holdings, Uniswap pool positions, or configurable splits)
- **Legacy Support**: Aggregates scores across legacy upvote contracts and current strategies

## What can you do with this package?

- **Read upvote counts** for tokens, storage entries, and feed posts
- **Batch-read upvotes** for multiple items in a single contract call
- **Query scores by strategy** to see per-strategy breakdowns
- **Query scores by app** for app-specific score data
- **Generate score keys** for any scoreable item type
- **Decode upvote messages** from Net protocol (legacy and strategy formats)
- **Decode strategy metadata** to inspect vote weight details
- **Select strategies** automatically based on pool key availability

This package provides both React hooks (for UI) and a client class (for non-React code).

## Installation

```bash
npm install @net-protocol/score @net-protocol/core @net-protocol/storage viem
# or
yarn add @net-protocol/score @net-protocol/core @net-protocol/storage viem
```

For React hooks, also install:
```bash
npm install react wagmi @tanstack/react-query
```

## Usage

### React Hooks

```typescript
import { useTokenUpvotes, useUpvotes, useUpvotesBatch } from "@net-protocol/score/react";
import { getTokenScoreKey, getStorageScoreKey } from "@net-protocol/score/react";

// Get upvotes for a single token
function TokenScore({ tokenAddress }: { tokenAddress: string }) {
  const { upvotes, isLoading } = useTokenUpvotes({
    chainId: 8453,
    tokenAddress,
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>Upvotes: {upvotes}</div>;
}

// Get upvotes for a single score key
function ScoreKeyUpvotes({ scoreKey }: { scoreKey: `0x${string}` }) {
  const { upvotes, isLoading } = useUpvotes({
    chainId: 8453,
    scoreKey,
  });

  return <div>{isLoading ? "..." : upvotes}</div>;
}

// Batch-read upvotes for multiple items
function BatchScores() {
  const { upvoteCounts, isLoading } = useUpvotesBatch({
    chainId: 8453,
    items: [
      { type: "token", tokenAddress: "0x..." },
      { type: "storage", operatorAddress: "0x...", storageKey: "my-key" },
    ],
  });

  return (
    <div>
      {upvoteCounts.map((count, i) => (
        <div key={i}>Item {i}: {count} upvotes</div>
      ))}
    </div>
  );
}
```

### ScoreClient (Non-React)

```typescript
import { ScoreClient } from "@net-protocol/score";
import { getTokenScoreKey, getStorageScoreKey } from "@net-protocol/score";

const client = new ScoreClient({ chainId: 8453 });

// Get upvote counts for token score keys
const tokenKey = getTokenScoreKey("0x...");
const counts = await client.getUpvotesWithLegacy({
  scoreKeys: [tokenKey],
});
console.log("Upvotes:", counts[0]);

// Batch upvotes for mixed item types
const batchCounts = await client.getUpvotesForItems({
  items: [
    { type: "token", tokenAddress: "0x..." },
    { type: "storage", operatorAddress: "0x...", storageKey: "my-key" },
  ],
});

// Query scores from a specific strategy
import { PURE_ALPHA_STRATEGY } from "@net-protocol/score";

const strategyCounts = await client.getStrategyKeyScores({
  strategy: PURE_ALPHA_STRATEGY.address,
  scoreKeys: [tokenKey],
});

// Query scores from a specific app
const appCounts = await client.getAppKeyScores({
  app: "0x...",
  scoreKeys: [tokenKey],
});
```

## API Reference

### ScoreClient

| Method | Description |
|--------|-------------|
| `getUpvotesWithLegacy(opts)` | Get upvote counts for score keys, aggregated across legacy contracts and strategies |
| `getUpvotesForItems(opts)` | Get upvote counts for an array of `ScoreItem` objects |
| `getStrategyKeyScores(opts)` | Get scores for keys from a specific strategy |
| `getAppKeyScores(opts)` | Get scores for keys from a specific app |

### React Hooks

| Hook | Description |
|------|-------------|
| `useTokenUpvotes(opts)` | Get upvote count for a single token address |
| `useUpvotes(opts)` | Get upvote count for a single score key |
| `useUpvotesBatch(opts)` | Get upvote counts for multiple items in one call |

### Score Key Utilities

| Function | Description |
|----------|-------------|
| `getTokenScoreKey(tokenAddress)` | Generate score key for a token |
| `getStorageScoreKey(operatorAddress, storageKey)` | Generate score key for a storage entry |
| `getFeedContentKey(message)` | Generate content key for a feed post |
| `getScoreKey(item)` | Generate score key for any `ScoreItem` |
| `isTokenScoreKey(scoreKey)` | Check if a score key represents a token |
| `extractTokenAddressFromScoreKey(scoreKey)` | Extract token address from a token score key |
| `getStorageUpvoteContext(operatorAddress, storageKey)` | Generate upvote stored context for storage upvotes |

### Strategy Utilities

| Function | Description |
|----------|-------------|
| `selectStrategy(poolKey?)` | Select appropriate strategy based on pool key |
| `decodeStrategyMetadata(metadata, strategyAddress)` | Decode strategy-specific metadata |
| `decodeUpvoteStorageBlob(value)` | Decode a full Score storage blob |
| `decodeUpvoteMessage(msg)` | Decode an upvote message (legacy and strategy formats) |
| `encodePoolKey(poolKey?)` | Encode a PoolKey struct to bytes |

### Types

```typescript
// Scoreable item (discriminated union)
type ScoreItem =
  | { type: "token"; tokenAddress: string }
  | { type: "storage"; operatorAddress: string; storageKey: string }
  | { type: "feed"; message: FeedMessage };

type FeedMessage = {
  app: Address;
  sender: Address;
  timestamp: bigint;
  data: `0x${string}`;
  text: string;
  topic: string;
};

// Client options
type ScoreClientOptions = {
  chainId: number;
  overrides?: {
    scoreAddress?: Address;
    upvoteAppAddress?: Address;
    rpcUrls?: string[];
  };
};
```

### Strategies

The Score system supports multiple voting strategies that determine vote weight:

| Strategy | Constant | Description |
|----------|----------|-------------|
| Pure Alpha | `PURE_ALPHA_STRATEGY` | Vote weight based on Alpha token holdings |
| Uni V2/V3/V4 Pools | `UNIV234_POOLS_STRATEGY` | Vote weight based on Uniswap pool positions |
| Dynamic Split | `DYNAMIC_SPLIT_STRATEGY` | Configurable token/alpha split for pool positions |

### Constants

| Constant | Description |
|----------|-------------|
| `SCORE_CONTRACT` | Score core contract address and ABI |
| `UPVOTE_APP` | UpvoteApp contract address and ABI |
| `UPVOTE_STORAGE_APP` | UpvoteStorageApp contract address and ABI |
| `ALL_STRATEGY_ADDRESSES` | Array of all strategy contract addresses |
| `SUPPORTED_SCORE_CHAINS` | Chains where Score is deployed |

## Supported Chains

| Chain | Chain ID | Status |
|-------|----------|--------|
| Base | 8453 | Supported |

## License

MIT
