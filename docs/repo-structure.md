# Net Public Repository Structure

This document outlines the structure and organization of the `net-public` repository, which contains TypeScript SDK modules, example code, smart contracts, and documentation for the Net Protocol ecosystem.

## Chosen Approach: Approach 1 - Monorepo with Yarn Workspaces

After evaluating multiple structural approaches, we have chosen **Approach 1: Monorepo with Yarn Workspaces**. This approach provides:

- Industry-standard monorepo pattern
- Independent versioning of each SDK package
- Efficient dependency management through hoisting
- Seamless local development with workspace linking
- Easy extensibility for future additions
- Publishing to npm as scoped packages (`@net-protocol/*`)

## Overview

The `net-public` repository is organized as a **monorepo using Yarn workspaces** to manage multiple npm packages. This structure enables:

- Independent versioning of each SDK package
- Efficient dependency management through hoisting
- Seamless local development with workspace linking
- Easy extensibility for future additions
- Publishing to npm as scoped packages (`@net-protocol/*`)

## API Design Principles

### Object Parameters Over Multiple Arguments

**Principle:** All functions should accept a single JSON object parameter rather than multiple comma-separated arguments.

**Rationale:**

- ✅ **Self-documenting** - Parameter names are explicit at call sites
- ✅ **Extensible** - Easy to add new optional parameters without breaking changes
- ✅ **Readable** - Clear what each value represents
- ✅ **Optional parameters** - Easier to handle optional vs required parameters
- ✅ **Consistent** - Uniform API pattern across all packages

**Examples:**

❌ **Avoid:**

```typescript
getStorage(key, operatorAddress, chainId);
getNetMessage(chainId, messageIndex, appAddress, topic);
```

✅ **Preferred:**

```typescript
getStorage({ key, operatorAddress, chainId });
getNetMessage({ chainId, messageIndex, appAddress, topic });
```

This principle applies to all SDK packages and their exported functions.

## Repository Structure

```
net-public/
├── packages/                    # Publishable npm packages
│   ├── net-core/                # Core Net protocol SDK
│   ├── net-storage/             # Storage SDK
│   ├── net-score/               # Score/Upvote SDK
│   └── net-types/               # Shared TypeScript types
│
├── contracts/                   # Smart contracts
│   ├── storage/                 # Storage contracts
│   ├── upvote/                  # Upvote/Score contracts
│   └── examples/                # Example contracts
│
├── examples/                    # Example applications
│   ├── storage-example/         # Example using net-storage
│   ├── upvote-example/          # Example using net-score
│   └── full-app-example/        # Complete example app
│
├── docs/                        # Documentation
│   ├── repo-structure.md        # This file
│   ├── getting-started.md       # Getting started guide
│   ├── api-reference/           # API documentation
│   └── guides/                  # Usage guides
│
├── package.json                 # Root workspace config
├── yarn.lock                    # Single lockfile for all packages
├── tsconfig.json                # Base TypeScript config
├── .gitignore
└── README.md                    # Main README
```

## Chain Configuration Abstraction

All SDK packages use a clean chain abstraction that supports multiple EVM chains with custom RPC URLs.

### Chain Configuration Module

**Location:** `packages/net-core/src/chainConfig.ts` (or shared across packages)

**Design:**

- Internal object mapping chain ID to chain configuration (not exposed)
- Helper functions to get chain attributes (name, RPC URLs, etc.)
- Helper function to get `PublicClient` for a chain
- Support for custom RPC URLs

**Structure:**

```typescript
// Internal chain configuration (not exported)
const CHAIN_CONFIG: Record<number, ChainConfig> = {
  8453: {
    name: "Base",
    rpcUrls: ["https://mainnet.base.org"],
    // ... other chain-specific config
  },
  // ... other chains
};

// Public API - helper functions only
export function getChainName(params: { chainId: number }): string | undefined;
export function getChainRpcUrls(params: {
  chainId: number;
  rpcUrl?: string | string[];
}): string[];
export function getPublicClient(params: {
  chainId: number;
  rpcUrl?: string | string[];
}): PublicClient;
```

**Key Features:**

- ✅ Clean abstraction - no need to pass Chain objects around
- ✅ Custom RPC URLs - override default RPCs per call
- ✅ Type-safe - chain IDs are validated
- ✅ Extensible - easy to add new chains
- ✅ Internal config - implementation details hidden

**Usage Example:**

```typescript
import { getPublicClient } from "@net-protocol/core";

// Use default RPC
const client = getPublicClient({ chainId: 8453 });

// Use custom RPC
const client = getPublicClient({
  chainId: 8453,
  rpcUrl: "https://custom-rpc.example.com",
});

// Use multiple RPCs for fallback
const client = getPublicClient({
  chainId: 8453,
  rpcUrl: ["https://primary-rpc.com", "https://fallback-rpc.com"],
});
```

**React Provider Pattern:**

For React applications, use `NetProvider` to configure RPC URLs at the top level:

```typescript
import { NetProvider } from "@net-protocol/core";

function App() {
  return (
    <NetProvider
      overrides={{
        rpcUrls: {
          8453: ["https://custom-base-rpc.com", "https://fallback-rpc.com"],
          1: ["https://custom-mainnet-rpc.com"],
        },
      }}
    >
      {/* Your app */}
    </NetProvider>
  );
}
```

**How NetProvider Works:**

- **Sets wagmi config** - Configures wagmi chains with custom RPCs for hooks
- **Sets global override map** - Updates global override map for utilities
- **Unified source** - Both hooks and utilities read from the same config
- **Multiple RPCs** - Supports fallback RPCs via array of URLs

**Non-React Top-Level Configuration:**

For non-React usage (Node.js, API routes, server-side), set overrides globally before creating clients:

```typescript
import {
  setChainRpcOverrides,
  NetClient,
  StorageClient,
} from "@net-protocol/core";

// Set overrides once at application startup
setChainRpcOverrides({
  8453: ["https://custom-base-rpc.com", "https://fallback-rpc.com"],
  1: ["https://custom-mainnet-rpc.com"],
});

// All clients created after this will use the overrides
const netClient = new NetClient({ chainId: 8453 });
const storageClient = new StorageClient({ chainId: 8453 });

// Or pass overrides directly to client constructor (scoped to that client)
const netClientWithOverrides = new NetClient({
  chainId: 8453,
  overrides: { rpcUrls: ["https://client-specific-rpc.com"] },
});
```

**Override Priority (Non-React):**

1. **Per-client override** - `new NetClient({ chainId, rpcOverrides })` (highest priority, scoped to that client)
2. **Global override** - `setChainRpcOverrides()` (affects all clients created after)
3. **Environment variable** - `NET_RPC_8453=custom-url` (future)
4. **Default** - From `CHAIN_CONFIG` (lowest priority)

**Implementation Details:**

**Chain Configuration Object:**

```typescript
// Internal - not exported
interface ChainConfig {
  name: string;
  rpcUrls: string[];
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer?: {
    name: string;
    url: string;
  };
  // ... other chain-specific attributes
}

const CHAIN_CONFIG: Record<number, ChainConfig> = {
  8453: {
    name: "Base",
    rpcUrls: ["https://mainnet.base.org"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorer: { name: "BaseScan", url: "https://basescan.org" },
  },
  // ... other chains
};
```

**Helper Functions:**

```typescript
// Get chain name
export function getChainName(params: { chainId: number }): string | undefined {
  return CHAIN_CONFIG[params.chainId]?.name;
}

// Get RPC URLs (checks global override, then per-call override, then defaults)
export function getChainRpcUrls(params: {
  chainId: number;
  rpcUrl?: string | string[];
}): string[] {
  // Per-call override takes precedence
  if (params.rpcUrl) {
    return Array.isArray(params.rpcUrl) ? params.rpcUrl : [params.rpcUrl];
  }

  // Check global override map (set by NetProvider or setChainRpcOverride)
  const globalOverride = getGlobalRpcOverride(params.chainId);
  if (globalOverride) {
    return globalOverride;
  }

  // Fall back to defaults
  return CHAIN_CONFIG[params.chainId]?.rpcUrls || [];
}

// Get PublicClient for a chain
export function getPublicClient(params: {
  chainId: number;
  rpcUrl?: string | string[];
}): PublicClient {
  const config = CHAIN_CONFIG[params.chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${params.chainId}`);
  }

  const rpcUrls = getChainRpcUrls({
    chainId: params.chainId,
    rpcUrl: params.rpcUrl,
  });

  return createPublicClient({
    chain: defineChain({
      id: params.chainId,
      name: config.name,
      nativeCurrency: config.nativeCurrency,
      rpcUrls: {
        default: { http: rpcUrls },
        public: { http: rpcUrls },
      },
      blockExplorers: config.blockExplorer
        ? {
            default: config.blockExplorer,
          }
        : undefined,
    }),
    transport: http(),
    batch: { multicall: true },
  });
}

// Global override management (used by NetProvider)
let globalRpcOverrides: Record<number, string[]> = {};

export function setChainRpcOverrides(overrides: {
  [chainId: number]: string[];
}) {
  globalRpcOverrides = { ...globalRpcOverrides, ...overrides };
}

function getGlobalRpcOverride(chainId: number): string[] | undefined {
  return globalRpcOverrides[chainId];
}
```

**Benefits Over Current Approach:**

1. **Simpler API** - Just pass chain ID, not Chain objects
2. **Custom RPC Support** - Easy to override RPC URLs
3. **Centralized Config** - All chain info in one place
4. **Type Safety** - Chain IDs validated at runtime
5. **No External Dependencies** - Doesn't require importing from `viem/chains`
6. **Consistent** - Same abstraction across all SDK packages

**Integration with SDK Packages:**

All SDK client classes use this abstraction:

```typescript
// In StorageClient
import { getPublicClient } from "@net-protocol/core";

export class StorageClient {
  constructor(params: {
    chainId: number;
    rpcUrl?: string | string[]; // Per-call RPC override (one-time use)
    overrides?: { rpcUrls: string[] }; // Client-scoped RPC URLs for this chain
  }) {
    // Client-scoped overrides take precedence over global overrides
    if (params.overrides?.rpcUrls) {
      setChainRpcOverrides({ [params.chainId]: params.overrides.rpcUrls });
    }

    this.client = getPublicClient({
      chainId: params.chainId,
      rpcUrl: params.rpcUrl, // Per-call override (highest priority)
    });
    this.chainId = params.chainId;
  }
}
```

**Usage Examples:**

```typescript
// Option 1: Use global overrides (set once at app startup)
setChainRpcOverrides({ 8453: ["https://custom-rpc.com"] });
const client = new StorageClient({ chainId: 8453 });

// Option 2: Client-scoped overrides (only affects this client)
const client = new StorageClient({
  chainId: 8453,
  overrides: { rpcUrls: ["https://client-specific-rpc.com"] },
});

// Option 3: Per-call override (highest priority, one-time use)
const client = new StorageClient({
  chainId: 8453,
  rpcUrl: "https://one-time-rpc.com",
});
```

**RPC URL Priority:**

1. **Per-call override** - `getPublicClient({ chainId: 8453, rpcUrl: 'custom' })` (highest priority)
2. **Global override** - Set via `NetProvider` or `setChainRpcOverrides()`
3. **Environment variable** - `NET_RPC_8453=custom-url` (future)
4. **Default** - From `CHAIN_CONFIG` (lowest priority)

## Dual API Design: Hooks and Utility Functions

All SDK packages provide **both React hooks and utility functions** to support different use cases:

### React Hooks

- For React/Next.js applications
- Use `useReadContract` from wagmi
- Return `{ data, isLoading, error }` pattern
- Require `wagmi` as peer dependency

### Utility Functions/Classes

- For non-React usage (Node.js, API routes, server-side)
- Use `readContract` from `viem/actions` directly
- Accept `PublicClient` as parameter
- Return promises with data directly
- No React dependency

### Package Structure Pattern

Each package follows this structure:

```
packages/net-core/
├── src/
│   ├── index.ts              # Main exports (both hooks and utilities)
│   ├── hooks/                # React hooks
│   │   ├── useNetMessages.ts
│   │   └── index.ts
│   ├── client/              # Utility classes/functions
│   │   ├── NetClient.ts
│   │   └── index.ts
│   ├── types.ts             # Shared types
│   └── constants.ts         # Contract addresses/ABIs
```

### Usage Examples

**React Hook:**

```typescript
import { useNetMessages } from "@net-protocol/core";

function MyComponent() {
  const { messages, isLoading, error } = useNetMessages({
    chainId: 8453,
    filter: { appAddress: "0x..." },
    enabled: true, // optional
  });
  return <div>{/* render */}</div>;
}
```

**Utility Function:**

```typescript
import { NetClient } from "@net-protocol/core";

const netClient = new NetClient({
  chainId: 8453,
  rpcUrl: "https://custom-rpc.com", // optional
});

const messages = await netClient.getMessages({
  chainId: 8453,
  filter: { appAddress: "0x..." },
});
```

## Packages

### @net-protocol/core

**Location:** `packages/net-core/`

Core Net protocol SDK for interacting with Net smart contracts. Provides the foundation for all other SDK packages.

**Key Exports:**

**React Hooks:**

- `useNetMessages` - Hook for reading Net messages
- `useNetMessageCount` - Hook for message counts

**Utility Functions:**

- `NetClient` - Main client class for Net protocol interactions
- `getNetMessageAtIndex` - Get message by index
- Message types and utilities
- Contract addresses and ABIs

**Dependencies:**

- `viem` - Ethereum library (required)
- `wagmi` (peer dependency) - React hooks for Ethereum (required for hooks only)

### @net-protocol/storage

**Location:** `packages/net-storage/`

Net Storage SDK for key-value storage on the Net protocol. Supports regular storage, chunked storage, and XML storage patterns.

**Key Exports:**

**React Hooks:**

- `useStorage` - Hook for reading storage values
- `useStorageForOperator` - Hook for all storage by operator
- `useBulkStorage` - Hook for bulk storage reads
- `useStorageTotalWrites` - Hook for version count

**Utility Functions:**

- `StorageClient` - Storage operations client class
- `readStorageDataRaw` - Read storage without XML resolution
- `readChunkedStorage` - Read chunked storage with decompression
- Storage utility functions (key generation, etc.)

**Dependencies:**

- `@net-protocol/core` - Core SDK (workspace dependency)
- `viem` - Ethereum library (required)
- `pako` - Compression library
- `wagmi` (peer dependency) - Required for hooks only

### @net-protocol/score

**Location:** `packages/net-score/`

Net Score/Upvote SDK for the onchain scoring system. Provides utilities for upvoting and score management.

**Key Exports:**

**React Hooks:**

- `useUpvotes` - Hook for reading upvotes
- `useScore` - Hook for reading scores
- `useUpvotesBatch` - Hook for batch upvote reads

**Utility Functions:**

- `ScoreClient` - Score operations client class
- `getUpvotes` - Get upvotes for a key
- `getScore` - Get score for a key
- Score key utilities

**Dependencies:**

- `@net-protocol/core` - Core SDK (workspace dependency)
- `viem` - Ethereum library (required)
- `wagmi` (peer dependency) - Required for hooks only

## Yarn Workspaces

The repository uses Yarn workspaces for dependency management. Key features:

### Workspace Configuration

**Root `package.json`:**

```json
{
  "private": true,
  "workspaces": ["packages/*"],
  "packageManager": "yarn@1.22.22"
}
```

### Workspace Protocol

Packages reference each other using the `workspace:*` protocol:

```json
{
  "dependencies": {
    "@net-protocol/core": "workspace:*"
  }
}
```

This creates a symlink during development and resolves to the published version when packages are published to npm.

### Common Commands

**Install dependencies:**

```bash
yarn install
```

**Build all packages:**

```bash
yarn build
```

**Build specific package:**

```bash
yarn workspace @net-protocol/core build
```

**Add dependency to package:**

```bash
yarn workspace @net-protocol/storage add viem
```

**Run script in all workspaces:**

```bash
yarn workspaces run test
```

## Development Workflow

### Local Development

1. Make changes to source files in `packages/*/src/`
2. Build the package: `yarn workspace @net-protocol/core build`
3. Changes are immediately available via `workspace:*` links
4. Test in dependent packages or examples
5. Run type checking: `yarn typecheck`

### Publishing

1. Update version in package `package.json`
2. Build all packages: `yarn build:all`
3. Run tests: `yarn test` (if tests exist)
4. Publish: `yarn workspace @net-protocol/core publish --access public`
5. Update main Net app to use new version

## Source Code Extraction

The SDK packages are extracted from the main Net app (`website/` directory). Both **React hooks** and **utility functions** are extracted:

### net-core

**Hooks:**

- `useNetMessages` from `website/src/components/hooks/net/useNetMessages.ts`
- `useNetMessageCount` from `website/src/components/hooks/net/useNetMessageCount.ts`
- `getNetMessagesReadConfig` from `website/src/components/hooks/net/getNetMessagesReadConfig.ts`

**Utilities:**

- `getNetMessageAtIndex` from `website/src/components/core/utils.ts`
- Net contract interactions from `website/src/components/core/net-apps/`
- Message types from `website/src/components/core/types.ts`
- Contract addresses/ABIs from `website/src/app/constants.ts`

### net-storage

**Hooks:**

- `useStorage` from `website/src/components/hooks/net/useStorage.ts`
- `useStorageForOperator` from `website/src/components/hooks/net/useStorage.ts`
- `useBulkStorage` from `website/src/components/hooks/net/useStorage.ts`
- `useXmlStorage` from `website/src/components/hooks/net/useXmlStorage.ts`

**Utilities:**

- `readStorageDataRaw` from `website/src/app/api/[chainId]/storage/utils.ts`
- `readChunkedStorage` from `website/src/app/api/[chainId]/storage/utils.ts`
- Storage utilities from `website/src/components/core/net-apps/storage/utils.ts`
- Chunked storage from `website/src/components/core/net-apps/chunked-storage/utils.ts`
- XML storage from `website/src/components/core/net-apps/xml-storage/`

### net-score

**Hooks:**

- `useUpvotes` from `website/src/components/hooks/net/useUpvotesBatch.ts`
- `useUpvotesWithLegacy` from `website/src/components/hooks/net/useUpvotesWithLegacy.ts`
- Upvote hooks from `website/src/components/core/net-apps/upvote/hooks/`

**Utilities:**

- Upvote utilities from `website/src/components/core/net-apps/upvote/utils/`
- Score key utilities from `website/src/components/core/net-apps/upvote/utils/scoreKeyUtils.ts`
- Score contract interactions from `website/src/components/core/net-apps/upvote/`

## Contracts

Smart contracts are organized by feature:

- `contracts/storage/` - Storage contracts (Storage.sol, ChunkedStorage.sol, StorageRouter.sol)
- `contracts/upvote/` - Score and Upvote contracts (Score.sol, UpvoteApp.sol)
- `contracts/examples/` - Example contracts demonstrating Net usage

Contracts are copied from `protocol/src/apps/` in the main Net repository.

## Examples

Example applications demonstrate SDK usage:

- `examples/storage-example/` - Basic storage operations
- `examples/upvote-example/` - Upvote integration
- `examples/full-app-example/` - Complete application using all SDKs

Examples use `workspace:*` dependencies during development and published versions in production.

## Build System

### TypeScript Compiler (Chosen Approach)

**Decision:** Use TypeScript compiler directly (no bundler)

**Rationale:**

**TypeScript Compiler:**

- ✅ Simpler setup - no additional build tooling required
- ✅ Faster builds - direct compilation without bundling overhead
- ✅ Better tree-shaking - consuming applications can tree-shake unused code
- ✅ TypeScript handles type checking and declaration generation natively
- ✅ Smaller package size - no bundled runtime code
- ✅ Better debugging - source maps point to original TypeScript files
- ⚠️ No code minification (can be done by consuming apps if needed)

**Alternative: Bundler (esbuild/rollup):**

- ✅ Smaller output files (minified)
- ✅ Can bundle dependencies (but increases package size)
- ✅ More complex build configuration
- ⚠️ Additional tooling and dependencies
- ⚠️ Slower builds due to bundling step
- ⚠️ Harder to debug (bundled code)

**Output Structure:**

- `dist/index.js` - CommonJS build
- `dist/index.esm.js` - ES Module build (for net-core)
- `dist/index.d.ts` - TypeScript declarations
- `dist/*.d.ts.map` - Declaration source maps

### TypeScript Configuration

- Base `tsconfig.json` at root with shared compiler options
- Each package extends base config
- TypeScript project references for cross-package type checking

## Versioning Strategy

**Decision:** Independent versioning per package

Each package is versioned independently using semantic versioning:

- **Major** - Breaking changes
- **Minor** - New features (backward compatible)
- **Patch** - Bug fixes

### Synchronized Versioning (Alternative)

If we wanted synchronized versions, all packages would share the same version number:

**How it would work:**

- All packages bump to the same version (e.g., `1.2.0`) simultaneously
- Root `package.json` could track a single version
- Use tools like `lerna` or `changesets` to manage synchronized releases
- All packages released together, even if only one changed

**Pros:**

- Easier to understand which versions work together
- Simpler for consumers (all packages at same version)

**Cons:**

- Unnecessary version bumps when only one package changes
- Less flexibility for independent releases
- More complex release process

**Why Independent Versioning:**

- More flexible - packages can evolve independently
- Consumers can mix and match versions as needed
- Aligns with semantic versioning best practices
- Better for gradual adoption

## Handling Breaking Changes in Dependencies

When a package has a breaking change that affects dependent packages:

### Example: `net-core` v2.0.0 breaks `net-storage`

**Scenario:** `net-core` releases v2.0.0 with breaking API changes. `net-storage` depends on `net-core`.

**Process:**

1. **Update `net-storage` dependency:**

   ```json
   {
     "dependencies": {
       "@net-protocol/core": "^2.0.0"
     }
   }
   ```

2. **Update `net-storage` code** to use new `net-core` API

3. **Version `net-storage` appropriately:**

   - If `net-storage` API unchanged: Patch version (e.g., `1.0.1`)
   - If `net-storage` API changed: Major version (e.g., `2.0.0`)

4. **Update peer dependency ranges** in `net-storage`:

   ```json
   {
     "peerDependencies": {
       "@net-protocol/core": "^2.0.0"
     }
   }
   ```

5. **Document breaking changes** in CHANGELOG.md

6. **Publish in order:**
   - First: `@net-protocol/core@2.0.0`
   - Then: `@net-protocol/storage@2.0.0` (or `1.0.1`)

**Best Practices:**

- Always test dependent packages when core packages have breaking changes
- Use peer dependencies to enforce compatible versions
- Document minimum required versions in README
- Provide migration guides for major version upgrades
- Consider deprecation periods for breaking changes

## Integration with Main Net App

After publishing packages to npm, the main Net app (`website/`) can use them:

```json
{
  "dependencies": {
    "@net-protocol/core": "^1.0.0",
    "@net-protocol/storage": "^1.0.0",
    "@net-protocol/score": "^1.0.0"
  }
}
```

Migration involves:

1. Installing packages
2. Replacing local imports with package imports
3. Removing old utility files
4. Testing integration

## Documentation

**Decision:** Generate API docs from TypeScript using TypeDoc

**Rationale:**

- ✅ Auto-generated from source code - always in sync
- ✅ Type-safe documentation - reflects actual types
- ✅ Less maintenance - no manual updates needed
- ✅ Rich type information - shows interfaces, types, generics
- ✅ Cross-references between packages
- ✅ Can include JSDoc comments for additional context

**Documentation Structure:**

- `docs/getting-started.md` - Installation and quick start (manual)
- `docs/api-reference/` - Auto-generated API docs from TypeDoc
- `docs/guides/` - Usage guides and examples (manual)

**TypeDoc Configuration:**

- Generate docs for each package
- Include all exported types and functions
- Link between packages
- Output to `docs/api-reference/`

## CI/CD

**Decision:** Manual publishing to npm

**Rationale:**

- ✅ More control over when packages are published
- ✅ Allows for manual review before publishing
- ✅ Simpler setup - no complex CI/CD configuration needed
- ✅ Can coordinate multi-package releases manually
- ⚠️ Requires manual version bumping and publishing

**Publishing Process:**

1. Update version in package `package.json`
2. Build packages: `yarn build:all`
3. Run tests: `yarn test` (if tests exist)
4. Manual review of changes
5. Publish: `yarn workspace @net-protocol/core publish --access public`

**Future Consideration:**
Could add automated publishing later using GitHub Actions triggered by version tags or manual workflow dispatch.

## Contract Compilation

**Decision:** Use Foundry for contract compilation

**Rationale:**

- ✅ Fast compilation and testing
- ✅ Built-in testing framework
- ✅ Gas optimization tools
- ✅ Active development and community
- ✅ Used in main Net protocol repository

**Setup:**

- `contracts/foundry.toml` - Foundry configuration
- Contracts organized by feature in subdirectories
- Can compile and test contracts independently

**Note:** Hardhat is not used - Foundry is the chosen tooling.

## Testing

### Integration Tests

The SDK packages include integration tests that verify functionality against live blockchain data. These tests use **Vitest** as the test framework and run against Base mainnet (chainId: 8453).

### Test Configuration

- **Framework:** Vitest
- **Test Chain:** Base mainnet (chainId: 8453)
- **Execution:** Sequential (single process) to avoid RPC rate limits
- **Timeout:** 30 seconds per test (to accommodate RPC calls)

### Dynamic Data Considerations

**Important:** Message counts and blockchain data are **dynamic** and can change over time as new messages are sent to the Net protocol. Tests are designed to handle this:

**Best Practices:**

1. **Use Range Checks, Not Exact Counts:**

   - ✅ `expect(count).toBeGreaterThanOrEqual(0)` - Allows counts to grow
   - ✅ `expect(count2).toBeGreaterThanOrEqual(count1)` - Allows increases between queries
   - ❌ Avoid: `expect(count).toBe(42)` - Exact counts will break as new messages arrive

2. **Check Counts Before Querying:**

   - Always check message counts before querying ranges
   - Use actual counts to determine valid ranges: `endIndex: Math.min(count, 10)`
   - This prevents `InvalidStartIndex` and `InvalidEndIndex` contract errors

3. **Handle Empty Results Gracefully:**

   - Skip tests when counts are 0 (no messages exist yet)
   - Use conditional assertions: `if (count === 0) { expect(count).toBe(0); return; }`

4. **Compare Simultaneous Queries:**

   - When comparing two queries (e.g., NetClient vs standalone function), they should match because they're executed at the same time
   - `expect(clientCount).toBe(standaloneCount)` is safe for simultaneous queries

5. **Account for Race Conditions:**

   - There's a small window between checking a count and using it in a query
   - If a new message arrives between the count check and query, the contract will revert with `InvalidEndIndex`
   - Tests use dynamic ranges to minimize this risk: `endIndex: Math.min(count, maxRange)`

6. **Rate Limiting:**
   - Tests include 500ms delays between RPC calls to avoid rate limits (configurable via `RPC_DELAY_MS`)
   - Use the `delay()` helper from `test-utils.ts` with default `RPC_DELAY_MS` constant
   - Use `withRetry()` helper to automatically retry RPC calls on 429 rate limit errors
   - Consider adding `beforeAll()` hooks with initial delays for test suites that make many RPC calls

**Example Test Pattern:**

```typescript
it("should filter by appAddress", async () => {
  const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;

  // First check if there are messages for this app
  const count = await getNetMessageCount({
    chainId: BASE_CHAIN_ID,
    filter: { appAddress },
  });

  await delay(); // Rate limit protection

  if (count === 0) {
    // Skip test if no messages exist
    expect(count).toBe(0);
    return;
  }

  // Use actual count to determine valid range
  const messages = await getNetMessages({
    chainId: BASE_CHAIN_ID,
    filter: { appAddress },
    startIndex: 0,
    endIndex: Math.min(count, 10), // Dynamic range
  });

  expect(Array.isArray(messages)).toBe(true);
  expect(messages.length).toBeLessThanOrEqual(Math.min(count, 10)); // Flexible assertion

  await delay();
});
```

### Contract Validation

The Net contract enforces strict validation on range queries:

- **`InvalidRange()`** - Reverted when `startIdx >= endIdx`
- **`InvalidStartIndex()`** - Reverted when `startIdx + 1 > querySetLength`
- **`InvalidEndIndex()`** - Reverted when `endIdx > querySetLength`

Tests must account for these validations and expect reverts for invalid ranges rather than empty arrays.

### Test Utilities

Test utilities are located in `packages/net-core/src/__tests__/test-utils.ts`:

- `BASE_CHAIN_ID` - Base chain ID constant (8453)
- `BASE_TEST_ADDRESSES` - Known contract addresses for testing
- `RPC_DELAY_MS` - Delay constant (500ms) for rate limiting
- `delay(ms?)` - Helper function for delays (defaults to `RPC_DELAY_MS`)
- `retryWithBackoff()` - Helper for retrying with exponential backoff (handles 429 errors)
- `withRetry()` - Wrapper for RPC calls that automatically retries on rate limit errors

**Example with retry:**

```typescript
import { withRetry } from "./test-utils";

it("should handle rate limits gracefully", async () => {
  const messages = await withRetry(() =>
    getNetMessages({
      chainId: BASE_CHAIN_ID,
      startIndex: 0,
      endIndex: 10,
    })
  );

  expect(Array.isArray(messages)).toBe(true);
});
```

## Extending the Repository

To add a new package:

1. Create directory: `packages/new-package/`
2. Add `package.json` with `@net-protocol/new-package` name
3. Add to workspace (automatically detected via `packages/*`)
4. Configure TypeScript: extend root `tsconfig.json`
5. Add build scripts
6. Update root `package.json` scripts if needed

## Questions or Issues

For questions about the repository structure or to propose changes, please open an issue or discussion in the repository.
