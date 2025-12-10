import { describe, it, expect } from "vitest";
import { NetClient } from "../client/NetClient";
import {
  BASE_CHAIN_ID,
  BASE_TEST_ADDRESSES,
  BASE_TEST_RPC_URL,
  delay,
} from "./test-utils";

describe("getNetMessageCount", () => {
  it("should return a number >= 0 with no filter", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const count = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
    });

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(count)).toBe(true);

    await delay();
  });

  it("should return count for specific appAddress", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;
    const count = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress },
    });

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(count)).toBe(true);

    await delay();
  });

  it("should return count for appAddress and topic", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;
    const topic = BASE_TEST_ADDRESSES.NULL_ADDRESS;

    const count = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress, topic },
    });

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(count)).toBe(true);

    await delay();
  });

  it("should return count for appAddress, topic, and maker", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const appAddress = BASE_TEST_ADDRESSES.BAZAAR_CONTRACT;
    const topic = BASE_TEST_ADDRESSES.NULL_ADDRESS;
    const maker = BASE_TEST_ADDRESSES.NULL_ADDRESS; // Using NULL as test maker

    const count = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress, topic, maker },
    });

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(count)).toBe(true);

    await delay();
  });

  it("should return count for UPVOTE_APP", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const count = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress: BASE_TEST_ADDRESSES.UPVOTE_APP },
    });

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(count)).toBe(true);

    await delay();
  });

  it("should return count for SCORE_CONTRACT", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const count = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress: BASE_TEST_ADDRESSES.SCORE_CONTRACT },
    });

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(count)).toBe(true);

    await delay();
  });

  it("should return consistent counts within short time window", async () => {
    const client = new NetClient({
      chainId: BASE_CHAIN_ID,
      overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
    });

    const count1 = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress: BASE_TEST_ADDRESSES.BAZAAR_CONTRACT },
    });

    await delay();

    const count2 = await client.getMessageCount({
      chainId: BASE_CHAIN_ID,
      filter: { appAddress: BASE_TEST_ADDRESSES.BAZAAR_CONTRACT },
    });

    // Counts should be the same or count2 should be >= count1 (if new messages were added)
    expect(count2).toBeGreaterThanOrEqual(count1);

    await delay();
  });
});
