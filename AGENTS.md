# AI Agent Guide for Net Protocol SDK

This guide helps AI coding agents understand and contribute to the net-public repository effectively.

## Quick Start

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Run tests
yarn test

# Type check
yarn typecheck
```

## Repository Structure

```
net-public/
├── packages/               # SDK packages (npm published)
│   ├── net-core/           # Core messaging primitives (base package)
│   ├── net-storage/        # Onchain key-value storage
│   ├── net-netr/           # Memecoin-NFT token deployment
│   ├── net-feeds/          # Topic-based message feeds
│   ├── net-relay/          # Transaction relay service
│   └── net-cli/            # Command-line interface
├── examples/               # Example applications
│   └── basic-app/          # Next.js example with chat + storage
├── plugins/                # Claude Code plugin
│   └── net-protocol/       # AI assistance for Net development
└── docs/                   # Additional documentation
```

## Package Dependency Graph

```
@net-protocol/core          ← Base package (no internal deps)
       ↓
@net-protocol/storage       ← Depends on core
       ↓
@net-protocol/netr          ← Depends on core + storage

@net-protocol/feeds         ← Depends on core
@net-protocol/relay         ← Depends on core
@net-protocol/cli           ← Depends on core, storage, netr, relay
```

**Key insight:** Changes to `core` may affect all other packages. Always run full test suite after modifying core.

## Contract Addresses

All contracts use the same address across all supported EVM chains:

| Contract | Address |
|----------|---------|
| Net (Messaging) | `0x00000000B24D62781dB359b07880a105cD0b64e6` |
| Storage | `0x00000000DB40fcB9f4466330982372e27Fd7Bbf5` |
| Netr/Banger | Chain-specific (see `packages/net-netr/src/chainConfig.ts`) |

## Supported Chains

**Messages & Storage:** Base (8453), Ethereum (1), Degen (666666666), Ham (5112), Ink (57073), Unichain (130), HyperEVM (999), Plasma (9745), Monad (143), Base Sepolia (84532), Sepolia (11155111)

**Token Deployment (Netr):** Base (8453), Plasma (9745), Monad (143), HyperEVM (999)

## Code Patterns

### Package Structure

Each package follows this structure:

```
packages/net-{name}/
├── src/
│   ├── index.ts           # Public exports (IMPORTANT: all public API here)
│   ├── types.ts           # TypeScript types
│   ├── constants.ts       # ABIs, addresses, config values
│   ├── chainConfig.ts     # Chain-specific configuration
│   ├── client/            # Non-React client classes
│   │   ├── index.ts       # Re-exports
│   │   └── {Name}Client.ts
│   ├── hooks/             # React hooks (wagmi-based)
│   │   ├── index.ts       # Re-exports
│   │   └── use{Feature}.ts
│   ├── utils/             # Utility functions
│   └── __tests__/         # Tests (vitest)
├── package.json
├── tsconfig.json
└── README.md
```

### React Hooks Pattern

Hooks use wagmi's `useReadContract` and return `{ data, isLoading, error }`:

```typescript
import { useReadContract } from "wagmi";
import { useMemo } from "react";

export function useNetMessages(params: UseNetMessagesOptions) {
  const readContractArgs = useMemo(
    () => getNetMessagesReadConfig({
      chainId: params.chainId,
      filter: params.filter,
    }),
    [params.chainId, params.filter]
  );

  const { data, isLoading, error } = useReadContract({
    ...readContractArgs,
    query: { enabled: params.enabled },
  });

  const messages = useMemo(() => (data as NetMessage[]) ?? [], [data]);

  return { messages, isLoading, error: error as Error | undefined };
}
```

### Client Pattern

Clients use viem's `PublicClient` for read operations:

```typescript
import { getPublicClient } from "../chainConfig";

export class NetClient {
  private chainId: number;
  private publicClient: PublicClient;

  constructor(options: NetClientOptions) {
    this.chainId = options.chainId;
    this.publicClient = getPublicClient({
      chainId: options.chainId,
      rpcUrl: options.overrides?.rpcUrls,
    });
  }

  async getMessages(params: GetMessagesParams): Promise<NetMessage[]> {
    // Use this.publicClient.readContract(...)
  }
}
```

### Chain Configuration Pattern

Each package that needs chain config has a `chainConfig.ts`:

```typescript
const CHAIN_CONFIG: Record<number, ChainConfig> = {
  8453: {  // Base
    name: "Base",
    rpcUrls: ["https://base-mainnet.public.blastapi.io"],
    contractAddress: "0x...",
  },
  // ... more chains
};

export function getChainRpcUrls(params: { chainId: number; rpcUrl?: string }): string[] {
  // Priority: per-call override > global override > defaults
}
```

### CLI Command Pattern

Commands use the `commander` library:

```typescript
// src/commands/{name}/index.ts
import { Command } from "commander";
import { parseCommonOptions } from "../../cli/shared";

export function registerMyCommand(program: Command): void {
  const myCommand = new Command("mycommand")
    .description("Description here")
    .requiredOption("--param <value>", "Parameter description")
    .option("--chain-id <id>", "Chain ID")
    .option("--private-key <key>", "Private key")
    .option("--encode-only", "Output transaction JSON without executing")
    .action(async (options) => {
      if (options.encodeOnly) {
        // Handle encode-only mode
        return;
      }
      const commonOptions = parseCommonOptions(options);
      // Execute command
    });

  program.addCommand(myCommand);
}
```

Register in `src/cli/index.ts`:
```typescript
import { registerMyCommand } from "../commands/mycommand";
registerMyCommand(program);
```

## Common Tasks

### Adding a New Chain

1. Add chain config to `packages/net-core/src/chainConfig.ts`
2. If chain supports storage, add to `packages/net-storage/src/chainConfig.ts`
3. If chain supports Netr tokens, add to `packages/net-netr/src/chainConfig.ts`
4. Update tests and documentation

### Adding a New Hook

1. Create `packages/net-{pkg}/src/hooks/use{Feature}.ts`
2. Export from `packages/net-{pkg}/src/hooks/index.ts`
3. Export from `packages/net-{pkg}/src/index.ts`
4. Add tests in `packages/net-{pkg}/src/__tests__/`
5. Update README with usage example

### Adding a New Client Method

1. Add method to `packages/net-{pkg}/src/client/{Name}Client.ts`
2. Add types to `packages/net-{pkg}/src/types.ts`
3. Export types from `packages/net-{pkg}/src/index.ts`
4. Add tests
5. Update README

### Adding a New CLI Command

1. Create `packages/net-cli/src/commands/{name}/` directory
2. Create `index.ts` with `register{Name}Command` function
3. Import and register in `packages/net-cli/src/cli/index.ts`
4. Add tests in `packages/net-cli/src/__tests__/commands/{name}/`
5. Update CLI README

## Testing

```bash
# Run all tests
yarn test

# Run tests for specific package
yarn workspace @net-protocol/core test
yarn workspace @net-protocol/cli test

# Run specific test file
yarn workspace @net-protocol/core test src/__tests__/NetClient.test.ts
```

Tests use **vitest** with mocked viem clients. See existing `__tests__/test-utils.ts` files for mock patterns.

## Type Checking

```bash
# Type check all packages
yarn typecheck

# Type check specific package
yarn workspace @net-protocol/core typecheck
```

## Building

```bash
# Build all packages (respects dependency order)
yarn build

# Build specific package
yarn workspace @net-protocol/core build
```

Packages use **tsup** for building. Output goes to `dist/` with both ESM and CJS formats.

## Coding Guidelines

### Function Signatures

Prefer object parameters for functions with 2+ parameters:

```typescript
// Good - extensible
function getMessages({ chainId, filter, limit }: GetMessagesParams) { }

// Avoid - hard to extend
function getMessages(chainId: number, filter: Filter, limit: number) { }
```

### Error Handling

- Throw descriptive errors for invalid inputs
- Use `exitWithError()` in CLI commands for user-friendly error messages
- Don't swallow errors silently

### Exports

- Export all public API from `src/index.ts`
- Use explicit named exports (not `export *`)
- Export types separately: `export type { ... }`

### ABIs

- Store ABIs in `constants.ts` as `const` with `as const` assertion
- Only include necessary ABI fragments, not full contract ABI

## Quick Reference

| Looking for... | Location |
|----------------|----------|
| Core messaging client | `packages/net-core/src/client/NetClient.ts` |
| Storage client | `packages/net-storage/src/client/StorageClient.ts` |
| Netr/token client | `packages/net-netr/src/client/NetrClient.ts` |
| React hooks | `packages/net-{pkg}/src/hooks/` |
| CLI entry point | `packages/net-cli/src/cli/index.ts` |
| CLI commands | `packages/net-cli/src/commands/` |
| Chain configuration | `packages/net-core/src/chainConfig.ts` |
| Contract ABIs | `packages/net-{pkg}/src/constants.ts` |
| Type definitions | `packages/net-{pkg}/src/types.ts` |
