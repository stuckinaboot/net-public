# Ethereum Mainnet Support Plan

## Current State

**net-core** already has Ethereum mainnet (chainId `1`) in its `CHAIN_CONFIG` with RPC URLs, the Net contract address, and block explorer config. Since all packages that need chain awareness delegate to net-core for basic chain resolution (`getPublicClient`, `getNetContract`, `getChainRpcUrls`), the core messaging layer already works on Ethereum mainnet.

The contracts use CREATE2 deterministic deployment, so most share the same address across all chains (e.g., Net contract = `0x00000000B24D62781dB359b07880a105cD0b64e6`).

---

## Package-by-Package Analysis

### 1. net-core — Already Done
- Ethereum mainnet (chainId `1`) is fully configured in `chainConfig.ts:35-41`
- RPC URLs: `eth.llamarpc.com`, `rpc.ankr.com/eth`
- Net contract address, native currency, and block explorer all set
- **No code changes needed**

### 2. net-feeds — Already Works (via net-core)
- Fully chain-agnostic: all chain logic delegated to net-core via `NetClient(chainId)`
- Contract addresses in `constants.ts` (FeedRegistry, TopicCountBulkHelper, AgentRegistry) use CREATE2 addresses that are the same on all chains
- The comment in `constants.ts:19` says "deployed on Base mainnet only" for `FEED_REGISTRY_CONTRACT` — **this comment may need updating** if the FeedRegistry is also deployed on Ethereum mainnet. The code itself doesn't restrict by chain.
- **No code changes needed** (assuming contracts are deployed at the same CREATE2 addresses on Ethereum mainnet). Update comments if deploying contracts there.

### 3. net-storage — Already Works (via net-core)
- Fully chain-agnostic: uses `getPublicClient(chainId)` from net-core
- All 5 storage contracts (Storage, ChunkedStorage, ChunkedStorageReader, StorageRouter, SafeStorageReader) use hardcoded CREATE2 addresses — same on all chains
- **No code changes needed** (assuming contracts are deployed at those addresses on Ethereum mainnet)

### 4. net-bazaar — Needs Config Addition
**File:** `packages/net-bazaar/src/chainConfig.ts`

Ethereum mainnet (`1`) is **missing** from `BAZAAR_CHAIN_CONFIGS`. To add it:

```typescript
// Ethereum Mainnet
1: {
  bazaarAddress: DEFAULT_BAZAAR_ADDRESS,    // or custom if deployed differently
  collectionOffersAddress: DEFAULT_COLLECTION_OFFERS_ADDRESS,
  seaportAddress: DEFAULT_SEAPORT_ADDRESS,
  feeCollectorAddress: DEFAULT_FEE_COLLECTOR_ADDRESS,
  nftFeeBps: DEFAULT_NFT_FEE_BPS,           // 5%, or 0 if waived on ETH
  wrappedNativeCurrency: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Canonical WETH on Ethereum mainnet
    name: "Wrapped Ether",
    symbol: "WETH",
  },
  currencySymbol: "eth",
},
```

**Key decisions needed:**
- **Contract addresses**: Are the Bazaar, CollectionOffers, and helper contracts deployed on Ethereum mainnet? If using CREATE2, they'd be at the default addresses. If not deployed yet, contracts must be deployed first.
- **Seaport address**: Ethereum mainnet has the original Seaport deployment — verify the address matches `DEFAULT_SEAPORT_ADDRESS` (`0x0000000000000068F116a894984e2DB1123eB395`). The canonical Seaport 1.6 on mainnet should be at the same address.
- **Fee**: Should Ethereum mainnet be 0% like Base/HyperEVM, or 5% like other chains?
- **ERC20 support**: Should `erc20OffersAddress` and `erc20BazaarAddress` be included? Currently only Base, HyperEVM, and MegaETH have these.
- **WETH address**: Ethereum mainnet WETH is `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` (NOT `0x4200...0006` which is the L2 predeploy).

**Also in BazaarClient.ts** (line 117-127): The `CHAIN_RPC_URLS` map is missing chainId `1`. Add:
```typescript
1: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
```

---

## Other Packages That May Want Mainnet Support

### 5. net-score — Currently Base-Only
**File:** `packages/net-score/src/constants.ts:62`
```typescript
export const SUPPORTED_SCORE_CHAINS = [8453] as const;
```

The Score system (upvoting/voting) is hardcoded to Base. Adding Ethereum mainnet would require:
- Deploying Score, UpvoteApp, UpvoteStorageApp, strategy contracts, and Uniswap pool-related contracts on Ethereum mainnet
- Updating `SUPPORTED_SCORE_CHAINS` to include `1`
- The `WETH_ADDRESS` constant (`0x4200...0006`) is Base-specific — would need the Ethereum mainnet WETH address
- Strategy contracts depend on Uniswap V2/V3/V4 pool infrastructure being available on mainnet (it is)

**Verdict:** Significant deployment work needed. Consider if the Score system is a priority for Ethereum mainnet.

### 6. net-netr — Currently 4 Chains Only
**File:** `packages/net-netr/src/chainConfig.ts`

Supports Base (8453), Plasma (9745), Monad (143), HyperEVM (999). Adding Ethereum mainnet requires:
- Deploying BangerV4 contract on Ethereum mainnet
- Determining the correct `initialTick` and `mintPrice` for ETH
- Setting the correct `wethAddress` (`0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` on mainnet vs `0x4200...0006` on L2s)
- Adding the config entry to `NETR_CHAIN_CONFIG`

### 7. net-cli — Already Works
- The `chains` command already lists Ethereum mainnet (pulls from net-core)
- All CLI commands accept `--chain-id` and delegate to underlying packages
- **No changes needed** unless bazaar/netr/score CLI commands need to support it

### 8. net-relay — Chain-Agnostic
- No chain-specific config. Works on any chain.
- **No changes needed**

### 9. net-profiles — Chain-Agnostic
- No blockchain interaction at all
- **No changes needed**

### 10. botchan — Chain-Agnostic
- Uses underlying clients, inherits chain support
- **No changes needed**

### 11. examples/basic-app — Hardcoded to Base
**Files:**
- `examples/basic-app/src/lib/constants.ts`: `CHAIN_ID = 8453`
- `examples/basic-app/src/config/wagmi.ts`: Uses Base chain

This is an example app, so it's expected to target one chain. Could be updated to demonstrate multi-chain support or Ethereum mainnet, but this is optional/cosmetic.

---

## Implementation Steps

### Step 1: net-bazaar — Add Ethereum Mainnet Config (Code Change)
1. Add chainId `1` entry to `BAZAAR_CHAIN_CONFIGS` in `packages/net-bazaar/src/chainConfig.ts`
   - Use canonical Ethereum mainnet WETH: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
   - Determine fee tier (0% or 5%)
   - Determine which contracts (Bazaar, CollectionOffers, ERC20) are deployed
2. Add chainId `1` to `CHAIN_RPC_URLS` in `packages/net-bazaar/src/client/BazaarClient.ts`
3. Run `cd packages/net-bazaar && yarn test` to verify

### Step 2: net-netr — Add Ethereum Mainnet Config (Requires Deployment)
1. Deploy BangerV4 on Ethereum mainnet (or confirm existing deployment)
2. Add chainId `1` entry to `NETR_CHAIN_CONFIG` in `packages/net-netr/src/chainConfig.ts`
   - Set appropriate `initialTick` and `mintPrice` for ETH pricing
   - Use Ethereum mainnet WETH address
3. Run `cd packages/net-netr && yarn test`

### Step 3: net-score — Add Ethereum Mainnet Support (Requires Deployment)
1. Deploy Score, UpvoteApp, and strategy contracts on Ethereum mainnet
2. Add `1` to `SUPPORTED_SCORE_CHAINS`
3. Handle the WETH address difference (currently hardcoded to L2 predeploy)
4. Run `cd packages/net-score && yarn test`

### Step 4: Verify net-feeds and net-storage
1. Confirm CREATE2 contracts (FeedRegistry, Storage, etc.) are deployed on Ethereum mainnet
2. Update comments in `packages/net-feeds/src/constants.ts` if applicable
3. Run integration tests: `cd packages/net-feeds && yarn test` and `cd packages/net-storage && yarn test`

---

## Summary Table

| Package | Status | Ethereum Mainnet Support | Work Required |
|---------|--------|--------------------------|---------------|
| **net-core** | Ready | Already configured | None |
| **net-feeds** | Ready | Works via net-core | None (maybe update comments) |
| **net-storage** | Ready | Works via net-core | None |
| **net-bazaar** | **Needs config** | Missing from chain config | Add config entry + WETH address + RPC URLs |
| **net-score** | **Needs deployment** | Base-only | Deploy contracts, update `SUPPORTED_SCORE_CHAINS`, fix WETH |
| **net-netr** | **Needs deployment** | 4 chains only | Deploy BangerV4, add config entry |
| **net-cli** | Ready | Inherits from packages | None |
| **net-relay** | Ready | Chain-agnostic | None |
| **net-profiles** | Ready | No blockchain usage | None |
| **botchan** | Ready | Inherits from clients | None |
| **basic-app** | N/A | Example app (Base-only) | Optional |

## Key Blocker

The **main prerequisite** for all changes is confirming that the relevant smart contracts are deployed on Ethereum mainnet at the expected addresses. Without deployed contracts, adding config entries would result in runtime failures. The net-core messaging layer is already live, so basic messaging/feeds/storage should work if the CREATE2 contracts exist there.
