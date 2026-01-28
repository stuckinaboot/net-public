import { test as base, Page } from "@playwright/test";

export const MOCK_ADDRESS = "0x1234567890123456789012345678901234567890";
export const MOCK_CHAIN_ID = "0x2105"; // Base mainnet (8453)

interface MockWalletOptions {
  chainId?: string;
  accounts?: string[];
}

/**
 * Mock window.ethereum provider for E2E tests.
 * Simulates a connected wallet without requiring real wallet extensions.
 */
export function createMockEthereum(
  chainId: string = MOCK_CHAIN_ID,
  accounts: string[] = [MOCK_ADDRESS]
) {
  return {
    isMetaMask: true,
    isConnected: () => true,
    selectedAddress: accounts[0] || null,
    chainId,
    networkVersion: String(parseInt(chainId, 16)),

    request: async ({ method, params }: { method: string; params?: unknown[] }) => {
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return accounts;
        case "eth_chainId":
          return chainId;
        case "net_version":
          return String(parseInt(chainId, 16));
        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain":
          return null;
        case "personal_sign":
          return "0x" + "ab".repeat(65);
        case "eth_signTypedData_v4":
          return "0x" + "cd".repeat(65);
        case "eth_getBalance":
          return "0xde0b6b3a7640000"; // 1 ETH
        case "eth_call":
          return "0x";
        case "eth_estimateGas":
          return "0x5208"; // 21000 gas
        case "eth_gasPrice":
          return "0x3b9aca00"; // 1 gwei
        case "eth_sendTransaction":
          return "0x" + "ef".repeat(32);
        case "eth_blockNumber":
          return "0x1000000";
        case "eth_getTransactionReceipt":
          return {
            transactionHash: "0x" + "ef".repeat(32),
            blockNumber: "0x1000000",
            blockHash: "0x" + "11".repeat(32),
            status: "0x1",
            gasUsed: "0x5208",
          };
        default:
          console.log(`Mock wallet: Unhandled method ${method}`, params);
          throw new Error(`Method ${method} not implemented in mock wallet`);
      }
    },

    on: () => {},
    removeListener: () => {},
    removeAllListeners: () => {},
    enable: async () => accounts,
    sendAsync: (
      payload: { method: string; params?: unknown[] },
      callback: (err: Error | null, result?: { result: unknown }) => void
    ) => {
      const self = createMockEthereum(chainId, accounts);
      self
        .request(payload)
        .then((result) => callback(null, { result }))
        .catch((err) => callback(err));
    },
  };
}

/**
 * Inject mock wallet into page before navigation.
 * Note: Code is duplicated from createMockEthereum because Playwright's
 * addInitScript requires serializable functions (no external references).
 */
export async function injectMockWallet(page: Page, options: MockWalletOptions = {}): Promise<void> {
  const { chainId = MOCK_CHAIN_ID, accounts = [MOCK_ADDRESS] } = options;

  await page.addInitScript(
    ({ chainId, accounts }) => {
      // Event listeners storage
      const listeners: Record<string, Function[]> = {};

      const mockEthereum = {
        isMetaMask: true,
        isConnected: () => true,
        selectedAddress: accounts[0] || null,
        chainId,
        networkVersion: String(parseInt(chainId, 16)),
        _metamask: {
          isUnlocked: () => Promise.resolve(true),
        },

        request: async ({ method, params }: { method: string; params?: unknown[] }) => {
          console.log(`Mock wallet: ${method}`, params);
          switch (method) {
            case "eth_requestAccounts":
              // Emit connect event
              setTimeout(() => {
                listeners["connect"]?.forEach((fn) => fn({ chainId }));
                listeners["accountsChanged"]?.forEach((fn) => fn(accounts));
              }, 100);
              return accounts;
            case "eth_accounts":
              return accounts;
            case "eth_chainId":
              return chainId;
            case "net_version":
              return String(parseInt(chainId, 16));
            case "wallet_switchEthereumChain":
            case "wallet_addEthereumChain":
              return null;
            case "wallet_requestPermissions":
              return [{ parentCapability: "eth_accounts" }];
            case "wallet_getPermissions":
              return [{ parentCapability: "eth_accounts" }];
            case "personal_sign":
              return "0x" + "ab".repeat(65);
            case "eth_signTypedData_v4":
              return "0x" + "cd".repeat(65);
            case "eth_getBalance":
              return "0xde0b6b3a7640000";
            case "eth_call":
              return "0x";
            case "eth_estimateGas":
              return "0x5208";
            case "eth_gasPrice":
              return "0x3b9aca00";
            case "eth_sendTransaction":
              return "0x" + "ef".repeat(32);
            case "eth_blockNumber":
              return "0x1000000";
            case "eth_getTransactionReceipt":
              return {
                transactionHash: "0x" + "ef".repeat(32),
                blockNumber: "0x1000000",
                blockHash: "0x" + "11".repeat(32),
                status: "0x1",
                gasUsed: "0x5208",
              };
            default:
              console.log(`Mock wallet: Unhandled method ${method}`, params);
              return null;
          }
        },

        on: (event: string, fn: Function) => {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(fn);
        },
        removeListener: (event: string, fn: Function) => {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter((f) => f !== fn);
          }
        },
        removeAllListeners: (event?: string) => {
          if (event) {
            delete listeners[event];
          } else {
            Object.keys(listeners).forEach((k) => delete listeners[k]);
          }
        },
        emit: (event: string, ...args: unknown[]) => {
          listeners[event]?.forEach((fn) => fn(...args));
        },
        enable: async () => accounts,
      };

      Object.defineProperty(window, "ethereum", {
        value: mockEthereum,
        writable: false,
        configurable: false,
      });

      // EIP-6963: Announce the provider
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: Object.freeze({
            info: {
              uuid: "mock-wallet-uuid",
              name: "Mock Wallet",
              icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
              rdns: "io.mock.wallet",
            },
            provider: mockEthereum,
          }),
        })
      );
    },
    { chainId, accounts }
  );
}

/**
 * Connect wallet through RainbowKit UI flow.
 * Call this after navigating to a page.
 *
 * NOTE: This function currently has limitations with RainbowKit's MetaMask connector
 * which uses the MetaMask SDK. The mock wallet works for basic window.ethereum
 * interactions but full RainbowKit connection requires app-side configuration
 * to use wagmi's mock connector in test mode.
 */
export async function connectWallet(page: Page): Promise<void> {
  // Click the connect button
  const connectButton = page.locator('button:has-text("Connect Wallet")').first();
  await connectButton.waitFor({ state: "visible", timeout: 10000 });
  await connectButton.click();

  // Wait for RainbowKit modal to appear
  await page.waitForTimeout(1000);

  // Try multiple selectors for wallet options
  const walletSelectors = [
    'button:has-text("Mock Wallet")',
    'button:has-text("MetaMask")',
    'button:has-text("Browser Wallet")',
    'button:has-text("Injected")',
  ];

  for (const selector of walletSelectors) {
    const wallet = page.locator(selector).first();
    if (await wallet.isVisible({ timeout: 1000 }).catch(() => false)) {
      await wallet.click();
      break;
    }
  }

  // Wait for connection - look for truncated address
  const truncatedAddr = `${MOCK_ADDRESS.slice(0, 6)}...${MOCK_ADDRESS.slice(-4)}`.toLowerCase();
  await page.waitForFunction(
    (addr) => document.body.textContent?.toLowerCase().includes(addr),
    truncatedAddr,
    { timeout: 15000 }
  );
}

/**
 * Enable E2E test mode in the app.
 * This sets a flag that makes the app use wagmi's mock connector
 * which auto-connects with the test address.
 */
export async function enableTestMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__E2E_TEST_MODE__ = true;
  });
}

export const test = base.extend<{
  mockWallet: { address: string; chainId: string };
  connectedWallet: { address: string; chainId: string };
}>({
  // Basic mock wallet - injects window.ethereum but doesn't auto-connect
  mockWallet: async ({ page }, use) => {
    await injectMockWallet(page);
    await use({ address: MOCK_ADDRESS, chainId: MOCK_CHAIN_ID });
  },

  // Connected wallet - enables test mode which auto-connects via mock connector
  connectedWallet: async ({ page }, use) => {
    // Set test mode flag BEFORE navigation so app uses mock connector with auto-connect
    await enableTestMode(page);
    await injectMockWallet(page);
    await page.goto("/");

    // Wait for app to render
    await page.waitForSelector('button:has-text("Chat")', { timeout: 30000 });

    // Wait for auto-connect to complete (TestModeAutoConnect component handles this)
    // Check that wallet requirement messages are gone
    await page.waitForFunction(
      () => {
        const text = document.body.textContent || "";
        // In connected state, these messages should not appear
        return !text.includes("connect your wallet") && !text.includes("Please connect your wallet");
      },
      { timeout: 15000 }
    );

    await use({ address: MOCK_ADDRESS, chainId: MOCK_CHAIN_ID });
  },
});

export { expect } from "@playwright/test";
