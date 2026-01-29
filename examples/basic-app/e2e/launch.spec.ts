import { test, expect } from "./fixtures/mock-wallet";

test.describe("Launch Tab - Disconnected State", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Launch" }).click();
  });

  test("shows wallet requirement message", async ({ page }) => {
    await expect(page.getByText(/connect your wallet/i)).toBeVisible();
    await expect(
      page.getByText(/token launch requires a connected wallet on base/i)
    ).toBeVisible();
  });

  test("does not show launch form when disconnected", async ({ page }) => {
    // Launch form fields should not be visible
    await expect(page.getByLabel(/token name/i)).not.toBeVisible();
    await expect(page.getByLabel(/token symbol/i)).not.toBeVisible();
    await expect(page.getByLabel(/initial buy amount/i)).not.toBeVisible();
  });
});

test.describe("Launch Tab - UI Structure", () => {
  test("can navigate to launch tab", async ({ page }) => {
    await page.goto("/");

    const launchTab = page.getByRole("button", { name: "Launch" });
    await expect(launchTab).toBeVisible();
    await launchTab.click();

    // Should show wallet requirement message
    await expect(page.getByText(/connect your wallet/i)).toBeVisible();
  });

  test("launch tab has correct styling when selected", async ({ page }) => {
    await page.goto("/");

    const launchTab = page.getByRole("button", { name: "Launch" });
    await launchTab.click();

    // Launch tab should have active styling
    await expect(launchTab).toHaveClass(/border-blue-500/);
  });

  test("other tabs maintain correct inactive styling", async ({ page }) => {
    await page.goto("/");

    const launchTab = page.getByRole("button", { name: "Launch" });
    const chatTab = page.getByRole("button", { name: "Chat" });
    const storageTab = page.getByRole("button", { name: "Storage" });

    await launchTab.click();

    // Other tabs should have transparent border (inactive)
    await expect(chatTab).toHaveClass(/border-transparent/);
    await expect(storageTab).toHaveClass(/border-transparent/);
  });
});

/**
 * Connected State Tests
 * Uses connectedWallet fixture which enables test mode with auto-connected mock wallet
 */
test.describe("Launch Tab - Connected State", () => {
  test("form displays all required fields", async ({ connectedWallet, page }) => {
    await page.getByRole("button", { name: "Launch" }).click();

    // Wait for form to render
    await expect(page.getByRole("heading", { name: /launch token/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("My Token")).toBeVisible();
    await expect(page.getByPlaceholder("MTK")).toBeVisible();
    await expect(page.getByRole("spinbutton")).toBeVisible();
    await expect(page.getByRole("button", { name: /deploy token/i })).toBeVisible();
  });

  test("symbol input auto-uppercases", async ({ connectedWallet, page }) => {
    await page.getByRole("button", { name: "Launch" }).click();

    // Wait for form to be visible (use placeholder since labels aren't properly associated)
    const symbolInput = page.getByPlaceholder("MTK");
    await expect(symbolInput).toBeVisible({ timeout: 10000 });
    await symbolInput.fill("test");
    await expect(symbolInput).toHaveValue("TEST");
  });

  test("deploy button disabled when form empty", async ({ connectedWallet, page }) => {
    await page.getByRole("button", { name: "Launch" }).click();

    const deployButton = page.getByRole("button", { name: /deploy token/i });
    await expect(deployButton).toBeDisabled();
  });

  test("shows minimum ETH requirement", async ({ connectedWallet, page }) => {
    await page.getByRole("button", { name: "Launch" }).click();

    await expect(page.getByText(/minimum.*0\.0001.*eth/i)).toBeVisible();
  });

  test("shows info about token deployment", async ({ connectedWallet, page }) => {
    await page.getByRole("button", { name: "Launch" }).click();

    await expect(page.getByText(/token will be deployed on base/i)).toBeVisible();
    await expect(page.getByText(/liquidity is automatically locked/i)).toBeVisible();
  });

  test("initial buy amount has default value", async ({ connectedWallet, page }) => {
    await page.getByRole("button", { name: "Launch" }).click();

    // Wait for form to be visible (use spinbutton role for number input)
    const buyAmountInput = page.getByRole("spinbutton");
    await expect(buyAmountInput).toBeVisible({ timeout: 10000 });
    await expect(buyAmountInput).toHaveValue("0.001");
  });
});
