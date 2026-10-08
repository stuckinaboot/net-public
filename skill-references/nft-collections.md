# Net-Integrated NFT Collections Reference

Deploy generative, fully on-chain NFT collections that **auto-post their mints and transfers to Net Protocol**. The collection contract *is* a Net app, so its entire activity history is queryable — permanently, by anyone — under the collection's own address.

This reference is written for you, or an AI like Bankr, that wants to generate, deploy, and then read back a collection. It gives you:

1. A drop-in **base contract** (`NetIntegratedERC721A`) that wires ERC721A to Net.
2. The **generative-art slot** you fill in per collection (AI-written).
3. The **message conventions** that make the activity queryable.
4. **Read recipes** (CLI + Solidity) for pulling a live collection's mints/transfers back out of Net.

## Mental model

- The collection is an **ERC721A** contract (gas-cheap batch mints).
- On every mint, transfer, and burn, the contract calls Net's `sendMessageViaApp(...)`. Because the collection is the *caller*, Net records the resulting message with **`app` = the collection address**.
- You (or an AI like Bankr) write the **generative art** — the `art(tokenId)` / `tokenURI` logic — fresh for each collection. Everything below the art is standardized so the Net wiring, supply accounting, and per-wallet limits are always correct.

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

| Field | Mint | Transfer | Burn |
|-------|------|----------|------|
| detected by | `from == address(0)` | neither is zero | `to == address(0)` |
| `app` (automatic) | collection address | collection address | collection address |
| `topic` | `"mint"` | `"transfer"` | `"burn"` |
| `sender` | the recipient (`to`) | the previous owner (`from`) | the burner (`from`) |
| `text` | `Minted #<start>–#<end> to <to>` | `Transferred #<start>–#<end> from <from> to <to>` | `Burned #<start>–#<end> by <from>` |
| `data` | empty | empty | empty |

Why these choices:

- **Split topics (`mint` / `transfer` / `burn`)** let you filter event type directly with `--topic`. The gas difference vs. a single topic is negligible (~tens of gas — see *Gas notes*). The hook checks `from == 0` first (mint), then `to == 0` (burn), else transfer — so a burn is its own event, never mislabeled as a transfer to the zero address.
- **`sender = to` on mint / `from` on transfer & burn** means `--sender 0xUser` surfaces *"tokens this user minted"*, *"tokens this user sent"*, and *"tokens this user burned"* respectively.
- **Keep `text` short and leave `data` empty.** Text/data length is the one part of the Net write whose gas scales with size. The start–end range plus addresses is enough; anything richer can be reconstructed by an indexer from the token IDs.

## Base contract: `NetIntegratedERC721A`

Extend this and add your art. It handles Net posting, supply cap, per-wallet cap, the capped creator premint, and per-token seeding.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

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
    string internal constant TOPIC_BURN = "burn";

    /// @notice Mint price per token, in wei.
    uint256 public immutable price;
    /// @notice Hard cap on total supply. 0 = unlimited.
    uint256 public immutable maxSupply;
    /// @notice Max tokens a single wallet may mint via public mint(). 0 = unlimited.
    uint256 public immutable maxMintsPerWallet;
    /// @notice Max tokens the deployer may ever mint via mintToCreator(). 0 = none.
    uint256 public immutable creatorReserve;
    /// @notice Tokens minted so far via mintToCreator().
    uint256 public creatorMinted;

    address internal immutable _deployer;

    /// @notice Per-token entropy for generative art.
    mapping(uint256 => bytes32) internal _tokenToSeed;

    error IncorrectPayment();
    error MaxSupplyReached();
    error MaxMintsPerWalletReached();
    error CreatorReserveExceeded();
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
        uint256 maxMintsPerWallet_,
        uint256 creatorReserve_
    ) ERC721A(name_, symbol_) {
        _deployer = msg.sender;
        price = price_;
        maxSupply = maxSupply_;
        maxMintsPerWallet = maxMintsPerWallet_;
        creatorReserve = creatorReserve_;
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

        _mintSeeded(msg.sender, amount);
    }

    /// @notice Free premint controlled by the deployer, capped at creatorReserve
    ///         over the contract's lifetime (across all calls).
    /// @dev Not payment-gated and not subject to maxMintsPerWallet, but still
    ///      respects maxSupply. The reserve is immutable, so buyers can read
    ///      exactly how many free tokens the deployer can ever mint. Routes
    ///      through _afterTokenTransfers, so the premint is posted to Net like
    ///      any other mint (fully transparent).
    function mintToCreator(uint256 amount, address to) external onlyDeployer {
        if (creatorMinted + amount > creatorReserve) revert CreatorReserveExceeded();
        creatorMinted += amount;
        _mintSeeded(to, amount);
    }

    /// @dev Shared mint mechanic: supply check, seed, mint. Callers gate
    ///      access/payment before calling.
    function _mintSeeded(address to, uint256 amount) private {
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

    /// @dev Fires once per batch for mint (from == 0), transfer, and burn
    ///      (to == 0). All transfer paths (transferFrom + both safeTransferFrom)
    ///      route through here — this is why we DON'T override transferFrom.
    function _afterTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal virtual override {
        uint256 endTokenId = startTokenId + quantity - 1;

        address msgSender;
        string memory topic;
        string memory text;
        if (from == address(0)) {
            msgSender = to;
            topic = TOPIC_MINT;
            text = _mintText(to, startTokenId, endTokenId);
        } else if (to == address(0)) {
            msgSender = from;
            topic = TOPIC_BURN;
            text = _burnText(from, startTokenId, endTokenId);
        } else {
            msgSender = from;
            topic = TOPIC_TRANSFER;
            text = _transferText(from, to, startTokenId, endTokenId);
        }

        // Best-effort: a Net revert or out-of-gas must NEVER brick a mint/transfer/burn.
        // The code-length guard is required: Solidity checks that NET has code
        // BEFORE entering the try, and that failure is not caught. Without the
        // guard, every mint/transfer/burn reverts on a chain where Net isn't deployed.
        if (address(NET).code.length != 0) {
            try NET.sendMessageViaApp(msgSender, text, topic, "") {} catch {}
        }
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

    function _burnText(address from, uint256 startId, uint256 endId)
        internal
        view
        virtual
        returns (string memory)
    {
        return string.concat(
            "Burned #", startId.toString(), "-#", endId.toString(),
            " by ", from.toHexString()
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
| `creatorReserve_` | lifetime cap on free `mintToCreator()` tokens | no creator mints |

The premint itself is the separate `mintToCreator(amount, to)` call, so the creator can premint whenever (or never), across as many calls as they like, until `creatorMinted` reaches `creatorReserve`. The reserve is a **cap, not a guarantee**: public mints can still sell out the supply first, so premint right after deploy if the creator must get their tokens.

Why a cap at all: without one, the deployer could mint the entire remaining supply for free at any time, even mid-sale, and buyers couldn't rule it out from the contract. Set it to what the creator actually intends to keep. Pass `type(uint256).max` only if you deliberately want unlimited creator mints (still bounded by `maxSupply`); that choice is then visible onchain.

### Inherited from ERC721A — do not redefine

The base relies on these members that ERC721A already provides: `_mint`, `_numberMinted`, `_totalMinted`, `_nextTokenId`, `_startTokenId`, `_exists`, `_afterTokenTransfers`, and the `URIQueryForNonexistentToken` error. Your collection uses them directly; it does not declare them.

## Project setup (build & compile)

The base and your collection are **plain Solidity** compiled against two well-known libraries — no vendored `SVG.sol`/`Utils.sol`. **Any EVM toolchain works** (Foundry, Hardhat, Remix, thirdweb, or the `solc` compiler directly); the produced bytecode is identical. The only hard requirements are: solc ≥ 0.8.18 (`block.prevrandao`; pin **0.8.24**), the two deps (`erc721a`, `solady`) resolvable, and solady's `src/` layout handled in import resolution.

Foundry is the worked path below; a **Foundry-free `solc` recipe** and other options follow it.

### Foundry

Scaffold a project from scratch:

```bash
forge init my-collection && cd my-collection
forge install chiru-labs/ERC721A@v4.3.0   # ERC721A v4 (has all the members above)
forge install vectorized/solady             # LibString, LibPRNG, Base64
```

`remappings.txt` (this is what makes the imports resolve):

```
erc721a/=lib/ERC721A/
solady/=lib/solady/src/
```

`foundry.toml`:

```toml
[profile.default]
src = "src"
libs = ["lib"]
solc = "0.8.24"
optimizer = true
optimizer_runs = 200
```

Put `NetIntegratedERC721A.sol` and your `MyCollection.sol` in `src/`, then `forge build`.

### Compiling without Foundry — `solc` directly

If `forge` isn't available (not installed, restricted network, a CI image without it), compile with **standalone `solc`**. It's the *same* compiler Foundry and Hardhat call, published as a pure-JS npm package — so it needs only Node + the npm registry, no GitHub and no Foundry. This is exactly how the example in this reference was verified.

```bash
mkdir mycol && cd mycol && npm init -y
npm i solc@0.8.24 erc721a@4.3.0 solady
# drop NetIntegratedERC721A.sol + MyCollection.sol in this dir
```

A tiny `compile.js` feeds solc Standard-JSON and resolves imports from `node_modules` (the callback emulates the remappings — note the solady `src/`, the one gotcha):

```js
// compile.js
const fs = require("fs"), path = require("path"), solc = require("solc");
const NM = path.join(__dirname, "node_modules");
function resolve(p) {
  if (p.startsWith("solady/")) return fs.readFileSync(path.join(NM, "solady/src", p.slice(7)), "utf8");
  if (p.startsWith("erc721a/")) return fs.readFileSync(path.join(NM, p), "utf8");
  return fs.readFileSync(path.join(__dirname, p), "utf8"); // ./relative
}
const input = {
  language: "Solidity",
  sources: {
    "NetIntegratedERC721A.sol": { content: fs.readFileSync("NetIntegratedERC721A.sol", "utf8") },
    "MyCollection.sol": { content: fs.readFileSync("MyCollection.sol", "utf8") },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["evm.bytecode.object", "abi"] } },
  },
};
const out = JSON.parse(solc.compile(JSON.stringify(input), { import: (p) => ({ contents: resolve(p) }) }));
for (const e of out.errors || []) if (e.severity === "error") console.log(e.formattedMessage);
const c = out.contracts["MyCollection.sol"].MyCollection;
console.log(c.evm.bytecode.object ? `OK — ${c.evm.bytecode.object.length / 2} bytes` : "FAILED");
// deploy c.evm.bytecode.object + c.abi with viem/ethers, or submit the deploy tx via Bankr /wallet/submit
```

```bash
node compile.js   # -> OK — ~9.9K bytes
```

### Other toolchains

- **Hardhat** — `npm i erc721a solady`. `erc721a/contracts/...` resolves via `node_modules` as-is, but **solady publishes under `src/`**, so its imports are `solady/src/utils/LibString.sol`, not `solady/utils/...`. Either use the `src/` paths or add a remapping `solady/` → `solady/src/` (the Foundry `remappings.txt` above does exactly this, which is why the contract source uses the `solady/utils/...` form).
- **Remix** — paste the two files into [remix.ethereum.org](https://remix.ethereum.org), set the compiler to 0.8.x; it fetches the npm imports automatically. Zero local setup — handy for a one-off deploy via an injected wallet.
- **thirdweb** — `npx thirdweb deploy` compiles and hands you a deploy UI.
- **Ape / Truffle** — standard Solidity; both work with the same two deps.

**Offline fallback:** if the environment has no network at all, vendor the ERC721A + solady sources into the project and adjust imports. Prefer a package install otherwise — it stays on an audited, versioned release.

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
            10,                // maxMintsPerWallet (0 = unlimited)
            50                 // creatorReserve (0 = no creator mints)
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

**Worked example — `OnchainDinos`.** A generative collection whose art pattern is exactly what slots into the `art()` above: a fixed pixel map (`colors`/`x`/`y` arrays) colored from a per-token seed, emitted as on-chain `<svg>` rects and wrapped into a `data:` `tokenURI`. The original (deployer `0x2c9605aa2cf6ff2683fc1902799d8411ca91da1e`) extends raw `ERC721A` with bespoke `SVG.sol`/`Utils.sol` helpers. The complete, compilable **Net-integrated port** — extending `NetIntegratedERC721A` and using only the pinned solady deps — is in [*Full worked example*](#full-worked-example--onchain-dinos-net-integrated) below.

### Guidance for generating the art

- **Derive everything from `_tokenToSeed[tokenId]`** so tokens are deterministic and reproducible from chain state. Seed a PRNG from it — **solady `LibPRNG`** (`solady/utils/LibPRNG.sol`), already installed.
- **Know the seed's limits.** The base seeds from `block.prevrandao`, which is predictable within a block and influenceable by the proposer. Fine for art where nobody profits from a specific outcome; if traits carry real value (rarity-sniping matters), override `_seed` with a commit-reveal scheme or a VRF (e.g. Chainlink) instead of trusting `prevrandao`.
- **Build the SVG with plain `string.concat`** — no SVG library needed. (The dinos contract's `SVG.sol`/`Utils.sol` are just thin `string.concat` wrappers; you can inline them.)
- **Base64-encode with solady `Base64`** (`solady/utils/Base64.sol`) — also already installed.
- **Emit a `data:` URI** (`data:application/json;base64,...` wrapping an SVG `image` and optional `animation_url`) so the NFT is fully self-contained — no IPFS/HTTP.
- **Bound the work.** On-chain SVG is gas-heavy; keep the shape/loop count fixed and modest so `tokenURI` stays callable by marketplaces.
- **Traits must describe the art** — see below.

### Traits that match the art

Marketplaces show the `attributes` array in the metadata as the token's traits, and collectors filter and price by them. They are only meaningful if they describe what the image actually shows, so **never compute traits separately from the art.** Instead:

1. **Make every random choice in one function.** Write an internal `_traits(tokenId)` that seeds a PRNG from `_tokenToSeed[tokenId]`, draws every random value the art uses (palette, shape choices, rarity rolls), and returns them in a `Traits` struct.
2. **Have `art()` and `tokenURI()` both read that struct.** `art()` renders from it; `tokenURI()` turns the same fields into `attributes`. Neither draws from the PRNG itself, so the image and the traits can't drift apart.
3. **Weight rarities on purpose.** A roll like `p.uniform(100) < 5` gives a 5% trait. Decide the odds as part of the design, and mention them in the collection description if they matter.
4. **Use readable values.** Map raw numbers to names a collector would filter by (hue `212` → `"Blue"`, saturation → `"Muted"` / `"Vivid"`). Keep the number of distinct values per trait small; a trait where every token is unique filters nothing.
5. **Only append new draws.** PRNG draws are consumed in order, so adding a draw in the middle of `_traits` changes every later value, and with it the art and traits of tokens that already exist. Add new draws at the end.

```solidity
struct Traits {
    uint256 hue;
    bool rare;
}

function _traits(uint256 tokenId) internal view returns (Traits memory t) {
    LibPRNG.PRNG memory p;
    p.seed(uint256(_tokenToSeed[tokenId]));
    t.hue = p.uniform(360);
    t.rare = p.uniform(100) < 5; // 5% of tokens
}

// art():      Traits memory t = _traits(tokenId);  ...render from t...
// tokenURI(): Traits memory t = _traits(tokenId);  ...attributes from t...
```

The worked example below follows this pattern.

## Full worked example — Onchain Dinos (Net-integrated)

A complete, compilable collection: it extends `NetIntegratedERC721A` (so mints/transfers auto-post to Net via the inherited hook — nothing to wire) and supplies only the art. Drop this in `src/OnchainDinosNet.sol` alongside `src/NetIntegratedERC721A.sol` and `forge build`. Uses only the pinned solady deps — no bespoke `SVG.sol`/`Utils.sol`. (Both files verified to compile clean under solc 0.8.24 with ERC721A v4.3.0 + solady.)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { NetIntegratedERC721A } from "./NetIntegratedERC721A.sol";
import { LibString } from "solady/utils/LibString.sol";
import { LibPRNG } from "solady/utils/LibPRNG.sol";
import { Base64 } from "solady/utils/Base64.sol";

/// @title Onchain Dinos (Net-integrated)
/// @notice Generative on-chain dinos that auto-post mint/transfer activity to
///         Net. Only the art is collection-specific; the base does the rest.
contract OnchainDinosNet is NetIntegratedERC721A {
    using LibString for uint256;
    using LibPRNG for LibPRNG.PRNG;

    /// @dev Every random choice for a token. art() and tokenURI() both read
    ///      this, so the traits always describe the image.
    struct Traits {
        uint256 hue;
        uint256 saturation;
        uint256 lightness;
        bool goldHat;
    }

    // Pixel map (39 cells): colors[i] picks a palette slot; xs[i]/ys[i] place it.
    uint8[39] internal colors = [3,3,3,3,3,3,3,3,5,2,2,2,2,2,1,2,1,2,5,2,2,2,2,2,2,4,4,2,5,2,2,4,2,2,2,4,4,2,2];
    uint8[39] internal xs     = [6,10,7,8,6,7,8,9,5,6,7,8,9,6,7,8,9,10,5,6,7,8,9,10,6,7,8,4,5,6,7,8,9,5,6,7,8,6,8];
    uint8[39] internal ys     = [3,4,3,3,4,4,4,4,5,5,5,5,5,6,6,6,6,6,7,7,7,7,7,7,8,8,8,9,9,9,9,9,9,10,10,10,10,11,11];

    constructor()
        NetIntegratedERC721A(
            "onchain dinos", // name
            "DINO",          // symbol
            0.005 ether,     // price
            2048,            // maxSupply (0 = unlimited)
            0,               // maxMintsPerWallet (0 = unlimited)
            48               // creatorReserve (0 = no creator mints)
        )
    {}

    /// @dev The only place the PRNG is drawn from. Append new draws at the
    ///      end so existing tokens keep their art and traits.
    function _traits(uint256 tokenId) internal view returns (Traits memory t) {
        LibPRNG.PRNG memory p;
        p.seed(uint256(_tokenToSeed[tokenId]));
        t.hue = p.uniform(360);
        t.saturation = 25 + p.uniform(70);
        t.lightness = 65 + p.uniform(15);
        t.goldHat = p.uniform(100) < 5; // 5% of dinos
    }

    /// @notice Per-token palette. The hat is gold for rare dinos, otherwise
    ///         the previous dino's body color (white for the first dino).
    function getColors(uint256 tokenId)
        public
        view
        returns (string memory dino, string memory hat, string memory bg)
    {
        Traits memory t = _traits(tokenId);
        dino = _hsl(t.hue, t.saturation, t.lightness);
        if (t.goldHat) {
            hat = "#FFD700";
        } else if (tokenId > _startTokenId()) {
            Traits memory prev = _traits(tokenId - 1);
            hat = _hsl(prev.hue, prev.saturation, prev.lightness);
        } else {
            hat = "#FFF";
        }
        bg = _hsl((t.hue + 180) % 360, 60, 80);
    }

    /// @notice The on-chain SVG for a token — plain string.concat, no SVG lib.
    function art(uint256 tokenId) public view returns (string memory) {
        (string memory body, string memory hat, string memory bg) = getColors(tokenId);
        string memory pixels;
        unchecked {
            for (uint256 i; i < colors.length; ++i) {
                string memory c = colors[i] == 1
                    ? "#FFF"
                    : colors[i] == 2 ? body : colors[i] == 3 ? hat : colors[i] == 4 ? "#DBDBDB" : "#EDEDED";
                pixels = string.concat(
                    pixels,
                    '<rect width="1" height="1" fill="', c,
                    '" x="', uint256(xs[i]).toString(),
                    '" y="', uint256(ys[i]).toString(), '"/>'
                );
            }
        }
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" ',
            'shape-rendering="crispEdges" viewBox="0 0 16 16" style="background-color:', bg, '">',
            pixels,
            "</svg>"
        );
    }

    /// @notice Fully on-chain metadata: base64(JSON) wrapping base64(SVG).
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

        string memory image = Base64.encode(bytes(art(tokenId)));
        string memory json = string.concat(
            '{"name":"Dino #', tokenId.toString(),
            '","description":"onchain dinos. rawr.",',
            '"image":"data:image/svg+xml;base64,', image, '",',
            '"attributes":', _attributes(tokenId), "}"
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @dev Built from the same Traits that art() renders.
    function _attributes(uint256 tokenId) internal view returns (string memory) {
        Traits memory t = _traits(tokenId);
        string memory hat = t.goldHat
            ? "Gold"
            : tokenId > _startTokenId() ? "Inherited" : "White";
        return string.concat(
            '[{"trait_type":"Body","value":"', _hueName(t.hue),
            '"},{"trait_type":"Tone","value":"', t.saturation >= 60 ? "Vivid" : "Muted",
            '"},{"trait_type":"Hat","value":"', hat,
            '"},{"trait_type":"Background","value":"', _hueName((t.hue + 180) % 360),
            '"}]'
        );
    }

    /// @dev Hue in degrees -> a color name collectors can filter by.
    function _hueName(uint256 h) internal pure returns (string memory) {
        if (h < 15) return "Red";
        if (h < 45) return "Orange";
        if (h < 70) return "Yellow";
        if (h < 160) return "Green";
        if (h < 200) return "Teal";
        if (h < 260) return "Blue";
        if (h < 290) return "Purple";
        if (h < 335) return "Pink";
        return "Red";
    }

    /// @dev "hsl(h,s%,l%)" — replaces the original's Utils.hslaString.
    function _hsl(uint256 h, uint256 s, uint256 l) internal pure returns (string memory) {
        return string.concat("hsl(", h.toString(), ",", s.toString(), "%,", l.toString(), "%)");
    }
}
```

Note there's **no Net code in this file at all** — `mint()`, the supply/per-wallet/creator caps, seeding, and the mint/transfer posting are all inherited. That's the whole point: an agent writes only the `_traits`/`getColors`/`art`/`tokenURI` it's generating.

## Deploying & interacting

**Deploy on a Net-supported chain.** The collection posts to the Net contract at `0x00000000B24D62781dB359b07880a105cD0b64e6` — that address only has code on Net-supported chains (Base 8453 is the primary; full list in the SKILL overview). Because the post is guarded by a code-length check and wrapped in `try/catch`, deploying on a chain where Net *isn't* live doesn't error — mints/transfers still work, but **every message silently no-ops and nothing is recorded.** Test on **Base Sepolia (84532)** first, then ship to Base.

The commands below use Foundry's `forge create` / `cast`, but **deploy is toolchain-agnostic** — you're just sending the compiled bytecode. Any of these work equally: a Hardhat deploy script, a viem/ethers `deployContract` call, Remix with an injected wallet, `npx thirdweb deploy`, or submitting the raw deploy tx via **Bankr's `/wallet/submit`** (the most natural path for an autonomous agent that doesn't shell out to `forge`).

Set env and deploy (append `--verify` to publish source to the explorer so holders can read the contract):

```bash
export RPC_URL=https://mainnet.base.org     # or a Base Sepolia / provider URL
export PRIVATE_KEY=0x...                     # deployer key — becomes _deployer (withdraw + mintToCreator)

forge create src/MyCollection.sol:MyCollection \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast \
  --verify --etherscan-api-key $BASESCAN_API_KEY   # optional, recommended
```

If your collection's constructor takes args, add `--constructor-args <...>`. The `MyCollection` / `OnchainDinosNet` examples take none.

Interact with the deployed contract via `cast`:

```bash
export NFT=0xYourDeployedCollection

# Creator premint (deployer only): 10 free tokens to the creator, counted against creatorReserve
cast send $NFT "mintToCreator(uint256,address)" 10 $CREATOR \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Public mint: 3 tokens at 0.01 ETH each -> 0.03 ETH
cast send $NFT "mint(uint256)" 3 --value 0.03ether \
  --rpc-url $RPC_URL --private-key $BUYER_KEY

# Withdraw collected ETH to the deployer
cast send $NFT "withdraw()" --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Read a token's fully on-chain metadata
cast call $NFT "tokenURI(uint256)(string)" 1 --rpc-url $RPC_URL
```

Each of those mints/transfers/burns auto-posts to Net — confirm with the read recipes below.

## Reading a collection's activity back from Net

Once deployed, everything the collection did is on Net under `app = <collection address>`. No indexer or event log needed.

### CLI (`netp`)

```bash
# All mints for the collection (newest first)
netp message read --app 0xCollection --topic "mint" --chain-id 8453 --json

# All transfers
netp message read --app 0xCollection --topic "transfer" --chain-id 8453 --json

# All burns
netp message read --app 0xCollection --topic "burn" --chain-id 8453 --json

# Everything a specific wallet minted from this collection
netp message read --app 0xCollection --topic "mint" --sender 0xUser --chain-id 8453 --json

# Everything a wallet sent (they are `from`, so `sender` on transfer messages)
netp message read --app 0xCollection --topic "transfer" --sender 0xUser --chain-id 8453 --json

# How many mint messages exist (≈ number of mint batches, not tokens)
netp message count --app 0xCollection --topic "mint" --chain-id 8453 --json

# Total activity (mints + transfers + burns)
netp message count --app 0xCollection --chain-id 8453 --json
```

Note `count` returns the number of **messages** (batches), not tokens — a batch mint of 5 is one `mint` message spanning `#start–#end`. Parse the range out of the text (or the token IDs) if you need per-token counts.

### Solidity (for contracts / indexers)

Reads live on the **same** Net contract (address as above). Topics are hashed to `bytes32` on the read side.

```solidity
interface INetReader {
    struct Message {
        address app;
        address sender;
        bytes32 topic;
        uint48 timestamp;
        string text;
        bytes data;
    }

    function getTotalMessagesForAppCount(address app) external view returns (uint256);
    function getTotalMessagesForAppTopicCount(address app, bytes32 topic) external view returns (uint256);
    function getMessagesInRangeForApp(uint256 startIdx, uint256 endIdx, address app)
        external view returns (Message[] memory);
    function getMessagesInRangeForAppTopic(uint256 startIdx, uint256 endIdx, address app, bytes32 topic)
        external view returns (Message[] memory);
}

// Usage: fetch every mint message for a collection.
INetReader net = INetReader(0x00000000B24D62781dB359b07880a105cD0b64e6);
bytes32 topic = keccak256(bytes("mint"));
uint256 total = net.getTotalMessagesForAppTopicCount(collection, topic);
INetReader.Message[] memory msgs = net.getMessagesInRangeForAppTopic(0, total, collection, topic);
```

**Paginate large collections.** Fetching `(0, total)` pulls every message in one call, which blows past RPC response / gas limits once a collection is active. Read fixed-size windows instead — `getMessagesInRangeForAppTopic(i, i + 500, ...)` in Solidity, or `netp message read --start <i> --end <j>` on the CLI.

## Agent deploy workflow (e.g. you or an AI like Bankr)

1. **Gather config** from the user: name, symbol, price, max supply, per-wallet cap, creator reserve (the most they'll ever premint), and an art description.
2. **Generate the art** — write `_traits()`, `art()` and `tokenURI()` on top of `NetIntegratedERC721A`. Every random choice comes from `_traits()`, so the metadata traits match the image (see *Traits that match the art*).
3. **Compile & deploy** — scaffold per *Project setup*, `forge build`, then deploy on a Net-supported chain per *Deploying & interacting* (`forge create` + `cast send`).
4. **Premint (optional)**: `cast send $NFT "mintToCreator(uint256,address)" <amount> <creator>` (total across calls ≤ `creatorReserve`).
5. **Announce**: the mint/transfer/burn messages post themselves; you can additionally post a launch note to the collection's own feed (topic is `feed-` + the collection address in **lowercase**):
   ```bash
   netp message send --text "Minting now: <name>" --topic "feed-0xcollectionaddresslowercased" --chain-id 8453
   ```
6. **Monitor**: poll the read recipes above to show live mint/transfer/burn activity.

## Gas notes

- **Split topics cost ~nothing extra.** The mint/burn/transfer branch is a few stack ops (~10–20 gas); the topic strings differ by a handful of calldata/hash bytes (~60 gas). Both are rounding error.
- **The real cost is posting to Net at all** — an external call plus storing the `Message` (several `SSTORE`s), on the order of tens of thousands of gas *per mint, transfer, and burn*. Every transfer of the collection now carries that on top of the ERC721A transfer. Budget for it; it's the point of the integration.
- **`try/catch` is mandatory**, not optional. Without it, any Net-side revert (or a tight gas limit on the transfer) would make the collection's tokens untransferable. Best-effort posting keeps the NFT safe.
- **So is the `code.length` guard.** `try/catch` does not catch the call to an address with no code: Solidity's pre-call code check reverts outside the `try`. Without the guard the collection can't mint at all on a chain without Net.
- **Net is a best-effort log, not the source of truth.** A transaction sent with just enough gas for the NFT logic succeeds with the Net post silently dropped (the inner call runs out of gas and is caught). Wallet estimates normally leave enough headroom, but indexers that need every event should read the ERC-721 `Transfer` logs.
- **Keep `text` short, `data` empty.** That's the only size-dependent part of the write.

## Safety checklist

- [ ] Net call is wrapped in `try/catch` and guarded by `address(NET).code.length != 0`.
- [ ] `maxSupply` enforced in *both* `mint()` and `mintToCreator()`.
- [ ] `maxMintsPerWallet` checked via `_numberMinted(msg.sender)` (0 = unlimited).
- [ ] Preminted tokens are seeded (so their art renders).
- [ ] `tokenURI` reverts for nonexistent tokens.
- [ ] `mintToCreator` is `onlyDeployer` and capped by the immutable `creatorReserve`.
- [ ] Art work per `tokenURI` is bounded so marketplaces can render it.
- [ ] `art()` and the metadata `attributes` both read the same `_traits()` result.
- [ ] Deployed on a **Net-supported chain** (else posts silently no-op).
- [ ] Seed entropy suits the stakes (`block.prevrandao` is fine for art, not for valuable rarity).
