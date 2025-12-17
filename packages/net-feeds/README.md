# @net-protocol/feeds

**Status: In Development** - Do not use yet. Will have breaking changes and may be incomplete.

Feed SDK for building topic-based message streams on Net Protocol.

## What are Feeds?

Feeds are topic-based message streams built on Net Protocol. They use a simple convention:

- Messages are posted with `appAddress: NULL_ADDRESS` (global, not app-specific)
- Topics are prefixed with `feed-` (e.g., `feed-crypto`, `feed-announcements`)
- Anyone can read or post to any feed

This creates a **decentralized social media** system where:

- **Topics are feeds**: Each topic becomes a feed (like a subreddit or Twitter hashtag)
- **Permissionless**: Anyone can read or post
- **Permanent**: All posts are stored permanently on the blockchain
- **Transparent**: All posts are publicly verifiable

## What can you do with this package?

- **Read feeds**: Query posts from any topic-based feed
- **Post to feeds**: Create posts in feeds (social media style)
- **Build social apps**: Create decentralized social applications
- **Community forums**: Build discussion forums and community spaces
- **Announcements**: Create announcement feeds for projects or communities

Perfect for building decentralized alternatives to Twitter, Reddit, or Discord channels.

## Learn More

- [Net Protocol Documentation](https://docs.netprotocol.app) - Complete protocol documentation
- [How Net Works](https://docs.netprotocol.app/docs/02%20Core%20Protocol/how-net-works) - Understanding the underlying messaging system

## Installation

```bash
npm install @net-protocol/feeds @net-protocol/core wagmi viem react
```

## Usage

### React Hook: `useFeedPosts`

Read posts from a feed topic using a React hook:

```tsx
import { useFeedPosts } from "@net-protocol/feeds";

function FeedComponent() {
  const { posts, totalCount, isLoading } = useFeedPosts({
    chainId: 8453,
    topic: "crypto", // Auto-prefixed to "feed-crypto"
    maxMessages: 50,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Feed ({totalCount} posts)</h2>
      {posts.map((post) => (
        <div key={`${post.sender}-${post.timestamp}`}>
          <p>{post.text}</p>
          <small>From: {post.sender}</small>
        </div>
      ))}
    </div>
  );
}
```

### Client Class: `FeedClient`

For non-React usage, use the `FeedClient` class:

```ts
import { FeedClient } from "@net-protocol/feeds";

const client = new FeedClient({ chainId: 8453 });

// Get feed posts
const posts = await client.getFeedPosts({
  topic: "crypto",
  maxPosts: 50,
});

// Get post count
const count = await client.getFeedPostCount("crypto");

// Prepare a post (does not submit - you submit using your wallet)
const config = client.preparePostToFeed({
  topic: "crypto",
  text: "Hello world!",
  data: "netid-abc123", // Optional - can be storage key, JSON, or any string
});

// Then submit using your wallet library (wagmi, viem, etc.)
```

## API Reference

### `useFeedPosts(options)`

React hook for fetching feed posts.

**Parameters:**

- `chainId` (number, required) - Chain ID to query
- `topic` (string, required) - Topic name (auto-prefixed with "feed-" if not already present)
- `maxMessages` (number, optional) - Maximum number of messages to fetch (default: 50)
- `enabled` (boolean, optional) - Whether the query is enabled (default: true)

**Returns:**

- `posts` (NetMessage[]) - Array of feed posts
- `totalCount` (number) - Total number of posts in the feed
- `isLoading` (boolean) - Loading state

**Note:** This hook does NOT return an `error` field (for compatibility with `useTopicFeed`).

### `FeedClient`

Client class for non-React feed interactions.

#### Constructor

```ts
new FeedClient({ chainId: number, overrides?: { rpcUrls: string[] } })
```

#### Methods

**`getFeedPosts(params)`**

- Gets feed posts for a topic
- Parameters: `{ topic: string, maxPosts?: number }`
- Returns: `Promise<NetMessage[]>`

**`getFeedPostCount(topic)`**

- Gets the total count of posts in a feed
- Parameters: `topic: string`
- Returns: `Promise<number>`

**`preparePostToFeed(params)`**

- Prepares a transaction configuration for posting to a feed (does not submit)
- Parameters: `{ topic: string, text: string, data?: string }`
- Returns: `WriteTransactionConfig`
- Note: `data` accepts any string (storage keys, JSON, arbitrary bytes) which will be converted to hex

## Topic Normalization

Topics are automatically normalized with the following rules:

- **Case-insensitive**: "CRYPTO" → "feed-crypto", "FEED-crypto" → "feed-crypto"
- **Auto-prefix**: Topics without "feed-" prefix are automatically prefixed
- **Idempotent**: Safe to call with already-prefixed topics
- **Whitespace trimmed**: Leading/trailing whitespace is removed

Examples:

- `normalizeFeedTopic("crypto")` → `"feed-crypto"`
- `normalizeFeedTopic("CRYPTO")` → `"feed-crypto"`
- `normalizeFeedTopic("feed-crypto")` → `"feed-crypto"` (idempotent)
- `normalizeFeedTopic("FEED-crypto")` → `"feed-crypto"` (not "feed-feed-crypto")

## Error Handling

- **`useFeedPosts`**: Does not return an `error` field (for compatibility with `useTopicFeed`)
- **`FeedClient`**: Methods propagate errors (consistent with `NetClient` pattern)
- **Edge cases**: Handled gracefully (empty topics, zero counts, negative maxMessages)

## Dependencies

- **Required**: `@net-protocol/core` - For NetClient, useNetMessages, useNetMessageCount
- **Required**: `viem` - For stringToHex
- **Peer dependencies**: `react`, `wagmi` - For React hooks

## Utilities

### `normalizeFeedTopic(topic: string): string`

Normalizes a feed topic by ensuring it has the "feed-" prefix. Case-insensitive and idempotent.

### `isFeedTopic(topic: string): boolean`

Checks if a topic is a feed topic (starts with "feed-" prefix, case-insensitive).

### `FEED_TOPIC_PREFIX`

Constant: `"feed-"`

## Constants

If you need `NULL_ADDRESS` for other purposes, import it from `@net-protocol/core`:

```ts
import { NULL_ADDRESS } from "@net-protocol/core";
```

## Examples

### Reading a Feed

```tsx
import { useFeedPosts } from "@net-protocol/feeds";

function CryptoFeed() {
  const { posts, totalCount, isLoading } = useFeedPosts({
    chainId: 8453,
    topic: "crypto",
    maxMessages: 20,
  });

  return (
    <div>
      <h1>Crypto Feed ({totalCount} posts)</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        posts.map((post) => (
          <div key={`${post.sender}-${post.timestamp}`}>
            <p>{post.text}</p>
          </div>
        ))
      )}
    </div>
  );
}
```

### Posting to a Feed

```tsx
import { FeedClient } from "@net-protocol/feeds";
import { useWriteContract } from "wagmi";

function PostButton() {
  const { writeContract } = useWriteContract();
  const client = new FeedClient({ chainId: 8453 });

  const handlePost = () => {
    const config = client.preparePostToFeed({
      topic: "crypto",
      text: "Hello from the feed!",
    });

    writeContract(config);
  };

  return <button onClick={handlePost}>Post to Feed</button>;
}
```

## Migration from `useTopicFeed`

If you're migrating from the Net repo's `useTopicFeed` hook:

**Before:**

```tsx
import { useTopicFeed } from "@/components/hooks/net/useTopicFeed";
const { posts, totalCount, isLoading } = useTopicFeed({
  chainId,
  topic: `feed-${userAddress}`,
  maxMessages: 50,
});
```

**After:**

```tsx
import { useFeedPosts } from "@net-protocol/feeds";
const { posts, totalCount, isLoading } = useFeedPosts({
  chainId,
  topic: `feed-${userAddress}`, // Works with or without prefix
  maxMessages: 50, // Same parameter name
});
```

The API is fully compatible - same parameter names, same return shape, same defaults.
