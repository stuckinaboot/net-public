import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ALICE = "0x825646f2107e8D3e64746Cad2F0aEAB186f0e94a";
const BOB = "0x1b884fFf942a0fa9B6429679b768486Cb4a571C9";
const ZERO = "0x0000000000000000000000000000000000000000";

const mockGetTransfers = vi.fn();
const mockGetTransferCount = vi.fn();
const mockGetTokenInfo = vi.fn();
vi.mock("@net-protocol/transfers", () => ({
  TokenTransferClient: vi.fn().mockImplementation(() => ({
    getTransfers: mockGetTransfers,
    getTransferCount: mockGetTransferCount,
    getTokenInfo: mockGetTokenInfo,
  })),
  NATIVE_TOKEN_ADDRESS: "0x0000000000000000000000000000000000000000",
  isNativeToken: (t: string) => t === "0x0000000000000000000000000000000000000000",
}));

vi.mock("@net-protocol/core", () => ({
  getPublicClient: vi.fn(),
  getChainSlug: vi.fn(() => "base"),
  getChainBlockExplorer: vi.fn(),
}));

vi.mock("../../../cli/shared", () => ({
  parseReadOnlyOptionsWithDefault: vi.fn((opts) => ({ chainId: opts.chainId || 8453, rpcUrl: opts.rpcUrl })),
  parseCommonOptionsWithDefault: vi.fn(),
}));

vi.mock("../../../shared/output", () => ({
  exitWithError: vi.fn((msg: string) => {
    throw new Error(msg);
  }),
}));

import { buildTransferQuery, executeTokenTransfers } from "../../../commands/token/transfers";

describe("token transfers", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => logSpy.mockRestore());

  describe("buildTransferQuery", () => {
    it("maps each flag combination to one lookup", () => {
      expect(buildTransferQuery({ sentBy: ALICE })).toEqual({ sentBy: ALICE });
      expect(buildTransferQuery({ receivedBy: BOB })).toEqual({ receivedBy: BOB });
      expect(buildTransferQuery({ from: ALICE, to: BOB })).toEqual({ sentBy: ALICE, receivedBy: BOB });
      expect(buildTransferQuery({ token: USDC })).toEqual({ token: USDC });
      expect(buildTransferQuery({ token: "ETH" })).toEqual({ token: ZERO });
    });

    it("rejects empty, invalid and token+address combinations", () => {
      expect(() => buildTransferQuery({})).toThrow(/Provide/);
      expect(() => buildTransferQuery({ sentBy: "nope" })).toThrow(/Invalid --sent-by/);
      expect(() => buildTransferQuery({ token: USDC, sentBy: ALICE })).toThrow(/can't be combined/);
    });
  });

  it("--json prints formatted amounts, symbols and links", async () => {
    mockGetTransferCount.mockResolvedValue(2);
    mockGetTransfers.mockResolvedValue([
      { from: ALICE, to: BOB, token: USDC, amount: 5_000_000n, message: "thanks", timestamp: 1_700_000_000 },
      { from: ALICE, to: BOB, token: ZERO, amount: 10n ** 15n, message: "", timestamp: 1_699_999_000 },
    ]);
    mockGetTokenInfo.mockImplementation(async (t: string) =>
      t.toLowerCase() === ZERO ? { decimals: 18, symbol: "ETH" } : { decimals: 6, symbol: "USDC" }
    );

    await executeTokenTransfers({ from: ALICE, to: BOB, limit: "10", json: true });

    expect(mockGetTransfers).toHaveBeenCalledWith({ sentBy: ALICE, receivedBy: BOB }, { limit: 10, offset: 0 });
    const out = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(out.total).toBe(2);
    expect(out.transfers[0]).toMatchObject({
      token: USDC,
      symbol: "USDC",
      amount: "5",
      amountRaw: "5000000",
      message: "thanks",
      toProfileUrl: `https://netprotocol.app/app/profile/base/${BOB.toLowerCase()}`,
      tokenUrl: `https://netprotocol.app/app/token/base/${USDC.toLowerCase()}`,
    });
    expect(out.transfers[1]).toMatchObject({ token: "ETH", symbol: "ETH", amount: "0.001", tokenUrl: null });
  });

  it("still lists transfers when a token's metadata can't be read", async () => {
    mockGetTransferCount.mockResolvedValue(1);
    mockGetTransfers.mockResolvedValue([
      { from: ALICE, to: BOB, token: USDC, amount: 7n, message: "", timestamp: 1 },
    ]);
    mockGetTokenInfo.mockRejectedValue(new Error("no decimals"));
    await executeTokenTransfers({ receivedBy: BOB, json: true });
    const out = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(out.transfers[0]).toMatchObject({ amount: null, symbol: null, amountRaw: "7" });
  });
});
