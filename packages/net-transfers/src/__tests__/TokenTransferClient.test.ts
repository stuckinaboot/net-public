import { describe, it, expect, vi, beforeEach } from "vitest";
import { encodeAbiParameters, type Address } from "viem";

vi.mock("viem/actions", () => ({ readContract: vi.fn() }));

const getMessages = vi.fn();
const getMessageCount = vi.fn();
vi.mock("@net-protocol/core", () => ({
  // HyperEVM's client carries its native currency, as net-core's chain config defines it
  getPublicClient: vi.fn(({ chainId }: { chainId: number }) =>
    chainId === 999 ? { chain: { nativeCurrency: { name: "Hype", symbol: "HYPE", decimals: 18 } } } : {}
  ),
  NetClient: vi.fn().mockImplementation(() => ({ getMessages, getMessageCount })),
}));

import { readContract } from "viem/actions";
import { TokenTransferClient } from "../client/TokenTransferClient";
import { NATIVE_TOKEN_ADDRESS, TOKEN_TRANSFER_CONTRACT } from "../constants";

const APP = TOKEN_TRANSFER_CONTRACT.address;
const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const BOB = "0x2222222222222222222222222222222222222222" as Address;
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;

function msg(text: string, amount: bigint, token: Address = USDC) {
  return {
    app: APP,
    sender: ALICE,
    timestamp: 1n,
    data: encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "uint256" }],
      [token, BOB, amount]
    ),
    text,
    topic: `to-${BOB}`,
  };
}

describe("TokenTransferClient", () => {
  let client: TokenTransferClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new TokenTransferClient({ chainId: 8453 });
  });

  describe("queries map onto Net's indexes", () => {
    it("sent by → app + user", async () => {
      getMessageCount.mockResolvedValue(3);
      await client.getTransferCount({ sentBy: ALICE });
      expect(getMessageCount).toHaveBeenCalledWith({
        filter: { appAddress: APP, maker: ALICE, topic: undefined },
      });
    });

    it("received by → app + topic (lowercased)", async () => {
      getMessageCount.mockResolvedValue(0);
      const mixed = "0xAbCdEf0123456789aBcDeF0123456789AbCdEf01" as Address;
      await client.getTransferCount({ receivedBy: mixed });
      expect(getMessageCount).toHaveBeenCalledWith({
        filter: {
          appAddress: APP,
          maker: undefined,
          topic: "to-0xabcdef0123456789abcdef0123456789abcdef01",
        },
      });
    });

    it("A to B → app + user + topic", async () => {
      getMessageCount.mockResolvedValue(0);
      await client.getTransferCount({ sentBy: ALICE, receivedBy: BOB });
      expect(getMessageCount).toHaveBeenCalledWith({
        filter: { appAddress: APP, maker: ALICE, topic: `to-${BOB}` },
      });
    });

    it("by token → the contract's token index", async () => {
      vi.mocked(readContract).mockResolvedValue(7n);
      expect(await client.getTransferCount({ token: USDC })).toBe(7);
      expect(readContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ functionName: "getTokenTransferCount", args: [USDC] })
      );
      expect(getMessageCount).not.toHaveBeenCalled();
    });
  });

  describe("getTransfers pages newest first", () => {
    it("reads the last `limit` rows and reverses them", async () => {
      getMessageCount.mockResolvedValue(5);
      getMessages.mockResolvedValue([msg("third", 3n), msg("fourth", 4n), msg("fifth", 5n)]);

      const { total, transfers: rows } = await client.getTransfers({ sentBy: ALICE }, { limit: 3 });
      expect(total).toBe(5);

      expect(getMessages).toHaveBeenCalledWith(
        expect.objectContaining({ startIndex: 2, endIndex: 5 })
      );
      expect(rows.map((r) => r.message)).toEqual(["fifth", "fourth", "third"]);
      expect(rows[0]).toMatchObject({ from: ALICE, to: BOB, token: USDC, amount: 5n });
    });

    it("applies offset and clamps at the oldest row", async () => {
      getMessageCount.mockResolvedValue(5);
      getMessages.mockResolvedValue([msg("first", 1n), msg("second", 2n)]);
      await client.getTransfers({ sentBy: ALICE }, { limit: 3, offset: 3 });
      expect(getMessages).toHaveBeenCalledWith(
        expect.objectContaining({ startIndex: 0, endIndex: 2 })
      );
    });

    it("returns [] without reading when there is nothing in range", async () => {
      getMessageCount.mockResolvedValue(2);
      expect(await client.getTransfers({ sentBy: ALICE }, { offset: 2 })).toEqual({ total: 2, transfers: [] });
      expect(getMessages).not.toHaveBeenCalled();
    });

    it("reads token transfers from the contract", async () => {
      vi.mocked(readContract)
        .mockResolvedValueOnce(1n)
        .mockResolvedValueOnce([msg("eth", 10n, NATIVE_TOKEN_ADDRESS)]);
      const { transfers: rows } = await client.getTransfers({ token: NATIVE_TOKEN_ADDRESS });
      expect(readContract).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          functionName: "getTokenTransfers",
          args: [NATIVE_TOKEN_ADDRESS, 0n, 1n],
        })
      );
      expect(rows[0]).toMatchObject({ token: NATIVE_TOKEN_ADDRESS, amount: 10n, message: "eth" });
    });
  });

  describe("prepareSend", () => {
    it("ETH: no approvals, sendNative with value", async () => {
      const prepared = await client.prepareSend({
        token: NATIVE_TOKEN_ADDRESS,
        to: BOB,
        amount: 100n,
        message: "gas",
        sender: ALICE,
      });
      expect(prepared.approvals).toEqual([]);
      expect(prepared.transaction).toMatchObject({
        to: APP,
        functionName: "sendNative",
        args: [BOB, "gas"],
        value: 100n,
      });
      expect(readContract).not.toHaveBeenCalled();
    });

    it("ERC-20 with short allowance: approve exact amount, then send", async () => {
      vi.mocked(readContract).mockResolvedValue(5n);
      const prepared = await client.prepareSend({
        token: USDC,
        to: BOB,
        amount: 10n,
        sender: ALICE,
      });
      expect(readContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ address: USDC, functionName: "allowance", args: [ALICE, APP] })
      );
      expect(prepared.approvals).toHaveLength(1);
      expect(prepared.approvals[0]).toMatchObject({
        to: USDC,
        functionName: "approve",
        args: [APP, 10n],
      });
      expect(prepared.transaction).toMatchObject({
        functionName: "send",
        args: [USDC, BOB, 10n, ""],
      });
      expect(prepared.transaction.value).toBeUndefined();
    });

    it("ERC-20 with enough allowance: no approvals", async () => {
      vi.mocked(readContract).mockResolvedValue(10n);
      const prepared = await client.prepareSend({ token: USDC, to: BOB, amount: 10n, sender: ALICE });
      expect(prepared.approvals).toEqual([]);
    });

    it("rejects invalid params before any RPC call", async () => {
      await expect(
        client.prepareSend({ token: USDC, to: BOB, amount: 0n, sender: ALICE })
      ).rejects.toThrow(/greater than zero/);
      expect(readContract).not.toHaveBeenCalled();
    });
  });

  it("getTokenInfo short-circuits for ETH", async () => {
    expect(await client.getTokenInfo(NATIVE_TOKEN_ADDRESS)).toEqual({ decimals: 18, symbol: "ETH" });
    expect(readContract).not.toHaveBeenCalled();
  });

  it("getTokenInfo uses the chain's native currency (HYPE on HyperEVM)", async () => {
    const hyper = new TokenTransferClient({ chainId: 999 });
    expect(await hyper.getTokenInfo(NATIVE_TOKEN_ADDRESS)).toEqual({ decimals: 18, symbol: "HYPE" });
    expect(readContract).not.toHaveBeenCalled();
  });
});
