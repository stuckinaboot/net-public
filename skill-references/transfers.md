# Net Token Transfers Reference

Send an ERC-20 or native ETH to any address with an optional message. The tokens move straight from you to the recipient, and the message is recorded on Net in the same transaction, so it shows on the recipient's Net profile and anyone can look it up later.

Contract: `NetTokenTransfer` at `0x000000DcBE3d8A4db2dD046D500483857dEf83Fb` on Base (8453). No fee.

## Send

```bash
netp token send \
  --token <address|ETH> \
  --to <address> \
  --amount <amount> \
  [--message <text>] \
  [--private-key <0x...>] \
  [--sender <address>] \
  [--chain-id 8453] \
  [--rpc-url <url>] \
  [--encode-only]
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--token` | Yes | ERC-20 address, or `ETH` for native ETH |
| `--to` | Yes | Recipient address (0x only; resolve names first) |
| `--amount` | Yes | Amount in token units: `5` = 5 USDC, `0.001` = 0.001 ETH. The CLI reads decimals on-chain; do not pre-scale |
| `--message` | No | Note to attach, max 1,024 bytes |
| `--sender` | With `--encode-only` | Your address; the CLI uses it to check your token allowance |
| `--private-key` | No | Wallet key (prefer `NET_PRIVATE_KEY`) |
| `--encode-only` | No | Print transactions as JSON instead of sending |

With a private key the CLI sends any approval, waits for it, then sends the transfer and prints the transaction hash.

### Encode-only (Bankr and other external signers)

```bash
netp token send --token 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --to 0xRecipient --amount 5 --message "thanks!" \
  --sender 0xYourAddress --chain-id 8453 --encode-only
```

```json
{
  "approvals": [{"to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "data": "0x095ea7b3...", "chainId": 8453, "value": "0"}],
  "transaction": {"to": "0x000000DcBE3d8A4db2dD046D500483857dEf83Fb", "data": "0x...", "chainId": 8453, "value": "0"}
}
```

1. Submit each entry in `approvals` in order and wait for it to confirm. The array is exhaustive: if it is empty, your allowance already covers the amount.
2. Submit `transaction`.

For ETH (`--token ETH`), `approvals` is empty and `transaction.value` is the amount in wei. You **must** include it:
`@bankr submit transaction to <to> with data <data> and value <value> on chain 8453`

## Look up transfers

```bash
netp token transfers --sent-by 0xA --chain-id 8453 --json        # sent by A
netp token transfers --received-by 0xB --chain-id 8453 --json    # received by B
netp token transfers --from 0xA --to 0xB --chain-id 8453 --json  # from A to B
netp token transfers --token 0xToken --chain-id 8453 --json      # every transfer of a token (ETH: --token ETH)
```

Options: `--limit <n>` (default 20), `--offset <n>` to page back. Results are newest first. `--token` can't be combined with the address filters; filter those results by `token` instead.

```json
{
  "total": 12,
  "offset": 0,
  "transfers": [
    {
      "from": "0xA...",
      "to": "0xB...",
      "token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "symbol": "USDC",
      "amount": "5",
      "amountRaw": "5000000",
      "message": "thanks!",
      "timestamp": 1764000000,
      "fromProfileUrl": "https://netprotocol.app/app/profile/base/0xa...",
      "toProfileUrl": "https://netprotocol.app/app/profile/base/0xb...",
      "tokenUrl": "https://netprotocol.app/app/token/base/0x8335..."
    }
  ]
}
```

`token` is `"ETH"` for native sends. `amount` and `symbol` are `null` if the token's metadata can't be read; `amountRaw` is always set.

## Safety

- Anyone can send any token with any message, including worthless tokens with misleading notes. Check `symbol`, `token` and `tokenUrl` before trusting a received transfer.
- A send to a contract that rejects ETH reverts; nothing is sent or recorded.

## How it works (for developers)

Each send writes one Net message under the NetTokenTransfer app: sender = the person sending, topic = `to-<lowercase recipient>`, text = the note, data = `abi.encode(token, to, amount)` (token is the zero address for ETH). Only the contract can write under its app address, so every message is a real transfer. SDK: [`@net-protocol/transfers`](https://github.com/stuckinaboot/net-public/tree/main/packages/net-transfers).
