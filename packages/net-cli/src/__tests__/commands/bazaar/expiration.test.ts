import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TEST_CHAIN_ID,
  TEST_ACCOUNT_ADDRESS,
  createMockPreparedOrder,
} from "./test-utils";

vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    encodeFunctionData: vi.fn().mockReturnValue("0xabcdef1234567890"),
  };
});

const mockPrepareCreateListing = vi.fn();
const mockPrepareCreateCollectionOffer = vi.fn();

vi.mock("@net-protocol/bazaar", () => ({
  BazaarClient: vi.fn().mockImplementation(() => ({
    prepareCreateListing: mockPrepareCreateListing,
    prepareCreateCollectionOffer: mockPrepareCreateCollectionOffer,
  })),
}));

vi.mock("@net-protocol/core", () => ({
  getChainRpcUrls: vi.fn().mockReturnValue(["https://example.invalid"]),
  getBaseDataSuffix: vi.fn().mockReturnValue(undefined),
}));

vi.mock("../../../cli/shared", () => ({
  parseCommonOptions: vi.fn(),
  parseReadOnlyOptions: vi.fn().mockImplementation((opts) => ({
    chainId: opts.chainId || TEST_CHAIN_ID,
    rpcUrl: opts.rpcUrl,
  })),
}));

vi.spyOn(console, "log").mockImplementation(() => {});

import { executeCreateListing } from "../../../commands/bazaar/create-listing";
import { executeCreateOffer } from "../../../commands/bazaar/create-offer";

const NFT_ADDRESS = "0xca28587b61eac19a87dfcfd9420870867a916675";
const DAY = 24 * 60 * 60;

describe("bazaar --expiration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NET_PRIVATE_KEY;
    delete process.env.PRIVATE_KEY;
    mockPrepareCreateListing.mockResolvedValue(createMockPreparedOrder());
    mockPrepareCreateCollectionOffer.mockResolvedValue(createMockPreparedOrder());
  });

  it("passes a 30d listing expiration through to the SDK", async () => {
    const before = Math.floor(Date.now() / 1000);
    await executeCreateListing({
      nftAddress: NFT_ADDRESS,
      tokenId: "1",
      price: "1",
      offerer: TEST_ACCOUNT_ADDRESS,
      chainId: 4663,
      expiration: "30d",
    });

    const { expirationDate } = mockPrepareCreateListing.mock.calls[0][0];
    expect(expirationDate).toBeGreaterThanOrEqual(before + 30 * DAY);
    expect(expirationDate).toBeLessThanOrEqual(before + 30 * DAY + 5);
  });

  it("leaves expirationDate unset without the flag so the 24h default applies", async () => {
    await executeCreateListing({
      nftAddress: NFT_ADDRESS,
      tokenId: "1",
      price: "1",
      offerer: TEST_ACCOUNT_ADDRESS,
      chainId: 4663,
    });

    expect(mockPrepareCreateListing.mock.calls[0][0].expirationDate).toBeUndefined();
  });

  it("passes an absolute timestamp through for collection offers", async () => {
    const timestamp = Math.floor(Date.now() / 1000) + 7 * DAY;
    await executeCreateOffer({
      nftAddress: NFT_ADDRESS,
      price: "0.1",
      offerer: TEST_ACCOUNT_ADDRESS,
      chainId: TEST_CHAIN_ID,
      expiration: String(timestamp),
    });

    expect(mockPrepareCreateCollectionOffer.mock.calls[0][0].expirationDate).toBe(timestamp);
  });
});
