import { describe, it, expect } from "vitest";
import {
  agentUrl,
  bazaarUrl,
  chainSlug,
  chatUrl,
  explorerAddressUrl,
  explorerTxUrl,
  feedUrl,
  HOSTED_SKILL_URL,
  postIdToCommentParam,
  postPermalink,
  profileUrl,
  storageUrl,
  tokenUrl,
  walletUrl,
} from "../../shared/urls";

const ADDR = "0xAbC0000000000000000000000000000000000DEF";
const ADDR_LOWER = ADDR.toLowerCase();

describe("chainSlug", () => {
  it("maps known chains to OpenSea-style slugs", () => {
    expect(chainSlug(8453)).toBe("base");
    expect(chainSlug(1)).toBe("ethereum");
    expect(chainSlug(999)).toBe("hyperliquid");
    expect(chainSlug(84532)).toBe("base_sepolia");
  });

  it("returns null for unknown chains", () => {
    expect(chainSlug(12345)).toBeNull();
  });
});

describe("feedUrl", () => {
  it("strips the feed- prefix when present", () => {
    expect(feedUrl(8453, "general")).toBe(
      "https://netprotocol.app/app/feed/base/general"
    );
    expect(feedUrl(8453, "feed-general")).toBe(
      "https://netprotocol.app/app/feed/base/general"
    );
    expect(feedUrl(8453, "FEED-General")).toBe(
      "https://netprotocol.app/app/feed/base/general"
    );
  });

  it("returns null for unknown chain", () => {
    expect(feedUrl(99999, "general")).toBeNull();
  });
});

describe("walletUrl", () => {
  it("lowercases the address", () => {
    expect(walletUrl(8453, ADDR)).toBe(
      `https://netprotocol.app/app/feed/base/${ADDR_LOWER}`
    );
  });
});

describe("profileUrl", () => {
  it("lowercases the address", () => {
    expect(profileUrl(8453, ADDR)).toBe(
      `https://netprotocol.app/app/profile/base/${ADDR_LOWER}`
    );
  });
});

describe("chatUrl", () => {
  it("encodes special chars and lowercases", () => {
    expect(chatUrl(8453, "Cool Chat")).toBe(
      "https://netprotocol.app/app/chat/base/cool%20chat"
    );
  });
});

describe("tokenUrl / bazaarUrl", () => {
  it("lowercase contract address", () => {
    expect(tokenUrl(8453, ADDR)).toBe(
      `https://netprotocol.app/app/token/base/${ADDR_LOWER}`
    );
    expect(bazaarUrl(8453, ADDR)).toBe(
      `https://netprotocol.app/app/bazaar/base/${ADDR_LOWER}`
    );
  });
});

describe("agentUrl", () => {
  it("encodes the agent id", () => {
    expect(agentUrl(8453, "abc-123")).toBe(
      "https://netprotocol.app/app/agents/base/abc-123"
    );
  });
});

describe("storageUrl", () => {
  it("uses numeric chain ID and url-encodes the key", () => {
    expect(storageUrl(8453, ADDR, "my key/with slash")).toBe(
      `https://storedon.net/net/8453/storage/load/${ADDR_LOWER}/my%20key%2Fwith%20slash`
    );
  });

  it("works for chains without a website slug", () => {
    expect(storageUrl(12345, ADDR, "key")).toContain(
      "/net/12345/storage/load/"
    );
  });
});

describe("explorer URLs", () => {
  it("returns null for unknown chains", () => {
    expect(explorerTxUrl(12345, "0xabc")).toBeNull();
    expect(explorerAddressUrl(12345, ADDR)).toBeNull();
  });

  it("returns canonical URL for Degen (covered by net-core chain config)", () => {
    expect(explorerTxUrl(666666666, "0xabc")).toBe(
      "https://explorer.degen.tips/tx/0xabc"
    );
  });

  it("returns canonical URLs for known chains", () => {
    expect(explorerTxUrl(8453, "0xdeadbeef")).toBe(
      "https://basescan.org/tx/0xdeadbeef"
    );
    expect(explorerAddressUrl(1, ADDR)).toBe(
      `https://etherscan.io/address/${ADDR}`
    );
  });
});

describe("postIdToCommentParam", () => {
  it("converts colon to hyphen", () => {
    expect(postIdToCommentParam(`${ADDR}:1234567890`)).toBe(
      `${ADDR}-1234567890`
    );
  });

  it("passes through values without a colon (already converted)", () => {
    expect(postIdToCommentParam(`${ADDR}-1234567890`)).toBe(
      `${ADDR}-1234567890`
    );
  });
});

describe("postPermalink", () => {
  it("prefers globalIndex when available", () => {
    expect(
      postPermalink(8453, {
        globalIndex: 999,
        topic: "general",
        topicIndex: 5,
      })
    ).toBe("https://netprotocol.app/app/feed/base/post?index=999");
  });

  it("falls back to topic+topicIndex", () => {
    expect(postPermalink(8453, { topic: "general", topicIndex: 42 })).toBe(
      "https://netprotocol.app/app/feed/base/post?topic=general&index=42"
    );
  });

  it("strips feed- prefix from topic before using as query param", () => {
    expect(
      postPermalink(8453, { topic: "feed-general", topicIndex: 42 })
    ).toBe(
      "https://netprotocol.app/app/feed/base/post?topic=general&index=42"
    );
  });

  it("falls back to user+userIndex", () => {
    expect(postPermalink(8453, { user: ADDR, userIndex: 7 })).toBe(
      `https://netprotocol.app/app/feed/base/post?user=${ADDR_LOWER}&index=7`
    );
  });

  it("appends commentId, normalizing colon to hyphen", () => {
    expect(
      postPermalink(8453, {
        topic: "general",
        topicIndex: 42,
        commentId: `${ADDR}:1234567890`,
      })
    ).toBe(
      `https://netprotocol.app/app/feed/base/post?topic=general&index=42&commentId=${ADDR}-1234567890`
    );
  });

  it("returns null when no usable index is given", () => {
    expect(postPermalink(8453, {})).toBeNull();
    expect(postPermalink(8453, { topic: "general" })).toBeNull();
    expect(postPermalink(8453, { topicIndex: 5 })).toBeNull();
  });

  it("returns null for unknown chain", () => {
    expect(postPermalink(99999, { globalIndex: 1 })).toBeNull();
  });
});

describe("HOSTED_SKILL_URL", () => {
  it("points at the canonical hosted skill", () => {
    expect(HOSTED_SKILL_URL).toBe("https://netprotocol.app/skill.md");
  });
});
