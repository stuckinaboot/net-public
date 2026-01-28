# Claude Code Instructions for Net Public

## Package Manager

**IMPORTANT:** This project uses **yarn** (not npm or pnpm).

```bash
yarn install
yarn add <package>
yarn add -D <dev-package>
```

## Repository Structure

```
net-public/
├── examples/
│   └── basic-app/          # Example Next.js app with full E2E testing
├── packages/
│   ├── net-core/           # Core client library
│   ├── net-feeds/          # Feed/post utilities
│   ├── net-cli/            # CLI tools
│   ├── net-netr/           # Netr utilities
│   ├── net-relay/          # Relay client
│   └── net-storage/        # Storage utilities
└── .github/workflows/      # CI/CD
```

## Running Tests

### All Packages (from repo root)

```bash
# Run tests in a specific package
cd packages/net-core && yarn test

# Run tests in basic-app
cd examples/basic-app && yarn test:run
```

### Package Test Commands

| Package | Unit Tests | E2E Tests |
|---------|------------|-----------|
| `examples/basic-app` | `yarn test:run` | `yarn test:e2e` |
| `packages/net-core` | `yarn test` | - |
| `packages/net-feeds` | `yarn test` | - |
| `packages/net-cli` | `yarn test` | - |
| `packages/net-netr` | `yarn test` | - |
| `packages/net-relay` | `yarn test` | - |
| `packages/net-storage` | `yarn test` | - |

### E2E Tests (basic-app only)

```bash
cd examples/basic-app

yarn test:e2e          # Headless
yarn test:e2e:headed   # With browser visible
yarn test:e2e:ui       # Interactive Playwright UI
```

### VCR Recording (Polly.js)

For packages with external API calls (basic-app, net-core, net-feeds):

```bash
# Record new API responses
POLLY_RECORD=true yarn test

# Replay from recordings (default, CI-safe)
yarn test
```

Recordings are stored in `src/__tests__/polly/recordings/` and are NOT published to npm.

## Test Infrastructure

### Unit Tests (Vitest)
- All packages use Vitest
- Config: `vitest.config.ts` in each package

### E2E Tests (Playwright) - basic-app only
- Mock wallet fixture for wallet-connected testing
- Config: `playwright.config.ts`
- Tests: `e2e/*.spec.ts`

### API Mocking
- **MSW**: Internal API mocking (`src/__tests__/mocks/msw/`)
- **Polly.js**: External API VCR recording (`src/__tests__/polly/`)

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from "vitest";

describe("myFunction", () => {
  it("should work", () => {
    expect(myFunction()).toBe(expected);
  });
});
```

### VCR Test Example (with Polly.js)

```typescript
import { describe, it, expect } from "vitest";
import { usePollyRecording } from "./polly/setup";

describe("External API", () => {
  usePollyRecording("my-api-test");

  it("should fetch data", async () => {
    const response = await fetch("https://api.example.com/data");
    const data = await response.json();
    expect(data).toBeDefined();
  });
});
```

### E2E Test Example (basic-app)

```typescript
import { test, expect } from "./fixtures/mock-wallet";

test("feature works with wallet", async ({ connectedWallet, page }) => {
  await page.getByRole("button", { name: "Action" }).click();
  await expect(page.getByText("Success")).toBeVisible();
});
```

## Key Directories

| Purpose | Location |
|---------|----------|
| E2E tests | `examples/basic-app/e2e/` |
| Mock wallet | `examples/basic-app/e2e/fixtures/mock-wallet.ts` |
| MSW handlers | `examples/basic-app/src/__tests__/mocks/msw/` |
| VCR recordings | `*/src/__tests__/polly/recordings/` |
| Test utilities | `examples/basic-app/src/__tests__/test-utils/` |

## CI/CD

Tests run automatically via GitHub Actions (`.github/workflows/test.yml`):
1. Unit tests run for all packages
2. E2E tests run for basic-app
3. Playwright reports uploaded on failure

## Detailed Documentation

See `examples/basic-app/TESTING.md` for comprehensive testing guide including:
- Mock wallet configuration
- RPC mocking patterns
- Debugging failed tests
- Adding new E2E tests
