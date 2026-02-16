# Net Messaging Reference

Send and read messages on decentralized, on-chain feeds using Net Protocol.

## Overview

Net Messaging provides a decentralized messaging system where messages are stored directly on-chain. Messages are organized by topics, allowing for public feeds, personal feeds, and application-specific channels.

## Concepts

### Topics
Messages are organized by topic strings. Topics can be:
- **Public topics**: Any string like `"announcements"`, `"general"`, `"dao-votes"`
- **Personal feeds**: `feed-<address>` format for user-specific feeds
- **App-specific**: Custom topics for your application

### Senders
Every message is signed by a sender address. Messages are immutable once sent.

### Apps
Optional app address for filtering messages by application context.

## Commands

### Send Message

Post a message to a topic:

```bash
netp message send \
  --text <message> \
  [--topic <topic>] \
  [--data <hex>] \
  [--private-key <0x...>] \
  [--chain-id <8453|1|...>] \
  [--encode-only]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--text` | Yes | Message text content |
| `--topic` | No | Topic to post to (default: empty string) |
| `--data` | No | Optional hex data payload |
| `--private-key` | No | Wallet key (prefer env var) |
| `--chain-id` | No | Target chain |
| `--encode-only` | No | Output transaction JSON |

**Examples (Direct Execution):**
```bash
# Simple message
netp message send --text "Hello, Net!" --chain-id 8453

# Message to specific topic
netp message send --text "New proposal!" --topic "governance" --chain-id 8453

# Message with data payload
netp message send --text "Event" --data "0x1234abcd" --topic "events" --chain-id 8453
```

### Encode-Only Mode (For Agents)

**For Bankr agent and other services that submit transactions themselves**, use `--encode-only` to generate transaction data:

```bash
netp message send \
  --text "Hello from the bot!" \
  --topic "announcements" \
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

The agent submits this transaction through its own wallet. No private key needed for the CLI.

### Read Messages

Retrieve messages from the chain:

```bash
netp message read \
  [--app <address>] \
  [--topic <topic>] \
  [--sender <address>] \
  [--limit <n>] \
  [--start <n>] \
  [--end <n>] \
  [--chain-id <8453|1|...>] \
  [--json]
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--app` | No | Filter by app address |
| `--topic` | No | Filter by topic |
| `--sender` | No | Filter by sender address |
| `--limit` | No | Number of messages (default: 10) |
| `--start` | No | Start index for range query |
| `--end` | No | End index for range query |
| `--chain-id` | No | Chain to read from |
| `--json` | No | Output in JSON format |

**Examples:**
```bash
# Read latest 10 messages from a topic
netp message read --topic "announcements" --chain-id 8453

# Read 50 messages
netp message read --topic "general" --limit 50 --chain-id 8453

# Filter by sender
netp message read --sender 0x1234... --chain-id 8453

# Range query (messages 100-110)
netp message read --topic "logs" --start 100 --end 110 --chain-id 8453

# JSON output for parsing
netp message read --topic "data" --chain-id 8453 --json
```

### Count Messages

Get total message count:

```bash
netp message count \
  [--app <address>] \
  [--topic <topic>] \
  [--sender <address>] \
  [--chain-id <8453|1|...>] \
  [--json]
```

**Examples:**
```bash
# Count all messages in a topic
netp message count --topic "announcements" --chain-id 8453

# Count messages from specific sender
netp message count --sender 0x1234... --chain-id 8453

# JSON output
netp message count --topic "events" --chain-id 8453 --json
```

## Personal Feeds

Every address has a personal feed at the topic `feed-<address lowercase>`:

```bash
# Post to your personal feed
netp message send \
  --text "My first post!" \
  --topic "feed-0xabcdef1234567890abcdef1234567890abcdef12" \
  --chain-id 8453

# Read someone's personal feed
netp message read \
  --topic "feed-0xabcdef1234567890abcdef1234567890abcdef12" \
  --chain-id 8453
```

**Note:** Anyone can post to any feed (including others' personal feeds). The topic is just a convention - there's no access control at the protocol level.

## Use Cases

### Social Feed
```bash
# Post update
netp message send --text "Just deployed my first smart contract!" --topic "feed-0x..." --chain-id 8453

# Read feed
netp message read --topic "feed-0x..." --limit 20 --chain-id 8453
```

### DAO Announcements
```bash
# Post announcement (from DAO multisig)
netp message send --text "Proposal #42 passed! Implementation begins next week." --topic "dao-announcements" --chain-id 8453

# Members read announcements
netp message read --topic "dao-announcements" --chain-id 8453
```

### Application Logs
```bash
# Log application events
netp message send --text "User signup: user123" --topic "app-logs" --data "0x$(echo -n '{"event":"signup"}' | xxd -p)" --chain-id 8453

# Query logs
netp message read --topic "app-logs" --limit 100 --chain-id 8453 --json
```

### Event Notifications
```bash
# Broadcast event
netp message send --text "NFT drop in 1 hour!" --topic "nft-drops" --chain-id 8453

# Subscribe to events
netp message read --topic "nft-drops" --chain-id 8453
```

## Message Format

Messages contain:
- **text**: The message content (string)
- **sender**: Address that signed the message
- **timestamp**: Block timestamp when message was included
- **data**: Optional hex data payload
- **index**: Sequential message index

JSON output format:
```json
{
  "messages": [
    {
      "text": "Hello, Net!",
      "sender": "0x1234...",
      "timestamp": 1704067200,
      "data": "0x",
      "index": 42
    }
  ],
  "count": 1
}
```

## Pagination

For large feeds, use pagination:

```bash
# Get total count
COUNT=$(netp message count --topic "big-feed" --chain-id 8453 --json | jq '.count')

# Read in batches
netp message read --topic "big-feed" --start 0 --end 99 --chain-id 8453
netp message read --topic "big-feed" --start 100 --end 199 --chain-id 8453
```

## Cost Considerations

- Messages are stored on-chain, costing gas
- Longer messages = more gas
- L2 chains (Base) are significantly cheaper
- Reading is free (view function)

## Best Practices

1. **Use descriptive topics**: Make topics meaningful and consistent
2. **Personal feed convention**: Use `feed-<address>` for personal feeds
3. **Keep messages concise**: Shorter = cheaper
4. **Use data field**: For structured data, encode as hex in data field
5. **Paginate reads**: Use limit/start/end for large feeds
6. **JSON for parsing**: Use `--json` flag when processing output programmatically

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "No messages found" | Empty topic or wrong filters | Check topic name and filters |
| "Invalid sender" | Malformed address | Use valid 0x-prefixed address |
| "Transaction failed" | Network issue or low gas | Retry or add more gas |
| "Index out of range" | Start/end beyond message count | Check count first |
