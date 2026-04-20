import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";
import { deliverWebhook } from "../delivery.js";
import type { Subscription, WebhookPayload } from "../types.js";

const mockSubscription: Subscription = {
  id: "sub_test123",
  chainId: 8453,
  filter: { topic: "general" },
  webhookUrl: "https://example.com/hook",
  active: true,
  createdAt: "2026-03-07T00:00:00Z",
};

const mockPayload: WebhookPayload = {
  subscriptionId: "sub_test123",
  chainId: 8453,
  message: {
    app: "0x0000000000000000000000000000000000000000",
    sender: "0x1111111111111111111111111111111111111111",
    timestamp: "1709856000",
    data: "0x",
    text: "Hello",
    topic: "general",
  },
  messageIndex: "42",
  viaApp: false,
  deliveredAt: "2026-03-07T00:00:00Z",
};

describe("deliverWebhook", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("delivers successfully on 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const result = await deliverWebhook({
      subscription: mockSubscription,
      payload: mockPayload,
      maxRetries: 0,
      retryBaseDelayMs: 100,
    });

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.retryCount).toBe(0);
  });

  it("does not retry on 4xx", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
    });

    const result = await deliverWebhook({
      subscription: mockSubscription,
      payload: mockPayload,
      maxRetries: 3,
      retryBaseDelayMs: 10,
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.retryCount).toBe(0);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 500 with backoff", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await deliverWebhook({
      subscription: mockSubscription,
      payload: mockPayload,
      maxRetries: 2,
      retryBaseDelayMs: 10,
    });

    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("includes HMAC signature when secret is set", async () => {
    const secret = "my-secret";
    const sub = { ...mockSubscription, secret };

    let capturedHeaders: Record<string, string> = {};
    let capturedBody = "";

    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      capturedHeaders = Object.fromEntries(
        Object.entries(init?.headers ?? {})
      );
      capturedBody = init?.body as string;
      return Promise.resolve({ ok: true, status: 200 });
    });

    await deliverWebhook({
      subscription: sub,
      payload: mockPayload,
      maxRetries: 0,
      retryBaseDelayMs: 100,
    });

    const expectedSig =
      "sha256=" +
      createHmac("sha256", secret).update(capturedBody).digest("hex");

    expect(capturedHeaders["X-Net-Signature"]).toBe(expectedSig);
  });

  it("fails after max retries on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await deliverWebhook({
      subscription: mockSubscription,
      payload: mockPayload,
      maxRetries: 1,
      retryBaseDelayMs: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("ECONNREFUSED");
    expect(result.retryCount).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
