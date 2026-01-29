import { test, expect } from "./fixtures/mock-wallet";

test.describe("Chat Tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays chat heading and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Chat" })).toBeVisible();
    await expect(
      page.getByText(/messages are stored permanently on the blockchain/i)
    ).toBeVisible();
  });

  test("topic selector is visible", async ({ page }) => {
    await expect(page.getByText("Topic:")).toBeVisible();
    await expect(page.locator("#topic-select")).toBeVisible();
  });

  test("topic selector has options", async ({ page }) => {
    const select = page.locator("#topic-select");
    await expect(select).toBeVisible();

    // Click to open and verify options exist
    const optionCount = await select.locator("option").count();
    expect(optionCount).toBeGreaterThan(0);
  });

  test("can change topic", async ({ page }) => {
    const select = page.locator("#topic-select");

    // Get all option values
    const options = await select.locator("option").allTextContents();

    if (options.length > 1) {
      // Select the second topic
      await select.selectOption({ index: 1 });
      const selectedValue = await select.inputValue();
      expect(selectedValue).toBe(options[1]);
    }
  });

  test("shows wallet requirement message when disconnected", async ({ page }) => {
    // Chat reading is public, but sending requires wallet
    await expect(
      page.getByText(/connect your wallet/i)
    ).toBeVisible();
  });

  test("message list area exists", async ({ page }) => {
    // The message list container should be present
    // Even without messages, the component structure should exist
    const chatContainer = page.locator(".container.mx-auto.h-full.flex.flex-col").first();
    await expect(chatContainer).toBeVisible();
  });
});

test.describe("Chat Tab - Connected State", () => {
  // These tests would require actual wagmi connection simulation
  // For now, we test the structure and disconnected state

  test("displays expected UI structure", async ({ page }) => {
    await page.goto("/");

    // Check for main sections
    await expect(page.getByText("Topic:")).toBeVisible();

    // Verify the flex layout structure
    const mainContainer = page.locator(".flex.flex-col.h-screen");
    await expect(mainContainer).toBeVisible();
  });

  test("topic dropdown interaction works", async ({ page }) => {
    await page.goto("/");

    const select = page.locator("#topic-select");

    // Verify it's enabled and can receive focus
    await select.focus();
    await expect(select).toBeFocused();
  });
});
