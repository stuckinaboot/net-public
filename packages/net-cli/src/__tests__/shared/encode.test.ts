import { describe, it, expect } from "vitest";
import { encodeTransaction } from "../../shared/encode";
import type { WriteTransactionConfig } from "@net-protocol/core";

// Simple test ABI for a function like `setValue(uint256)`
const TEST_ABI = [
  {
    type: "function",
    name: "setValue",
    inputs: [{ name: "value", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const TEST_CONTRACT_ADDRESS =
  "0x1234567890123456789012345678901234567890" as const;
const TEST_CHAIN_ID = 8453;

describe("encodeTransaction", () => {
  it("should encode a transaction config into EncodedTransaction format", () => {
    const config: WriteTransactionConfig = {
      to: TEST_CONTRACT_ADDRESS,
      functionName: "setValue",
      args: [BigInt(42)],
      abi: TEST_ABI,
    };

    const encoded = encodeTransaction(config, TEST_CHAIN_ID);

    expect(encoded.to).toBe(TEST_CONTRACT_ADDRESS);
    expect(encoded.chainId).toBe(TEST_CHAIN_ID);
    expect(encoded.value).toBe("0");
    expect(encoded.data).toMatch(/^0x/); // Should be hex encoded
    expect(encoded.data.length).toBeGreaterThan(2); // More than just "0x"
  });

  it("should include value when provided in config", () => {
    const config: WriteTransactionConfig = {
      to: TEST_CONTRACT_ADDRESS,
      functionName: "setValue",
      args: [BigInt(42)],
      abi: TEST_ABI,
      value: BigInt(1000000000000000000), // 1 ETH in wei
    };

    const encoded = encodeTransaction(config, TEST_CHAIN_ID);

    expect(encoded.value).toBe("1000000000000000000");
  });

  it("should default value to '0' when not provided", () => {
    const config: WriteTransactionConfig = {
      to: TEST_CONTRACT_ADDRESS,
      functionName: "setValue",
      args: [BigInt(42)],
      abi: TEST_ABI,
    };

    const encoded = encodeTransaction(config, TEST_CHAIN_ID);

    expect(encoded.value).toBe("0");
  });

  it("should correctly encode function data with arguments", () => {
    const config: WriteTransactionConfig = {
      to: TEST_CONTRACT_ADDRESS,
      functionName: "setValue",
      args: [BigInt(123)],
      abi: TEST_ABI,
    };

    const encoded = encodeTransaction(config, TEST_CHAIN_ID);

    // The encoded data should contain the function selector (4 bytes)
    // plus the encoded argument (32 bytes for uint256)
    // Function selector for setValue(uint256) + padded 123
    expect(encoded.data.length).toBe(2 + 8 + 64); // 0x + 4 bytes selector + 32 bytes arg
  });

  it("should use the provided chainId", () => {
    const config: WriteTransactionConfig = {
      to: TEST_CONTRACT_ADDRESS,
      functionName: "setValue",
      args: [BigInt(42)],
      abi: TEST_ABI,
    };

    const encoded1 = encodeTransaction(config, 1);
    const encoded2 = encodeTransaction(config, 8453);

    expect(encoded1.chainId).toBe(1);
    expect(encoded2.chainId).toBe(8453);
  });
});
