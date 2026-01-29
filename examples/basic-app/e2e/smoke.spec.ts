import { test, expect } from "./fixtures/mock-wallet";

test.describe("Smoke Tests", () => {
  test("page loads with correct title", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Net Protocol/i);
  });

  test("header displays app title and description", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Net Protocol Example App/i })).toBeVisible();
    await expect(page.getByText(/Learn how to build with Net Protocol/i)).toBeVisible();
  });

  test("tab navigation is visible", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Chat" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Storage" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Launch" })).toBeVisible();
  });

  test("default tab is Chat", async ({ page }) => {
    await page.goto("/");

    // Chat tab should be active (has border color indicating selection)
    const chatTab = page.getByRole("button", { name: "Chat" });
    await expect(chatTab).toHaveClass(/border-blue-500/);

    // Chat content should be visible
    await expect(page.getByRole("heading", { name: "Chat" })).toBeVisible();
  });

  test("mock wallet injects correctly", async ({ page, mockWallet }) => {
    await page.goto("/");

    // Verify mock wallet is available
    const hasEthereum = await page.evaluate(() => {
      return typeof window.ethereum !== "undefined";
    });
    expect(hasEthereum).toBe(true);

    // Verify mock wallet properties
    const isMetaMask = await page.evaluate(() => {
      return window.ethereum?.isMetaMask;
    });
    expect(isMetaMask).toBe(true);

    expect(mockWallet.address).toBe("0x1234567890123456789012345678901234567890");
    expect(mockWallet.chainId).toBe("0x2105");
  });

  test("can switch between tabs", async ({ page }) => {
    await page.goto("/");

    // Switch to Storage tab - verify tab is active (shows wallet requirement when disconnected)
    const storageTab = page.getByRole("button", { name: "Storage" });
    await storageTab.click();
    await expect(storageTab).toHaveClass(/border-blue-500/);
    await expect(page.getByText(/storage operations require/i)).toBeVisible();

    // Switch to Launch tab - verify tab is active
    const launchTab = page.getByRole("button", { name: "Launch" });
    await launchTab.click();
    await expect(launchTab).toHaveClass(/border-blue-500/);
    await expect(page.getByText(/token launch requires/i)).toBeVisible();

    // Switch back to Chat tab
    const chatTab = page.getByRole("button", { name: "Chat" });
    await chatTab.click();
    await expect(chatTab).toHaveClass(/border-blue-500/);
    await expect(page.getByRole("heading", { name: "Chat" })).toBeVisible();
  });
});
