# @net-protocol/transfers

Send an ERC-20 or the chain's native token (ETH on Base) to someone with an attached note, recorded on [Net](https://netprotocol.app), and look transfers up by sender, recipient, sender → recipient, or token.

## How it works

`NetTokenTransfer` (`0x000000DcBE3d8A4db2dD046D500483857dEf83Fb`, Base) moves the tokens straight from the sender to the recipient and writes one Net message in the same transaction:

| Field | Value |
| --- | --- |
| app | NetTokenTransfer |
| sender | the person sending |
| topic | `to-<lowercase recipient>` |
| text | the note (may be empty) |
| data | `abi.encode(address token, address to, uint256 amount)`; token is the zero address for the native token |

Because only the contract can write under its own app address, every message proves a real transfer. Lookups reuse Net's indexes (sent = app + user, received = app + topic, A → B = app + user + topic); the contract also keeps a per-token index.

## Usage

```ts
import { TokenTransferClient, NATIVE_TOKEN_ADDRESS } from "@net-protocol/transfers";

const client = new TokenTransferClient({ chainId: 8453 });

// Newest first, 20 per page: { total, transfers }
await client.getTransfers({ sentBy: alice });
await client.getTransfers({ receivedBy: bob }, { limit: 50, offset: 20 });
await client.getTransfers({ sentBy: alice, receivedBy: bob });
await client.getTransfers({ token: usdc });
await client.getTransferCount({ receivedBy: bob });

// Build the transactions for a send: approvals still needed (if any), then the send
const { approvals, transaction } = await client.prepareSend({
  token: usdc, // or NATIVE_TOKEN_ADDRESS for the native token (no approvals, value set)
  to: bob,
  amount: 5_000_000n, // base units
  message: "thanks for the help",
  sender: alice,
});
```

Each `WriteTransactionConfig` has `to`, `abi`, `functionName`, `args` and optional `value`; pass them to `writeContract`, and include `value` for native-token sends.

### React

```ts
import { useTokenTransfers } from "@net-protocol/transfers/react";

const { transfers, fetchNextPage, hasNextPage } = useTokenTransfers({
  chainId: 8453,
  query: { receivedBy: address },
});
```

Requires `@tanstack/react-query`.

## Limits

- Notes are at most 1,024 bytes.
- Per-token lookups can't be combined with sender/recipient filters; filter a sender or recipient list by `token` instead.
- Fee-on-transfer tokens record the requested amount.
