import { vi } from "vitest";

// Test constants
export const TEST_CHAIN_ID = 8453;
export const TEST_RPC_URL = "https://base-mainnet.public.blastapi.io";
export const TEST_OPERATOR = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" as `0x${string}`;
export const TEST_PRIVATE_KEY = ("0x" + "1".repeat(64)) as `0x${string}`;
export const TEST_TOKEN_ADDRESS = ("0x" + "a".repeat(40)) as `0x${string}`;
export const MOCK_TX_HASH = ("0x" + "b".repeat(64)) as `0x${string}`;
export const MOCK_SALT = ("0x" + "c".repeat(64)) as `0x${string}`;

// Mock token metadata
export function createMockTokenMetadata(overrides: Partial<{
  name: string;
  symbol: string;
  deployer: `0x${string}`;
  image: string;
  animation: string;
  fid: bigint;
  totalSupply: bigint;
  decimals: number;
  extraStringData: string;
}> = {}) {
  return {
    name: overrides.name ?? "Test Token",
    symbol: overrides.symbol ?? "TEST",
    deployer: overrides.deployer ?? TEST_OPERATOR,
    image: overrides.image ?? "https://example.com/image.png",
    animation: overrides.animation ?? "",
    fid: overrides.fid ?? 0n,
    totalSupply: overrides.totalSupply ?? BigInt("100000000000000000000000000"),
    decimals: overrides.decimals ?? 18,
    extraStringData: overrides.extraStringData ?? "",
  };
}

// Mock storage data
export function createMockStorageData(overrides: Partial<{
  messageIndex: bigint;
  dropIndex: bigint;
  dropAddress: `0x${string}`;
  poolAddress: `0x${string}`;
  lockerAddress: `0x${string}`;
}> = {}) {
  return {
    messageIndex: overrides.messageIndex ?? 1n,
    dropIndex: overrides.dropIndex ?? undefined,
    dropAddress: overrides.dropAddress ?? undefined,
    poolAddress: overrides.poolAddress ?? ("0x" + "d".repeat(40)) as `0x${string}`,
    lockerAddress: overrides.lockerAddress ?? ("0x" + "e".repeat(40)) as `0x${string}`,
  };
}

// Mock price data
export function createMockPriceData(overrides: Partial<{
  priceInWeth: number;
  priceInEth: number;
  sqrtPriceX96: bigint;
  tick: number;
}> = {}) {
  return {
    priceInWeth: overrides.priceInWeth ?? 0.0001,
    priceInEth: overrides.priceInEth ?? 0.0001,
    sqrtPriceX96: overrides.sqrtPriceX96 ?? BigInt(2) ** BigInt(96),
    tick: overrides.tick ?? -230400,
  };
}

// Mock locker data
export function createMockLockerData(overrides: Partial<{
  owner: `0x${string}`;
  duration: bigint;
  endTimestamp: bigint;
  version: string;
}> = {}) {
  return {
    owner: overrides.owner ?? TEST_OPERATOR,
    duration: overrides.duration ?? BigInt(365 * 24 * 60 * 60), // 1 year in seconds
    endTimestamp: overrides.endTimestamp ?? BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60),
    version: overrides.version ?? "1.0.0",
  };
}

// Mock salt result
export function createMockSaltResult(overrides: Partial<{
  salt: `0x${string}`;
  predictedAddress: `0x${string}`;
}> = {}) {
  return {
    salt: overrides.salt ?? MOCK_SALT,
    predictedAddress: overrides.predictedAddress ?? TEST_TOKEN_ADDRESS,
  };
}

// Mock deploy tx config
export function createMockDeployTxConfig(overrides: Partial<{
  address: `0x${string}`;
  functionName: string;
  chainId: number;
  value?: bigint;
}> = {}) {
  return {
    address: overrides.address ?? ("0x" + "f".repeat(40)) as `0x${string}`,
    abi: [
      {
        type: "function",
        name: "deployToken",
        inputs: [],
        outputs: [],
        stateMutability: "payable",
      },
    ],
    functionName: overrides.functionName ?? "deployToken",
    args: [
      BigInt("100000000000000000000000000"), // totalSupply
      -230400, // initialTick
      MOCK_SALT, // salt
      TEST_OPERATOR, // deployer
      0n, // fid
      0n, // mintPrice
      0n, // mintEndTimestamp
      0n, // maxMintSupply
      "Test Token", // name
      "TEST", // symbol
      "https://example.com/image.png", // image
      "", // animation
      "0x0000000000000000000000000000000000000000", // metadataAddress
      "", // extraStringData
    ] as const,
    chainId: overrides.chainId ?? TEST_CHAIN_ID,
    ...(overrides.value !== undefined && { value: overrides.value }),
  };
}

// Mock NetrClient
export function createMockNetrClient() {
  return {
    getToken: vi.fn(),
    getStorageData: vi.fn(),
    getPrice: vi.fn(),
    getPriceFromPool: vi.fn(),
    getLocker: vi.fn(),
    generateSalt: vi.fn(),
    buildDeployConfig: vi.fn(),
    getChainId: vi.fn().mockReturnValue(TEST_CHAIN_ID),
  };
}
