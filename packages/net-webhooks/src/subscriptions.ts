import { randomBytes } from "crypto";
import type { Subscription, SubscriptionFilter } from "./types.js";

/**
 * In-memory subscription store.
 * For production use, back this with a database or file persistence.
 */
export class SubscriptionStore {
  private subscriptions: Map<string, Subscription> = new Map();

  /**
   * Create a new subscription.
   */
  add(params: {
    chainId: number;
    filter: SubscriptionFilter;
    webhookUrl: string;
    secret?: string;
  }): Subscription {
    if (!params.filter.topic && !params.filter.sender && !params.filter.appAddress) {
      throw new Error("At least one filter field (topic, sender, appAddress) is required");
    }

    const id = `sub_${randomBytes(12).toString("hex")}`;
    const subscription: Subscription = {
      id,
      chainId: params.chainId,
      filter: params.filter,
      webhookUrl: params.webhookUrl,
      secret: params.secret,
      active: true,
      createdAt: new Date().toISOString(),
    };

    this.subscriptions.set(id, subscription);
    return subscription;
  }

  /**
   * Remove a subscription by ID.
   */
  remove(id: string): boolean {
    return this.subscriptions.delete(id);
  }

  /**
   * Pause or resume a subscription.
   */
  setActive(id: string, active: boolean): Subscription | null {
    const sub = this.subscriptions.get(id);
    if (!sub) return null;
    sub.active = active;
    return sub;
  }

  /**
   * Get a subscription by ID.
   */
  get(id: string): Subscription | undefined {
    return this.subscriptions.get(id);
  }

  /**
   * List all subscriptions, optionally filtered by chain.
   */
  list(chainId?: number): Subscription[] {
    const all = Array.from(this.subscriptions.values());
    if (chainId !== undefined) {
      return all.filter((s) => s.chainId === chainId);
    }
    return all;
  }

  /**
   * Get all active subscriptions for a specific chain that match a message.
   */
  getMatching(params: {
    chainId: number;
    topic: string;
    sender: `0x${string}`;
    appAddress?: `0x${string}`;
  }): Subscription[] {
    return this.list(params.chainId).filter((sub) => {
      if (!sub.active) return false;
      const f = sub.filter;

      // Each specified filter field must match
      if (f.topic && f.topic !== params.topic) return false;
      if (f.sender && f.sender.toLowerCase() !== params.sender.toLowerCase()) return false;
      if (f.appAddress) {
        if (!params.appAddress) return false;
        if (f.appAddress.toLowerCase() !== params.appAddress.toLowerCase()) return false;
      }

      return true;
    });
  }

  /**
   * Export all subscriptions as JSON (for persistence).
   */
  toJSON(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Load subscriptions from JSON (for persistence).
   */
  fromJSON(data: Subscription[]): void {
    this.subscriptions.clear();
    for (const sub of data) {
      this.subscriptions.set(sub.id, sub);
    }
  }
}
