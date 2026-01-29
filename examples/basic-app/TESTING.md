# Testing Guide for Net Protocol Example App

This guide covers how to run tests and add new tests to the basic-app example.

## Test Commands

```bash
# Unit tests (Vitest)
yarn test              # Run in watch mode
yarn test:run          # Run once and exit

# E2E tests (Playwright)
yarn test:e2e          # Run headless
yarn test:e2e:headed   # Run with browser visible
yarn test:e2e:ui       # Run with Playwright UI
```

## Directory Structure

```
examples/basic-app/
├── e2e/                        # E2E tests (Playwright)
│   ├── fixtures/
│   │   └── mock-wallet.ts      # Mock Ethereum wallet fixture
│   ├── smoke.spec.ts           # Basic smoke tests
│   ├── wallet.spec.ts          # Wallet connection tests
│   ├── chat.spec.ts            # Chat tab tests
│   ├── storage.spec.ts         # Storage tab tests
│   └── launch.spec.ts          # Token launch tests
├── src/__tests__/              # Unit tests and test utilities
│   ├── setup.ts                # Vitest global setup
│   ├── test-utils/
│   │   ├── index.ts            # Test utility exports
│   │   ├── mock-wagmi-config.ts # Mock wagmi configuration
│   │   ├── test-providers.tsx  # Provider wrappers for tests
│   │   └── render-with-providers.tsx # Custom render functions
│   └── mocks/msw/
│       ├── server.ts           # MSW server setup
│       └── handlers/
│           ├── index.ts        # Handler exports
│           └── rpc-handlers.ts # Blockchain RPC mocks
├── playwright.config.ts        # Playwright configuration
└── vitest.config.ts            # Vitest configuration
```

## Running E2E Tests Locally

### Headless Mode (Default)

```bash
cd examples/basic-app
yarn test:e2e
```

### Headed Mode (See the Browser)

```bash
yarn test:e2e:headed
```

### Interactive UI Mode

```bash
yarn test:e2e:ui
```

This opens Playwright's Test UI where you can:
- See all tests in a tree view
- Run individual tests
- Watch tests execute in the browser
- Debug with time-travel snapshots

### Running Specific Tests

```bash
# Run a specific test file
yarn test:e2e smoke.spec.ts

# Run tests matching a pattern
yarn test:e2e --grep "wallet"

# Run in debug mode
yarn test:e2e --debug
```

## Mock Wallet

The mock wallet fixture (`e2e/fixtures/mock-wallet.ts`) provides a simulated Ethereum wallet for E2E tests without requiring a real wallet extension.

### Usage

```typescript
import { test, expect } from "./fixtures/mock-wallet";

test("my test with mock wallet", async ({ page, mockWallet }) => {
  await page.goto("/");

  // mockWallet provides:
  // - mockWallet.address: "0x1234567890123456789012345678901234567890"
  // - mockWallet.chainId: "0x2105" (Base mainnet)
});
```

### Supported RPC Methods

The mock wallet responds to these Ethereum RPC methods:

| Method | Response |
|--------|----------|
| `eth_requestAccounts` | Mock address |
| `eth_accounts` | Mock address |
| `eth_chainId` | `0x2105` (Base) |
| `eth_getBalance` | 1 ETH |
| `personal_sign` | Mock signature |
| `eth_signTypedData_v4` | Mock signature |
| `eth_sendTransaction` | Mock tx hash |
| `eth_estimateGas` | 21000 gas |
| `eth_getTransactionReceipt` | Success receipt |

### Custom Wallet Configuration

```typescript
import { injectMockWallet, MOCK_ADDRESS } from "./fixtures/mock-wallet";

test("custom wallet config", async ({ page }) => {
  await injectMockWallet(page, {
    chainId: "0x1", // Ethereum mainnet
    accounts: ["0xCustomAddress..."],
  });

  await page.goto("/");
});
```

### Connected Wallet Testing

The app supports E2E test mode via the `connectedWallet` fixture. When enabled:
1. Sets `window.__E2E_TEST_MODE__ = true` before page load
2. App detects test mode and uses wagmi's mock connector instead of RainbowKit's default connectors
3. Auto-connects the mock wallet with the test address

```typescript
import { test, expect } from "./fixtures/mock-wallet";

test("test with connected wallet", async ({ connectedWallet, page }) => {
  // Wallet is already connected - page navigated to "/" automatically
  // connectedWallet.address is "0x1234567890123456789012345678901234567890"

  await page.getByRole("button", { name: "Storage" }).click();
  // Storage tab now shows form (not wallet requirement message)
});
```

The `connectedWallet` fixture:
- Injects mock `window.ethereum` for RPC calls
- Enables test mode in the app via `window.__E2E_TEST_MODE__`
- Navigates to "/" and waits for wallet to auto-connect

## RPC Mocking with MSW

Unit tests use MSW (Mock Service Worker) to mock blockchain RPC calls.

### How It Works

1. **Setup** (`src/__tests__/setup.ts`): Starts MSW server before tests
2. **Handlers** (`src/__tests__/mocks/msw/handlers/rpc-handlers.ts`): Define mock responses
3. **Test Providers** (`src/__tests__/test-utils/test-providers.tsx`): Wrap components with mocked providers

### Adding New RPC Mocks

Edit `src/__tests__/mocks/msw/handlers/rpc-handlers.ts`:

```typescript
case "eth_newMethod":
  return createRpcResponse("your-mock-data", id);
```

### Using Test Utilities

```typescript
import { renderWithProviders, renderHookWithProviders } from "@/__tests__/test-utils";

// Render a component with all providers
const { getByText } = renderWithProviders(<MyComponent />);

// Test a custom hook
const { result } = renderHookWithProviders(() => useMyHook());
```

## Adding New E2E Tests

### 1. Create Test File

Create a new file in `e2e/` with the `.spec.ts` extension:

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from "./fixtures/mock-wallet";

test.describe("My Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("does something", async ({ page, mockWallet }) => {
    // Your test code
  });
});
```

### 2. Use Page Object Pattern (Optional)

For complex pages, create page objects:

```typescript
// e2e/pages/chat-page.ts
export class ChatPage {
  constructor(private page: Page) {}

  async selectTopic(topic: string) {
    await this.page.locator("#topic-select").selectOption(topic);
  }

  async sendMessage(message: string) {
    await this.page.getByRole("textbox").fill(message);
    await this.page.getByRole("button", { name: /send/i }).click();
  }
}
```

### 3. Test Patterns

```typescript
// Wait for network idle
await page.goto("/", { waitUntil: "networkidle" });

// Wait for specific element
await expect(page.getByText("Loading")).toBeHidden();

// Interact with forms
await page.getByLabel("Token Name").fill("My Token");
await page.getByRole("button", { name: "Submit" }).click();

// Assert visibility
await expect(page.getByText("Success")).toBeVisible();

// Check disabled state
await expect(page.getByRole("button")).toBeDisabled();
```

## Debugging Failed Tests

### View Test Traces

When tests fail, Playwright saves traces. View them with:

```bash
npx playwright show-report
```

### Debug Mode

Run a specific test in debug mode:

```bash
yarn test:e2e --debug my-test.spec.ts
```

### Screenshots

Playwright automatically captures screenshots on failure. Find them in:
- `playwright-report/` directory
- CI artifacts (when running in GitHub Actions)

### Console Logs

Add logging to your tests:

```typescript
test("my test", async ({ page }) => {
  page.on("console", (msg) => console.log("Browser:", msg.text()));
  await page.goto("/");
});
```

## CI/CD

Tests run automatically on GitHub Actions:

1. **Unit tests**: Run first on every push/PR
2. **E2E tests**: Run after unit tests pass
3. **Artifacts**: Playwright reports uploaded on failure

### Local CI Simulation

```bash
# Run full test suite like CI
yarn install --immutable
yarn build
yarn test:all                    # Unit tests
cd examples/basic-app
npx playwright install chromium
yarn test:e2e                    # E2E tests
```

## Troubleshooting

### Tests Timeout on First Run

The dev server takes time to start. Playwright waits up to 120 seconds. If tests still timeout:

```bash
# Start dev server manually first
yarn dev

# Then run tests with existing server
yarn test:e2e
```

### Mock Wallet Not Working

Ensure you're using the correct test import:

```typescript
// Correct - uses mock wallet fixture
import { test, expect } from "./fixtures/mock-wallet";

// Wrong - no mock wallet
import { test, expect } from "@playwright/test";
```

### MSW Handlers Not Intercepting

Check that:
1. The URL pattern matches your actual API calls
2. MSW server is started in setup.ts
3. You're running unit tests, not E2E tests (MSW is for unit tests)

### React Query Cache Issues

Tests use fresh QueryClient with these settings:
- `retry: false` - No retries on failure
- `gcTime: 0` - Immediate garbage collection
- `staleTime: 0` - Data immediately stale

This ensures tests don't share cached data.
