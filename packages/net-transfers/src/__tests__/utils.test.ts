import { describe, it, expect } from "vitest";
import { encodeAbiParameters, type Address } from "viem";
import {
  getTransferTopic,
  isNativeToken,
  parseTransferMessage,
  validateSendParams,
  resolveTokenAddress,
} from "../utils";
import { NATIVE_TOKEN_ADDRESS } from "../constants";

const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const BOB = "0xabCDeF0123456789AbcdEf0123456789aBCDEF01" as Address;
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;

describe("getTransferTopic", () => {
  it("lowercases the recipient, matching the contract's Strings.toHexString", () => {
    expect(getTransferTopic(BOB)).toBe("to-0xabcdef0123456789abcdef0123456789abcdef01");
  });
});

describe("isNativeToken", () => {
  it("detects the zero address", () => {
    expect(isNativeToken(NATIVE_TOKEN_ADDRESS)).toBe(true);
    expect(isNativeToken(USDC)).toBe(false);
  });
});

describe("parseTransferMessage", () => {
  it("decodes token, recipient and amount from data", () => {
    const data = encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "uint256" }],
      [USDC, BOB, 5_000_000n]
    );
    const transfer = parseTransferMessage({
      app: "0x000000a169fE01175bb91d35A70A852ebDC9D869",
      sender: ALICE,
      timestamp: 1_700_000_000n,
      data,
      text: "thanks",
      topic: getTransferTopic(BOB),
    });
    expect(transfer).toEqual({
      from: ALICE,
      to: BOB,
      token: USDC,
      amount: 5_000_000n,
      message: "thanks",
      timestamp: 1_700_000_000,
    });
  });
});

describe("validateSendParams", () => {
  it("accepts a valid send", () => {
    expect(validateSendParams({ to: BOB, amount: 1n, message: "hi" })).toBeUndefined();
  });
  it("rejects zero amount, bad or zero recipient, and long notes", () => {
    expect(validateSendParams({ to: BOB, amount: 0n })).toMatch(/greater than zero/);
    expect(validateSendParams({ to: "0x123" as Address, amount: 1n })).toMatch(/Invalid recipient/);
    expect(validateSendParams({ to: NATIVE_TOKEN_ADDRESS, amount: 1n })).toMatch(/zero address/);
    expect(validateSendParams({ to: BOB, amount: 1n, message: "a".repeat(1025) })).toMatch(/1025 bytes/);
  });
  it("counts bytes, not characters", () => {
    // 512 two-byte characters = 1024 bytes (ok); one more = 1026 (too long)
    expect(validateSendParams({ to: BOB, amount: 1n, message: "é".repeat(512) })).toBeUndefined();
    expect(validateSendParams({ to: BOB, amount: 1n, message: "é".repeat(513) })).toMatch(/1026 bytes/);
  });
});

describe("resolveTokenAddress", () => {
  it("maps ETH (any case) to the native token address and passes addresses through", () => {
    expect(resolveTokenAddress("eth")).toBe(NATIVE_TOKEN_ADDRESS);
    expect(resolveTokenAddress(" ETH ")).toBe(NATIVE_TOKEN_ADDRESS);
    expect(resolveTokenAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")).toBe(
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    );
  });

  it("returns undefined for anything else", () => {
    expect(resolveTokenAddress("usdc")).toBeUndefined();
    expect(resolveTokenAddress("")).toBeUndefined();
  });
});
