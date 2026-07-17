import { describe, it, expect, beforeEach } from "vitest";
import { SubscriptionStore } from "../subscriptions.js";

describe("SubscriptionStore", () => {
  let store: SubscriptionStore;

  beforeEach(() => {
    store = new SubscriptionStore();
  });

  it("creates a subscription with a topic filter", () => {
    const sub = store.add({
      chainId: 8453,
      filter: { topic: "general" },
      webhookUrl: "https://example.com/hook",
    });

    expect(sub.id).toMatch(/^sub_/);
    expect(sub.chainId).toBe(8453);
    expect(sub.filter.topic).toBe("general");
    expect(sub.active).toBe(true);
  });

  it("rejects empty filter", () => {
    expect(() =>
      store.add({
        chainId: 8453,
        filter: {},
        webhookUrl: "https://example.com/hook",
      })
    ).toThrow("At least one filter field");
  });

  it("matches by topic", () => {
    store.add({
      chainId: 8453,
      filter: { topic: "general" },
      webhookUrl: "https://example.com/hook",
    });

    const matches = store.getMatching({
      chainId: 8453,
      topic: "general",
      sender: "0x1234567890123456789012345678901234567890",
    });
    expect(matches).toHaveLength(1);

    const noMatch = store.getMatching({
      chainId: 8453,
      topic: "other",
      sender: "0x1234567890123456789012345678901234567890",
    });
    expect(noMatch).toHaveLength(0);
  });

  it("matches by sender (case-insensitive)", () => {
    store.add({
      chainId: 8453,
      filter: { sender: "0xAbCd000000000000000000000000000000000000" },
      webhookUrl: "https://example.com/hook",
    });

    const matches = store.getMatching({
      chainId: 8453,
      topic: "anything",
      sender: "0xabcd000000000000000000000000000000000000",
    });
    expect(matches).toHaveLength(1);
  });

  it("requires all filter fields to match (AND logic)", () => {
    store.add({
      chainId: 8453,
      filter: {
        topic: "signals",
        sender: "0x1111111111111111111111111111111111111111",
      },
      webhookUrl: "https://example.com/hook",
    });

    // Both match
    expect(
      store.getMatching({
        chainId: 8453,
        topic: "signals",
        sender: "0x1111111111111111111111111111111111111111",
      })
    ).toHaveLength(1);

    // Topic doesn't match
    expect(
      store.getMatching({
        chainId: 8453,
        topic: "other",
        sender: "0x1111111111111111111111111111111111111111",
      })
    ).toHaveLength(0);

    // Sender doesn't match
    expect(
      store.getMatching({
        chainId: 8453,
        topic: "signals",
        sender: "0x2222222222222222222222222222222222222222",
      })
    ).toHaveLength(0);
  });

  it("skips inactive subscriptions", () => {
    const sub = store.add({
      chainId: 8453,
      filter: { topic: "general" },
      webhookUrl: "https://example.com/hook",
    });

    store.setActive(sub.id, false);

    const matches = store.getMatching({
      chainId: 8453,
      topic: "general",
      sender: "0x1234567890123456789012345678901234567890",
    });
    expect(matches).toHaveLength(0);
  });

  it("removes a subscription", () => {
    const sub = store.add({
      chainId: 8453,
      filter: { topic: "general" },
      webhookUrl: "https://example.com/hook",
    });

    expect(store.remove(sub.id)).toBe(true);
    expect(store.get(sub.id)).toBeUndefined();
    expect(store.remove(sub.id)).toBe(false);
  });

  it("serializes and deserializes", () => {
    store.add({
      chainId: 8453,
      filter: { topic: "a" },
      webhookUrl: "https://example.com/a",
    });
    store.add({
      chainId: 8453,
      filter: { sender: "0x0000000000000000000000000000000000000001" },
      webhookUrl: "https://example.com/b",
    });

    const json = store.toJSON();
    const newStore = new SubscriptionStore();
    newStore.fromJSON(json);

    expect(newStore.list()).toHaveLength(2);
  });

  it("filters by chain ID", () => {
    store.add({
      chainId: 8453,
      filter: { topic: "base" },
      webhookUrl: "https://example.com/base",
    });
    store.add({
      chainId: 1,
      filter: { topic: "mainnet" },
      webhookUrl: "https://example.com/mainnet",
    });

    expect(store.list(8453)).toHaveLength(1);
    expect(store.list(1)).toHaveLength(1);
    expect(store.list()).toHaveLength(2);
  });
});
