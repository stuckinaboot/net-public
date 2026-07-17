import { createHmac } from "crypto";
import type { Subscription, WebhookPayload, DeliveryResult } from "./types.js";

/**
 * Deliver a webhook payload to a subscriber's endpoint.
 * Includes HMAC-SHA256 signing when a secret is configured.
 */
export async function deliverWebhook(params: {
  subscription: Subscription;
  payload: WebhookPayload;
  maxRetries: number;
  retryBaseDelayMs: number;
}): Promise<DeliveryResult> {
  const { subscription, payload, maxRetries, retryBaseDelayMs } = params;
  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "net-webhooks/0.1.0",
    "X-Net-Subscription-Id": subscription.id,
    "X-Net-Chain-Id": String(payload.chainId),
  };

  // Sign payload if secret is configured
  if (subscription.secret) {
    const signature = createHmac("sha256", subscription.secret)
      .update(body)
      .digest("hex");
    headers["X-Net-Signature"] = `sha256=${signature}`;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(subscription.webhookUrl, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) {
        return {
          subscriptionId: subscription.id,
          success: true,
          statusCode: response.status,
          attemptedAt: new Date().toISOString(),
          retryCount: attempt,
        };
      }

      // Don't retry on 4xx (client errors)
      if (response.status >= 400 && response.status < 500) {
        return {
          subscriptionId: subscription.id,
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}`,
          attemptedAt: new Date().toISOString(),
          retryCount: attempt,
        };
      }

      // 5xx — retry with backoff
      if (attempt < maxRetries) {
        const delay = retryBaseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = retryBaseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        return {
          subscriptionId: subscription.id,
          success: false,
          error: err instanceof Error ? err.message : String(err),
          attemptedAt: new Date().toISOString(),
          retryCount: attempt,
        };
      }
    }
  }

  return {
    subscriptionId: subscription.id,
    success: false,
    error: "Max retries exceeded",
    attemptedAt: new Date().toISOString(),
    retryCount: maxRetries,
  };
}
