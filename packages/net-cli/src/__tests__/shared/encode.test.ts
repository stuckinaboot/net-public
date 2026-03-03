import { describe, it, expect, vi } from "vitest";
import { encodeFunctionData } from "viem";

// A realistic mock suffix (valid hex, like what Attribution.toDataSuffix would produce)
const MOCK_BASE_DATA_SUFFIX = vi.hoisted(
  () => "0x00000000000000000000000000626364307832" as `0x${string}`
);

// Mock @net-protocol/core to avoid ox/erc8021 resolution issue in tests
vi.mock("@net-protocol/core", () => ({
  BASE_BUILDER_CODE: "bc_d0x2dqkv",
  BASE_CHAIN_ID: 8453,
  BASE_DATA_SUFFIX: MOCK_BASE_DATA_SUFFIX,
  getBaseDataSuffix: (chainId: number) =>
    chainId === 8453 ? MOCK_BASE_DATA_SUFFIX : undefined,
}));

// Import after mocks
import { encodeTransaction } from "../../shared/encode";

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
    const config = {
      to: TEST_CONTRACT_ADDRESS,
      functionName: "setValue" as const,
      args: [BigInt(42)],
      abi: TEST_ABI,
    };

    const encoded = encodeTransaction(config, TEST_CHAIN_ID);

    expect(encoded.to).toBe(TEST_CONTRACT_ADDRESS);
    expect(encoded.chainId).toBe(TEST_CHAIN_ID);
    expect(encoded.value).toBe("0");
    expect(encoded.data).toMatch(/^0x/);
    expect(encoded.data.length).toBeGreaterThan(2);
  });

  it("should include value when provided in config", () => {
    const config = {
      to: TEST_CONTRACT_ADDRESS,
      functionName: "setValue" as const,
      args: [BigInt(42)],
      abi: TEST_ABI,
      value: BigInt(1000000000000000000), // 1 ETH in wei
    };

    const encoded = encodeTransaction(config, TEST_CHAIN_ID);

    expect(encoded.value).toBe("1000000000000000000");
  });

  it("should default value to '0' when not provided", () => {
    const config = {
      to: TEST_CONTRACT_ADDRESS,
      functionName: "setValue" as const,
      args: [BigInt(42)],
      abi: TEST_ABI,
    };

    const encoded = encodeTransaction(config, TEST_CHAIN_ID);

    expect(encoded.value).toBe("0");
  });

  it("should include Base builder code suffix for Base chain (8453)", () => {
    const config = {
      to: TEST_CONTRACT_ADDRESS,
      functionName: "setValue" as const,
      args: [BigInt(42)],
      abi: TEST_ABI,
    };

    const rawCalldata = encodeFunctionData({
      abi: TEST_ABI,
      functionName: "setValue",
      args: [BigInt(42)],
    });

    const encoded = encodeTransaction(config, 8453);

    // Data should be longer than raw calldata (suffix appended)
    expect(encoded.data.length).toBeGreaterThan(rawCalldata.length);
    // Data should start with the raw calldata
    expect(encoded.data.startsWith(rawCalldata)).toBe(true);
    // The suffix should be appended (without its 0x prefix)
    expect(encoded.data).toBe(
      rawCalldata + MOCK_BASE_DATA_SUFFIX.slice(2)
    );
  });

  it("should not include Base builder code suffix for non-Base chains", () => {
    const config = {
      to: TEST_CONTRACT_ADDRESS,
      functionName: "setValue" as const,
      args: [BigInt(42)],
      abi: TEST_ABI,
    };

    const rawCalldata = encodeFunctionData({
      abi: TEST_ABI,
      functionName: "setValue",
      args: [BigInt(42)],
    });

    const encoded = encodeTransaction(config, 1); // Ethereum mainnet

    // On non-Base chains, data should be just the calldata
    expect(encoded.data).toBe(rawCalldata);
  });

  it("should use the provided chainId", () => {
    const config = {
      to: TEST_CONTRACT_ADDRESS,
      functionName: "setValue" as const,
      args: [BigInt(42)],
      abi: TEST_ABI,
    };

    const encoded1 = encodeTransaction(config, 1);
    const encoded2 = encodeTransaction(config, 8453);

    expect(encoded1.chainId).toBe(1);
    expect(encoded2.chainId).toBe(8453);
  });
});
