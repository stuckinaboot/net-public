import { test, expect } from "./fixtures/mock-wallet";

/**
 * Screenshot tests for PR preview comments.
 * These tests capture screenshots of key UI states for visual review.
 */
test.describe("PR Screenshots", () => {
  test("capture home page - disconnected", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('button:has-text("Chat")', { timeout: 30000 });

    // Wait for page to stabilize
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "screenshots/01-home-disconnected.png",
      fullPage: true,
    });
  });

  test("capture home page - connected wallet", async ({ connectedWallet, page }) => {
    // connectedWallet fixture already navigates and connects
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "screenshots/02-home-connected.png",
      fullPage: true,
    });
  });

  test("capture chat tab", async ({ connectedWallet, page }) => {
    await page.click('button:has-text("Chat")');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "screenshots/03-chat-tab.png",
      fullPage: true,
    });
  });

  test("capture storage tab", async ({ connectedWallet, page }) => {
    await page.click('button:has-text("Storage")');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "screenshots/04-storage-tab.png",
      fullPage: true,
    });
  });

  test("capture launch tab", async ({ connectedWallet, page }) => {
    // Check if Launch tab exists
    const launchTab = page.locator('button:has-text("Launch")');
    if (await launchTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await launchTab.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: "screenshots/05-launch-tab.png",
        fullPage: true,
      });
    }
  });
});
