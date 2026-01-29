import { test, expect } from "./fixtures/mock-wallet";

/**
 * Screenshot tests for PR preview comments.
 * These tests capture screenshots of key UI states for visual review.
 * Waits for content to load from chain before capturing.
 */
test.describe("PR Screenshots", () => {
  // Helper to wait for loading states to complete
  async function waitForContentLoad(page: import("@playwright/test").Page) {
    // Wait for any "Loading" text to disappear
    await page.waitForFunction(
      () => {
        const text = document.body.textContent || "";
        return !text.includes("Loading");
      },
      { timeout: 15000 }
    ).catch(() => {
      // Timeout is ok - some pages might not have loading states
    });

    // Additional wait for RPC calls to settle
    await page.waitForTimeout(2000);
  }

  test("capture home page - disconnected", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('button:has-text("Chat")', { timeout: 30000 });
    await waitForContentLoad(page);

    await page.screenshot({
      path: "screenshots/01-home-disconnected.png",
      fullPage: true,
    });
  });

  test("capture home page - connected wallet", async ({ connectedWallet, page }) => {
    // connectedWallet fixture already navigates and connects
    await waitForContentLoad(page);

    await page.screenshot({
      path: "screenshots/02-home-connected.png",
      fullPage: true,
    });
  });

  test("capture chat tab", async ({ connectedWallet, page }) => {
    await page.click('button:has-text("Chat")');
    await waitForContentLoad(page);

    await page.screenshot({
      path: "screenshots/03-chat-tab.png",
      fullPage: true,
    });
  });

  test("capture storage tab", async ({ connectedWallet, page }) => {
    await page.click('button:has-text("Storage")');
    await waitForContentLoad(page);

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
      await waitForContentLoad(page);

      await page.screenshot({
        path: "screenshots/05-launch-tab.png",
        fullPage: true,
      });
    }
  });
});
