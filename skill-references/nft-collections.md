# Net-Integrated NFT Collections Reference

Deploy generative, fully on-chain NFT collections that **auto-post their mints and transfers to Net Protocol**. The collection contract *is* a Net app, so its entire activity history is queryable — permanently, by anyone — under the collection's own address.

This reference is written for an agent (Banker or otherwise) that wants to generate, deploy, and then read back a collection. It gives you:

1. A drop-in **base contract** (`NetIntegratedERC721A`) that wires ERC721A to Net.
2. The **generative-art slot** you fill in per collection (AI-written).
3. The **message conventions** that make the activity queryable.
4. **Read recipes** (CLI + Solidity) for pulling a live collection's mints/transfers back out of Net.

## Mental model

- The collection is an **ERC721A** contract (gas-cheap batch mints).
- On every mint and transfer, the contract calls Net's `sendMessageViaApp(...)`. Because the collection is the *caller*, Net records the resulting message with **`app` = the collection address**.
- You (or Banker) write the **generative art** — the `art(tokenId)` / `tokenURI` logic — fresh for each collection. Everything below the art is standardized so the Net wiring, supply accounting, and per-wallet limits are always correct.

```
                       mint() / transferFrom() / mintToCreator()
 wallet ──────────────────────────────────────────────▶ Collection (ERC721A)
                                                              │
                                          _afterTokenTransfers │ (once per batch)
                                                              ▼
                              NET.sendMessageViaApp(sender, text, topic, "")
                                                              │
                                                              ▼
                        Net Protocol  →  message indexed under app = Collection
```

## Net contract

Same address on every supported chain:

| Contract | Address |
|----------|---------|
| Net | `0x00000000B24D62781dB359b07880a105cD0b64e6` |

The only function the collection needs:

```solidity
interface INet {
    function sendMessageViaApp(
        address sender,
        string calldata text,
        string calldata topic,
        bytes calldata data
    ) external;
}
```

`app` is **not** a parameter — Net derives it from `msg.sender` (the collection). `sender` is whatever address you pass; the conventions below define what to put there.

## Message conventions

These make a collection's activity cleanly filterable. Keep them consistent across collections so agents can query any Net NFT collection the same way.

| Field | Mint | Transfer |
|-------|------|----------|
| `app` (automatic) | collection address | collection address |
| `topic` | `"mint"` | `"transfer"` |
| `sender` | the recipient (`to`) | the previous owner (`from`) |
| `text` | `Minted #<start>–#<end> to <to>` | `Transferred #<start>–#<end> from <from> to <to>` |
| `data` | empty | empty |

Why these choices:

- **Split topics (`mint` / `transfer`)** let you filter event type directly with `--topic`. The gas difference vs. a single topic is negligible (~tens of gas — see *Gas notes*).
- **`sender = to` on mint / `from` on transfer** means `--sender 0xUser` surfaces *"tokens this user minted"* and *"tokens this user sent"* respectively.
- **Keep `text` short and leave `data` empty.** Text/data length is the one part of the Net write whose gas scales with size. The start–end range plus addresses is enough; anything richer can be reconstructed by an indexer from the token IDs.

## Base contract: `NetIntegratedERC721A`

Extend this and add your art. It handles Net posting, supply cap, per-wallet cap, the creator premint, and per-token seeding.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { ERC721A } from "erc721a/contracts/ERC721A.sol";
import { LibString } from "solady/utils/LibString.sol";

interface INet {
    function sendMessageViaApp(
        address sender,
        string calldata text,
        string calldata topic,
        bytes calldata data
    ) external;
}

/// @title NetIntegratedERC721A
/// @notice ERC721A base that auto-posts mint & transfer activity to Net Protocol.
/// @dev The collection contract IS the Net "app": messages it emits are indexed
///      under this contract's address. Extend this contract and implement the
///      generative art() + tokenURI().
abstract contract NetIntegratedERC721A is ERC721A {
    using LibString for uint256;
    using LibString for address;

    /// @notice Net Protocol contract — same address on all supported chains.
    INet public constant NET = INet(0x00000000B24D62781dB359b07880a105cD0b64e6);

    string internal constant TOPIC_MINT = "mint";
    string internal constant TOPIC_TRANSFER = "transfer";

    /// @notice Mint price per token, in wei.
    uint256 public immutable price;
    /// @notice Hard cap on total supply. 0 = unlimited.
    uint256 public immutable maxSupply;
    /// @notice Max tokens a single wallet may mint via public mint(). 0 = unlimited.
    uint256 public immutable maxMintsPerWallet;

    address internal immutable _deployer;

    /// @notice Per-token entropy for generative art.
    mapping(uint256 => bytes32) internal _tokenToSeed;

    error IncorrectPayment();
    error MaxSupplyReached();
    error MaxMintsPerWalletReached();
    error NotDeployer();

    modifier onlyDeployer() {
        if (msg.sender != _deployer) revert NotDeployer();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 price_,
        uint256 maxSupply_,
        uint256 maxMintsPerWallet_
    ) ERC721A(name_, symbol_) {
        _deployer = msg.sender;
        price = price_;
        maxSupply = maxSupply_;
        maxMintsPerWallet = maxMintsPerWallet_;
    }

    /// @dev Token IDs start at 1.
    function _startTokenId() internal pure virtual override returns (uint256) {
        return 1;
    }

    // ---------------------------------------------------------------- minting

    /// @notice Public paid mint.
    function mint(uint256 amount) external payable {
        if (msg.value != amount * price) revert IncorrectPayment();
        if (
            maxMintsPerWallet != 0 &&
            _numberMinted(msg.sender) + amount > maxMintsPerWallet
        ) revert MaxMintsPerWalletReached();

        _enforceSupply(amount);
        _seed(_nextTokenId(), amount);
        _mint(msg.sender, amount);
    }

    /// @notice Free premint controlled by the deployer. `amount` can be 0..N.
    /// @dev Not payment-gated and not subject to maxMintsPerWallet, but still
    ///      respects maxSupply. Routes through _afterTokenTransfers, so the
    ///      premint is posted to Net like any other mint (fully transparent).
    ///      Preminted tokens consume the lowest IDs, so public mints number
    ///      after them.
    function mintToCreator(uint256 amount, address to) external onlyDeployer {
        _enforceSupply(amount);
        _seed(_nextTokenId(), amount);
        _mint(to, amount);
    }

    function _enforceSupply(uint256 amount) internal view {
        if (maxSupply != 0 && _totalMinted() + amount > maxSupply) {
            revert MaxSupplyReached();
        }
    }

    /// @dev Assign per-token seeds. Override for a different entropy source.
    function _seed(uint256 startTokenId, uint256 amount) internal virtual {
        unchecked {
            for (uint256 i; i < amount; ++i) {
                _tokenToSeed[startTokenId + i] =
                    keccak256(abi.encodePacked(block.prevrandao, startTokenId + i));
            }
        }
    }

    // ------------------------------------------------------------ withdrawals

    /// @notice Withdraw collected ETH to the deployer.
    function withdraw() external {
        (bool ok, ) = _deployer.call{ value: address(this).balance }("");
        require(ok);
    }

    // ------------------------------------------------------- Net integration

    /// @dev Fires once per batch for mint (from == 0), transfer, and burn.
    ///      All transfer paths (transferFrom + both safeTransferFrom) route
    ///      through here — this is why we DON'T override transferFrom directly.
    function _afterTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal virtual override {
        // Nothing meaningful to announce on burn.
        if (to == address(0)) return;

        uint256 endTokenId = startTokenId + quantity - 1;

        address msgSender;
        string memory topic;
        string memory text;
        if (from == address(0)) {
            msgSender = to;
            topic = TOPIC_MINT;
            text = _mintText(to, startTokenId, endTokenId);
        } else {
            msgSender = from;
            topic = TOPIC_TRANSFER;
            text = _transferText(from, to, startTokenId, endTokenId);
        }

        // Best-effort: a Net revert or out-of-gas must NEVER brick a mint/transfer.
        try NET.sendMessageViaApp(msgSender, text, topic, "") {} catch {}
    }

    /// @dev Keep short — text length is the gas-scaling part of the Net write.
    function _mintText(address to, uint256 startId, uint256 endId)
        internal
        view
        virtual
        returns (string memory)
    {
        return string.concat(
            "Minted #", startId.toString(), "-#", endId.toString(),
            " to ", to.toHexString()
        );
    }

    function _transferText(address from, address to, uint256 startId, uint256 endId)
        internal
        view
        virtual
        returns (string memory)
    {
        return string.concat(
            "Transferred #", startId.toString(), "-#", endId.toString(),
            " from ", from.toHexString(), " to ", to.toHexString()
        );
    }
}
```

### Constructor params (the creator-facing knobs)

| Param | Meaning | `0` means |
|-------|---------|-----------|
| `name_` / `symbol_` | ERC-721 name & symbol | — |
| `price_` | wei per token in public `mint()` | free public mint |
| `maxSupply_` | hard supply cap | unlimited |
| `maxMintsPerWallet_` | per-wallet cap on public `mint()` | unlimited |

Creator premint isn't a constructor arg — it's the separate `mintToCreator(amount, to)` call, so the creator can premint whenever (or never) and optionally do it in its own transaction after deploy.

## The generative-art slot (AI-written per collection)

Everything above is fixed. What you generate per collection is the art and metadata: `art(tokenId)` and `tokenURI(tokenId)`, driven by `_tokenToSeed[tokenId]`. Compose SVG on-chain (rects/paths/palette/PRNG), exactly like the reference collection below.

```solidity
contract MyCollection is NetIntegratedERC721A {
    constructor()
        NetIntegratedERC721A(
            "my collection",   // name
            "MYC",             // symbol
            0.01 ether,        // price
            5000,              // maxSupply (0 = unlimited)
            10                 // maxMintsPerWallet (0 = unlimited)
        )
    {}

    function art(uint256 tokenId) public view returns (string memory) {
        bytes32 seed = _tokenToSeed[tokenId];
        // ...AI-generated: derive palette/shapes from `seed`, build an <svg>...
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        // ...AI-generated: base64 data URI wrapping art(tokenId) + traits...
    }
}
```

**Worked example — `OnchainDinos`.** A complete Net-free ERC721A generative collection whose art pattern is exactly what slots into the `art()` above: a fixed pixel map (`colors`/`x`/`y` arrays) colored from a per-token seed via `LibPRNG`, emitted as on-chain `<svg>` rects, wrapped into a `data:` `tokenURI`. To make it Net-integrated, you'd have it extend `NetIntegratedERC721A` instead of raw `ERC721A`, drop its bespoke `_tokenToSeed` array + `mint()` (the base provides both), and keep only its `getColors` / `art` / `tokenURI`. The deployer address `0x2c9605aa2cf6ff2683fc1902799d8411ca91da1e` is the reference deployer for that collection.

### Guidance for generating the art

- **Derive everything from `_tokenToSeed[tokenId]`** so tokens are deterministic and reproducible from chain state. Use a PRNG (e.g. Solady `LibPRNG`) seeded from it.
- **Bound the work.** On-chain SVG is gas-heavy; keep the shape/loop count fixed and modest so `tokenURI` stays callable by marketplaces.
- **Emit a `data:` URI** (`data:application/json;base64,...` wrapping an SVG `image` and optional `animation_url`) so the NFT is fully self-contained — no IPFS/HTTP.
- **Traits** can be computed from the seed and included in the metadata JSON.

## Reading a collection's activity back from Net

Once deployed, everything the collection did is on Net under `app = <collection address>`. No indexer or event log needed.

### CLI (`netp`)

```bash
# All mints for the collection (newest first)
netp message read --app 0xCollection --topic "mint" --chain-id 8453 --json

# All transfers
netp message read --app 0xCollection --topic "transfer" --chain-id 8453 --json

# Everything a specific wallet minted from this collection
netp message read --app 0xCollection --topic "mint" --sender 0xUser --chain-id 8453 --json

# Everything a wallet sent (they are `from`, so `sender` on transfer messages)
netp message read --app 0xCollection --topic "transfer" --sender 0xUser --chain-id 8453 --json

# How many mint messages exist (≈ number of mint batches, not tokens)
netp message count --app 0xCollection --topic "mint" --chain-id 8453 --json

# Total activity (mints + transfers)
netp message count --app 0xCollection --chain-id 8453 --json
```

Note `count` returns the number of **messages** (batches), not tokens — a batch mint of 5 is one `mint` message spanning `#start–#end`. Parse the range out of the text (or the token IDs) if you need per-token counts.

### Solidity (for contracts / indexers)

```solidity
// topic must be hashed to bytes32 for the read side
bytes32 topic = keccak256(bytes("mint"));

uint256 total = INetReader(NET).getTotalMessagesForAppTopicCount(collection, topic);
INet.Message[] memory msgs =
    INetReader(NET).getMessagesInRangeForAppTopic(0, total, collection, topic);
```

Relevant read functions on the Net contract:

```solidity
function getTotalMessagesForAppCount(address app) external view returns (uint256);
function getTotalMessagesForAppTopicCount(address app, bytes32 topic) external view returns (uint256);
function getMessagesInRangeForApp(uint256 startIdx, uint256 endIdx, address app)
    external view returns (Message[] memory);
function getMessagesInRangeForAppTopic(uint256 startIdx, uint256 endIdx, address app, bytes32 topic)
    external view returns (Message[] memory);
```

`Message` = `{ address app; address sender; bytes32 topic; uint48 timestamp; string text; bytes data; }`.

## Agent deploy workflow (e.g. Banker)

1. **Gather config** from the user: name, symbol, price, max supply, per-wallet cap, creator premint amount, and an art description.
2. **Generate the art** — write `art()` + `tokenURI()` on top of `NetIntegratedERC721A`, deriving visuals from `_tokenToSeed`.
3. **Compile & deploy** with your own Solidity toolchain (Foundry/Hardhat). Dependencies: `erc721a`, `solady` (or equivalent string/PRNG libs). Add a remapping for the ERC721A import.
4. **Premint (optional)**: call `mintToCreator(amount, creatorAddress)`.
5. **Announce**: the mint/transfer messages post themselves; you can additionally post a launch note to the collection's feed:
   ```bash
   netp message send --text "Minting now: <name>" --topic "feed-0xCollection" --chain-id 8453
   ```
6. **Monitor**: poll the read recipes above to show live mint/transfer activity.

## Gas notes

- **Split topics cost ~nothing extra.** The `from == address(0)` branch is a few stack ops (~10–20 gas); `"transfer"` vs `"mint"` differs by a handful of calldata/hash bytes (~60 gas). Both are rounding error.
- **The real cost is posting to Net at all** — an external call plus storing the `Message` (several `SSTORE`s), on the order of tens of thousands of gas *per mint and per transfer*. Every transfer of the collection now carries that on top of the ERC721A transfer. Budget for it; it's the point of the integration.
- **`try/catch` is mandatory**, not optional. Without it, any Net-side revert (or a tight gas limit on the transfer) would make the collection's tokens untransferable. Best-effort posting keeps the NFT safe.
- **Keep `text` short, `data` empty.** That's the only size-dependent part of the write.

## Safety checklist

- [ ] Net call is wrapped in `try/catch`.
- [ ] `maxSupply` enforced in *both* `mint()` and `mintToCreator()`.
- [ ] `maxMintsPerWallet` checked via `_numberMinted(msg.sender)` (0 = unlimited).
- [ ] Preminted tokens are seeded (so their art renders).
- [ ] `tokenURI` reverts for nonexistent tokens.
- [ ] `mintToCreator` is `onlyDeployer`.
- [ ] Art work per `tokenURI` is bounded so marketplaces can render it.
