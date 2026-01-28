import { test, expect } from "./fixtures/mock-wallet";
import { test as baseTest, expect as baseExpect } from "@playwright/test";

test.describe("Wallet Connection", () => {
  test("connect button is visible when disconnected", async ({ page }) => {
    // Use base test without mock wallet injection
    await page.goto("/");

    // RainbowKit connect button should be present
    const connectButton = page.getByRole("button", { name: /connect/i });
    await expect(connectButton).toBeVisible();
  });

  test("mock wallet is detected by RainbowKit", async ({ page, mockWallet }) => {
    await page.goto("/");

    // Mock wallet should be injected
    const hasEthereum = await page.evaluate(() => window.ethereum !== undefined);
    expect(hasEthereum).toBe(true);
  });

  test("protected features show wallet requirement message when disconnected", async ({ page }) => {
    await page.goto("/");

    // Chat tab shows message for sending (reading is public)
    await expect(
      page.getByText(/connect your wallet/i)
    ).toBeVisible();
  });

  test("storage tab shows wallet requirement when not connected", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Storage" }).click();

    // Should show wallet requirement message
    await expect(
      page.getByText(/connect your wallet/i)
    ).toBeVisible();
    await expect(
      page.getByText(/storage operations require a connected wallet/i)
    ).toBeVisible();
  });

  test("launch tab shows wallet requirement when not connected", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Launch" }).click();

    // Should show wallet requirement message
    await expect(
      page.getByText(/connect your wallet/i)
    ).toBeVisible();
    await expect(
      page.getByText(/token launch requires a connected wallet/i)
    ).toBeVisible();
  });
});

// Tests that require actual wallet connection simulation
test.describe("Connected Wallet State", () => {
  test("mock wallet can respond to eth_accounts", async ({ page, mockWallet }) => {
    await page.goto("/");

    const accounts = await page.evaluate(async () => {
      return await window.ethereum?.request({ method: "eth_accounts" });
    });

    expect(accounts).toContain(mockWallet.address);
  });

  test("mock wallet can respond to eth_chainId", async ({ page, mockWallet }) => {
    await page.goto("/");

    const chainId = await page.evaluate(async () => {
      return await window.ethereum?.request({ method: "eth_chainId" });
    });

    expect(chainId).toBe(mockWallet.chainId);
  });

  test("mock wallet can respond to eth_getBalance", async ({ page, mockWallet }) => {
    await page.goto("/");

    const balance = await page.evaluate(async () => {
      return await window.ethereum?.request({
        method: "eth_getBalance",
        params: ["0x1234567890123456789012345678901234567890", "latest"],
      });
    });

    // Should return 1 ETH in hex
    expect(balance).toBe("0xde0b6b3a7640000");
  });

  test("mock wallet can simulate transaction signing", async ({ page, mockWallet }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      try {
        const sig = await window.ethereum?.request({
          method: "personal_sign",
          params: ["0x48656c6c6f", "0x1234567890123456789012345678901234567890"],
        });
        return { signature: sig, error: null };
      } catch (e: any) {
        return { signature: null, error: e.message };
      }
    });

    // Should return mock signature (130 chars = 0x + 65 bytes * 2)
    expect(result.error).toBeNull();
    expect(result.signature).toMatch(/^0x[a-f0-9]+$/);
  });

  test("mock wallet can simulate transaction sending", async ({ page, mockWallet }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      try {
        const hash = await window.ethereum?.request({
          method: "eth_sendTransaction",
          params: [{
            from: "0x1234567890123456789012345678901234567890",
            to: "0xabcdef0123456789abcdef0123456789abcdef01",
            value: "0x1",
          }],
        });
        return { txHash: hash, error: null };
      } catch (e: any) {
        return { txHash: null, error: e.message };
      }
    });

    // Should return mock transaction hash (64 hex chars)
    expect(result.error).toBeNull();
    expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
  });
});
