import { test, expect } from "./fixtures/mock-wallet";

test.describe("Storage Tab - Disconnected State", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Storage" }).click();
  });

  test("shows wallet requirement message", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Storage" })).not.toBeVisible();
    await expect(page.getByText(/connect your wallet/i)).toBeVisible();
    await expect(
      page.getByText(/storage operations require a connected wallet/i)
    ).toBeVisible();
  });

  test("does not show storage controls when disconnected", async ({ page }) => {
    // Upload and list buttons should not be visible
    await expect(page.getByRole("button", { name: "My Content" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Upload New" })).not.toBeVisible();
  });
});

test.describe("Storage Tab - UI Structure", () => {
  // Note: Full storage functionality tests would require simulating
  // a connected wallet state with wagmi

  test("can navigate to storage tab", async ({ page }) => {
    await page.goto("/");

    const storageTab = page.getByRole("button", { name: "Storage" });
    await expect(storageTab).toBeVisible();
    await storageTab.click();

    // Should show wallet requirement (since not connected)
    await expect(page.getByText(/connect your wallet/i)).toBeVisible();
  });

  test("storage tab has correct styling when selected", async ({ page }) => {
    await page.goto("/");

    const storageTab = page.getByRole("button", { name: "Storage" });
    await storageTab.click();

    // Storage tab should now have active styling
    await expect(storageTab).toHaveClass(/border-blue-500/);
  });
});

/**
 * Connected State Tests
 * Uses connectedWallet fixture which enables test mode with auto-connected mock wallet
 */
test.describe("Storage Tab - Connected State", () => {
  test("shows storage UI when connected", async ({ connectedWallet, page }) => {
    await page.getByRole("button", { name: "Storage" }).click();

    await expect(page.getByRole("heading", { name: "Storage" })).toBeVisible();
    await expect(page.getByRole("button", { name: "My Content" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload New" })).toBeVisible();
  });

  test("upload form has required fields", async ({ connectedWallet, page }) => {
    await page.getByRole("button", { name: "Storage" }).click();
    await page.getByRole("button", { name: "Upload New" }).click();

    await expect(page.getByLabel(/key/i)).toBeVisible();
    await expect(page.getByLabel(/content|value/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /store data/i })).toBeVisible();
  });

  test("store button disabled when fields empty", async ({ connectedWallet, page }) => {
    await page.getByRole("button", { name: "Storage" }).click();
    await page.getByRole("button", { name: "Upload New" }).click();

    const storeButton = page.getByRole("button", { name: /store data/i });
    await expect(storeButton).toBeDisabled();
  });

  test("store button enabled when fields filled", async ({ connectedWallet, page }) => {
    await page.getByRole("button", { name: "Storage" }).click();
    await page.getByRole("button", { name: "Upload New" }).click();

    await page.getByLabel(/key/i).fill("test-key");
    await page.getByLabel(/content|value/i).fill("test-value");

    const storeButton = page.getByRole("button", { name: /store data/i });
    await expect(storeButton).toBeEnabled();
  });
});
