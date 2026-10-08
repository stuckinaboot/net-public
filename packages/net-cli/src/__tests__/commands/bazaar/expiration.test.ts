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

import { Command } from "commander";
import { registerBazaarCommand } from "../../../commands/bazaar";

const NFT_ADDRESS = "0xca28587b61eac19a87dfcfd9420870867a916675";
const DAY = 24 * 60 * 60;

async function runBazaar(args: string[]): Promise<void> {
  const program = new Command();
  registerBazaarCommand(program);
  await program.parseAsync(["node", "netp", "bazaar", ...args]);
}

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
    await runBazaar([
      "create-listing", "--nft-address", NFT_ADDRESS, "--token-id", "1", "--price", "1",
      "--offerer", TEST_ACCOUNT_ADDRESS, "--chain-id", "4663", "--expiration", "30d",
    ]);

    const { expirationDate } = mockPrepareCreateListing.mock.calls[0][0];
    expect(expirationDate).toBeGreaterThanOrEqual(before + 30 * DAY);
    expect(expirationDate).toBeLessThanOrEqual(before + 30 * DAY + 5);
  });

  it("leaves expirationDate unset without the flag so the 24h default applies", async () => {
    await runBazaar([
      "create-listing", "--nft-address", NFT_ADDRESS, "--token-id", "1", "--price", "1",
      "--offerer", TEST_ACCOUNT_ADDRESS, "--chain-id", "4663",
    ]);

    expect(mockPrepareCreateListing.mock.calls[0][0].expirationDate).toBeUndefined();
  });

  it("passes an absolute timestamp through for collection offers", async () => {
    const timestamp = Math.floor(Date.now() / 1000) + 7 * DAY;
    await runBazaar([
      "create-offer", "--nft-address", NFT_ADDRESS, "--price", "0.1",
      "--offerer", TEST_ACCOUNT_ADDRESS, "--chain-id", String(TEST_CHAIN_ID),
      "--expiration", String(timestamp),
    ]);

    expect(mockPrepareCreateCollectionOffer.mock.calls[0][0].expirationDate).toBe(timestamp);
  });

  it("rejects an unparseable expiration as a usage error before preparing the order", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    await expect(
      runBazaar([
        "create-listing", "--nft-address", NFT_ADDRESS, "--token-id", "1", "--price", "1",
        "--offerer", TEST_ACCOUNT_ADDRESS, "--expiration", "1 month",
      ])
    ).rejects.toThrow("process.exit");
    expect(String(stderr.mock.calls[0][0])).toMatch(/duration like 12h, 30d or 4w/);
    expect(mockPrepareCreateListing).not.toHaveBeenCalled();
  });
});
