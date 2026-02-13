// Test constants
export const TEST_CHAIN_ID = 8453;
export const TEST_RPC_URL = "https://base-mainnet.public.blastapi.io";
export const TEST_PRIVATE_KEY = ("0x" + "1".repeat(64)) as `0x${string}`;
export const TEST_ACCOUNT_ADDRESS =
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0" as `0x${string}`;
export const TEST_TOKEN_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as `0x${string}`;
export const TEST_SEAPORT_ADDRESS =
  "0x0000000000000068F116a894984e2DB1123eB395" as `0x${string}`;
export const MOCK_TX_HASH = ("0x" + "b".repeat(64)) as `0x${string}`;
export const MOCK_SIGNATURE = ("0x" + "ab".repeat(65)) as `0x${string}`;
export const MOCK_ORDER_HASH = ("0x" + "cd".repeat(32)) as `0x${string}`;

// ERC20 approval ABI fragment
const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

// Seaport fulfill ABI fragment
const SEAPORT_FULFILL_ABI = [
  {
    type: "function",
    name: "fulfillAdvancedOrder",
    inputs: [
      { name: "advancedOrder", type: "tuple", components: [] },
      { name: "criteriaResolvers", type: "tuple[]", components: [] },
      { name: "fulfillerConduitKey", type: "bytes32" },
      { name: "recipient", type: "address" },
    ],
    outputs: [{ name: "fulfilled", type: "bool" }],
    stateMutability: "payable",
  },
] as const;

// Seaport validate ABI fragment (used by submit)
const SEAPORT_VALIDATE_ABI = [
  {
    type: "function",
    name: "validate",
    inputs: [
      { name: "orders", type: "tuple[]", components: [] },
    ],
    outputs: [{ name: "validated", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export function createMockEip712Data() {
  return {
    domain: {
      name: "Seaport",
      version: "1.6",
      chainId: TEST_CHAIN_ID,
      verifyingContract: TEST_SEAPORT_ADDRESS,
    },
    types: {
      OrderComponents: [
        { name: "offerer", type: "address" },
        { name: "zone", type: "address" },
        { name: "offer", type: "OfferItem[]" },
        { name: "consideration", type: "ConsiderationItem[]" },
        { name: "orderType", type: "uint8" },
        { name: "startTime", type: "uint256" },
        { name: "endTime", type: "uint256" },
        { name: "zoneHash", type: "bytes32" },
        { name: "salt", type: "uint256" },
        { name: "conduitKey", type: "bytes32" },
        { name: "counter", type: "uint256" },
      ],
      OfferItem: [
        { name: "itemType", type: "uint8" },
        { name: "token", type: "address" },
        { name: "identifierOrCriteria", type: "uint256" },
        { name: "startAmount", type: "uint256" },
        { name: "endAmount", type: "uint256" },
      ],
      ConsiderationItem: [
        { name: "itemType", type: "uint8" },
        { name: "token", type: "address" },
        { name: "identifierOrCriteria", type: "uint256" },
        { name: "startAmount", type: "uint256" },
        { name: "endAmount", type: "uint256" },
        { name: "recipient", type: "address" },
      ],
    },
    primaryType: "OrderComponents" as const,
    message: {
      offerer: TEST_ACCOUNT_ADDRESS,
      zone: TEST_SEAPORT_ADDRESS,
      offer: [
        {
          itemType: 1, // ERC20
          token: TEST_TOKEN_ADDRESS,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt("1000000000000000000"),
          endAmount: BigInt("1000000000000000000"),
        },
      ],
      consideration: [
        {
          itemType: 0, // NATIVE
          token: "0x0000000000000000000000000000000000000000" as `0x${string}`,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt("500000000000000000"),
          endAmount: BigInt("500000000000000000"),
          recipient: TEST_ACCOUNT_ADDRESS,
        },
      ],
      orderType: 2,
      startTime: BigInt(0),
      endTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
      zoneHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      salt: BigInt("12345678901234567890"),
      conduitKey:
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      counter: BigInt(5),
    },
    orderParameters: {
      offerer: TEST_ACCOUNT_ADDRESS,
      zone: TEST_SEAPORT_ADDRESS,
      offer: [
        {
          itemType: 1,
          token: TEST_TOKEN_ADDRESS,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt("1000000000000000000"),
          endAmount: BigInt("1000000000000000000"),
        },
      ],
      consideration: [
        {
          itemType: 0,
          token: "0x0000000000000000000000000000000000000000" as `0x${string}`,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt("500000000000000000"),
          endAmount: BigInt("500000000000000000"),
          recipient: TEST_ACCOUNT_ADDRESS,
        },
      ],
      orderType: 2,
      startTime: BigInt(0),
      endTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
      zoneHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      salt: BigInt("12345678901234567890"),
      conduitKey:
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      totalOriginalConsiderationItems: BigInt(1),
    },
    counter: BigInt(5),
  };
}

export function createMockPreparedOrder() {
  return {
    eip712: createMockEip712Data(),
    approvals: [
      {
        to: TEST_TOKEN_ADDRESS,
        functionName: "approve",
        args: [
          TEST_SEAPORT_ADDRESS,
          BigInt(
            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          ),
        ],
        abi: ERC20_APPROVE_ABI,
        value: undefined,
      },
    ],
  };
}

export function createMockPreparedFulfillment() {
  return {
    approvals: [] as Array<{
      to: `0x${string}`;
      functionName: string;
      args: readonly unknown[];
      abi: readonly unknown[];
      value?: bigint;
    }>,
    fulfillment: {
      to: TEST_SEAPORT_ADDRESS,
      functionName: "fulfillAdvancedOrder",
      args: [
        {
          parameters: createMockEip712Data().orderParameters,
          numerator: BigInt(1),
          denominator: BigInt(1),
          signature: MOCK_SIGNATURE,
          extraData: "0x" as `0x${string}`,
        },
        [],
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        TEST_ACCOUNT_ADDRESS,
      ],
      abi: SEAPORT_FULFILL_ABI,
      value: BigInt("500000000000000000"),
    },
  };
}

export function createMockSubmitTxConfig() {
  return {
    to: TEST_SEAPORT_ADDRESS,
    functionName: "validate",
    args: [
      [
        {
          parameters: createMockEip712Data().orderParameters,
          signature: MOCK_SIGNATURE,
        },
      ],
    ],
    abi: SEAPORT_VALIDATE_ABI,
    value: undefined,
  };
}

export function createMockErc20Listing() {
  return {
    maker: TEST_ACCOUNT_ADDRESS,
    tokenAddress: TEST_TOKEN_ADDRESS,
    tokenAmount: BigInt("1000000000000000000"),
    priceWei: BigInt("500000000000000000"),
    pricePerTokenWei: BigInt("500000000000000000"),
    price: 0.5,
    pricePerToken: 0.5,
    currency: "eth",
    expirationDate: Math.floor(Date.now() / 1000) + 86400,
    orderHash: MOCK_ORDER_HASH,
    orderStatus: 2, // OPEN
    messageData: "0x" as `0x${string}`,
  };
}

export function createMockErc20Offer() {
  return {
    maker: "0x3333333333333333333333333333333333333333" as `0x${string}`,
    tokenAddress: TEST_TOKEN_ADDRESS,
    tokenAmount: BigInt("1000000000000000000"),
    priceWei: BigInt("500000000000000000"),
    pricePerTokenWei: BigInt("500000000000000000"),
    price: 0.5,
    pricePerToken: 0.5,
    currency: "eth",
    expirationDate: Math.floor(Date.now() / 1000) + 86400,
    orderHash: MOCK_ORDER_HASH,
    orderStatus: 2, // OPEN
    messageData: "0x" as `0x${string}`,
  };
}

/**
 * Bankr API request/response types for validation
 */
export interface BankrSignRequest {
  signatureType:
    | "personal_sign"
    | "eth_signTypedData_v4"
    | "eth_signTransaction";
  typedData?: {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  };
}

export interface BankrSubmitRequest {
  transaction: {
    to: string;
    chainId: number;
    value?: string;
    data?: string;
    gas?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
  description?: string;
  waitForConfirmation?: boolean;
}
