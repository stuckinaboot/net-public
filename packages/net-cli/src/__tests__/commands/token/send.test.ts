import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const TEST_CHAIN_ID = 8453;
const APP = "0x000000DcBE3d8A4db2dD046D500483857dEf83Fb";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BOB = "0x1b884fFf942a0fa9B6429679b768486Cb4a571C9";
const SENDER = "0x825646f2107e8D3e64746Cad2F0aEAB186f0e94a";
const ZERO = "0x0000000000000000000000000000000000000000";
const TX_HASH = ("0x" + "b".repeat(64)) as `0x${string}`;

const mockGetTokenInfo = vi.fn();
const mockPrepareSend = vi.fn();
vi.mock("@net-protocol/transfers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@net-protocol/transfers")>()),
  TokenTransferClient: vi.fn().mockImplementation(() => ({
    getTokenInfo: mockGetTokenInfo,
    prepareSend: mockPrepareSend,
  })),
  NATIVE_TOKEN_ADDRESS: "0x0000000000000000000000000000000000000000",
}));

const mockWait = vi.fn().mockResolvedValue({ status: "success" });
vi.mock("@net-protocol/core", () => ({
  getPublicClient: vi.fn(() => ({ waitForTransactionReceipt: mockWait })),
  getChainSlug: vi.fn(() => "base"),
  getChainBlockExplorer: vi.fn(),
  getBaseDataSuffix: vi.fn(() => undefined),
}));

vi.mock("../../../cli/shared", () => ({
  parseReadOnlyOptionsWithDefault: vi.fn((opts) => ({
    chainId: opts.chainId || TEST_CHAIN_ID,
    rpcUrl: opts.rpcUrl,
  })),
  parseCommonOptionsWithDefault: vi.fn((opts) => ({
    privateKey: opts.privateKey || "0x" + "a".repeat(64),
    chainId: opts.chainId || TEST_CHAIN_ID,
    rpcUrl: opts.rpcUrl,
  })),
}));

const mockExecute = vi.fn().mockResolvedValue(TX_HASH);
vi.mock("../../../shared/wallet", () => ({
  createWallet: vi.fn(() => ({ account: { address: SENDER } })),
  executeTransaction: (...args: unknown[]) => mockExecute(...args),
}));

vi.mock("../../../shared/output", () => ({
  exitWithError: vi.fn((msg: string) => {
    throw new Error(msg);
  }),
}));

import { executeTokenSend, parseAmount, resolveTokenArg } from "../../../commands/token/send";

const approveTx = { to: USDC, abi: [], functionName: "approve", args: [APP, 5_000_000n] };
const sendTx = { to: APP, abi: [], functionName: "send", args: [USDC, BOB, 5_000_000n, "hi"] };

describe("token send", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mockGetTokenInfo.mockResolvedValue({ decimals: 6, symbol: "USDC" });
  });
  afterEach(() => logSpy.mockRestore());

  describe("argument parsing", () => {
    it("ETH maps to the zero address, case-insensitively", () => {
      expect(resolveTokenArg("eth")).toBe(ZERO);
      expect(resolveTokenArg(USDC)).toBe(USDC);
      expect(() => resolveTokenArg("usdc")).toThrow(/Invalid --token/);
    });

    it("parses human amounts with the token's decimals", () => {
      expect(parseAmount("5", 6)).toBe(5_000_000n);
      expect(parseAmount("0.001", 18)).toBe(1_000_000_000_000_000n);
      expect(() => parseAmount("0", 6)).toThrow(/greater than zero/);
      expect(() => parseAmount("abc", 6)).toThrow(/Invalid --amount/);
    });
  });

  it("scales --amount by on-chain decimals and sends approval then send, waiting for each", async () => {
    mockPrepareSend.mockResolvedValue({ approvals: [approveTx], transaction: sendTx });

    await executeTokenSend({ token: USDC, to: BOB, amount: "5", message: "hi" });

    expect(mockPrepareSend).toHaveBeenCalledWith({
      token: USDC,
      to: BOB,
      amount: 5_000_000n,
      message: "hi",
      sender: SENDER,
    });
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute.mock.calls[0][1]).toBe(approveTx);
    expect(mockExecute.mock.calls[1][1]).toBe(sendTx);
    expect(mockWait).toHaveBeenCalledTimes(2);
  });

  it("fails clearly when the send reverts", async () => {
    mockPrepareSend.mockResolvedValue({ approvals: [], transaction: sendTx });
    mockWait.mockResolvedValueOnce({ status: "reverted" });
    await expect(
      executeTokenSend({ token: USDC, to: BOB, amount: "5" })
    ).rejects.toThrow(/reverted/);
  });

  it("--encode-only outputs approvals + transaction with the send value for ETH", async () => {
    mockGetTokenInfo.mockResolvedValue({ decimals: 18, symbol: "ETH" });
    mockPrepareSend.mockResolvedValue({
      approvals: [],
      transaction: {
        to: APP,
        abi: [
          {
            type: "function",
            name: "sendNative",
            stateMutability: "payable",
            inputs: [
              { name: "to", type: "address" },
              { name: "message", type: "string" },
            ],
            outputs: [],
          },
        ],
        functionName: "sendNative",
        args: [BOB, "gm"],
        value: 1_000_000_000_000n,
      },
    });

    await executeTokenSend({
      token: "ETH",
      to: BOB,
      amount: "0.000001",
      message: "gm",
      sender: SENDER,
      encodeOnly: true,
    });

    expect(mockExecute).not.toHaveBeenCalled();
    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.approvals).toEqual([]);
    expect(output.transaction.to).toBe(APP);
    expect(output.transaction.value).toBe("1000000000000");
    expect(output.transaction.chainId).toBe(8453);
    expect(output.transaction.data.startsWith("0x")).toBe(true);
  });

  it("--encode-only requires --sender", async () => {
    await expect(
      executeTokenSend({ token: USDC, to: BOB, amount: "1", encodeOnly: true })
    ).rejects.toThrow(/--sender/);
  });

  it("rejects an invalid recipient before any RPC call", async () => {
    await expect(executeTokenSend({ token: USDC, to: "0x123", amount: "1" })).rejects.toThrow(
      /Invalid --to/
    );
    expect(mockGetTokenInfo).not.toHaveBeenCalled();
  });
});
