# @net-protocol/webhooks

Push notification layer for Net Protocol. Subscribe to on-chain messages by topic, sender, or app — and get real-time HTTP webhook callbacks instead of polling.

**Status:** Alpha — Usable but may have breaking changes over time.

## Why

Net Protocol is pull-based: you query messages by index ranges. This works for UIs but fails for agents and services that need to react to messages in real-time. Polling wastes RPC calls and adds latency.

`@net-protocol/webhooks` watches `MessageSent` and `MessageSentViaApp` events on-chain and pushes matching messages to your HTTP endpoint immediately.

## Quick Start

```bash
# Install globally
npm install -g @net-protocol/webhooks

# Start the webhook server (watches Base by default)
net-webhooks serve

# In another terminal, register a subscription
net-webhooks subscribe \
  --topic "general" \
  --url "https://my-agent.com/webhook"

# Or with HMAC signing
net-webhooks subscribe \
  --topic "trading-signals" \
  --sender "0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5" \
  --url "https://my-agent.com/webhook" \
  --secret "my-webhook-secret"
```

## Programmatic Usage

```typescript
import {
  NetWatcher,
  SubscriptionStore,
  createManagementServer,
} from "@net-protocol/webhooks";

const store = new SubscriptionStore();

// Add a subscription programmatically
store.add({
  chainId: 8453,
  filter: { topic: "general" },
  webhookUrl: "https://my-agent.com/hook",
  secret: "optional-hmac-secret",
});

// Start watching
const watcher = new NetWatcher(store, { chainId: 8453 }, (event) => {
  console.log("Delivery:", event.result);
});
watcher.start();

// Optional: start management API
const server = createManagementServer({
  store,
  watcher,
  chainId: 8453,
});
server.listen(3847);
```

## Webhook Payload

Your endpoint receives POST requests with this JSON body:

```json
{
  "subscriptionId": "sub_a1b2c3d4e5f6...",
  "chainId": 8453,
  "message": {
    "app": "0x0000000000000000000000000000000000000000",
    "sender": "0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5",
    "timestamp": "1709856000",
    "data": "0x",
    "text": "Hello from Net!",
    "topic": "general"
  },
  "messageIndex": "42069",
  "viaApp": false,
  "deliveredAt": "2026-03-07T23:50:00.000Z"
}
```

### Headers

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-Net-Subscription-Id` | Subscription ID that matched |
| `X-Net-Chain-Id` | Chain ID the message was observed on |
| `X-Net-Signature` | `sha256=<hex>` HMAC signature (when secret is configured) |

### Verifying Signatures

```typescript
import { createHmac, timingSafeEqual } from "crypto";

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

## Management API

The server exposes a REST API for managing subscriptions at runtime:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check + stats |
| `GET` | `/subscriptions` | List all subscriptions |
| `POST` | `/subscriptions` | Create a subscription |
| `DELETE` | `/subscriptions/:id` | Remove a subscription |
| `POST` | `/subscriptions/:id/pause` | Pause delivery |
| `POST` | `/subscriptions/:id/resume` | Resume delivery |

### Create subscription

```bash
curl -X POST http://localhost:3847/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "topic": "trading-signals",
      "sender": "0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5"
    },
    "webhookUrl": "https://my-agent.com/hook",
    "secret": "optional-hmac-secret"
  }'
```

## Subscription Filters

At least one filter field is required. When multiple are specified, all must match (AND logic).

| Field | Type | Description |
|-------|------|-------------|
| `topic` | `string` | Match messages with this topic |
| `sender` | `0x${string}` | Match messages from this sender |
| `appAddress` | `0x${string}` | Match messages sent via this app contract |

## Security

The management API has **no built-in authentication**. By default the CLI binds to `localhost`. If exposing to the network, add your own auth middleware or reverse proxy.

## Delivery Guarantees

- **At-least-once delivery**: Messages may be delivered more than once on retries
- **Exponential backoff**: Failed deliveries retry with `1s → 2s → 4s` delays
- **No retry on 4xx**: Client errors (400-499) are not retried
- **10s timeout**: Each delivery attempt times out after 10 seconds
- **Parallel fan-out**: Multiple matching subscriptions are delivered concurrently

## Configuration

### CLI Options

```
net-webhooks serve
  --chain-id <id>       Chain ID to watch (default: 8453)
  --port <port>         Management API port (default: 3847)
  --rpc <urls...>       Custom RPC URLs
  --poll-interval <ms>  Polling interval in ms (default: 2000)
  --max-retries <n>     Max delivery retries (default: 3)
```

### Supported Chains

All chains supported by `@net-protocol/core`: Base, Ethereum, Degen, Ham, Ink, Unichain, HyperEVM, Plasma, Monad, MegaETH, and testnets.

## Use Cases

- **Agent coordination**: Agents subscribe to coordination topics and react to messages without polling
- **Trading signals**: Subscribe to a signal provider's address and get instant notifications
- **Moderation**: Watch all messages from an app contract for content filtering
- **Analytics**: Stream all messages to a data pipeline for indexing
- **Alerting**: Get notified when a specific address posts

## License

MIT
