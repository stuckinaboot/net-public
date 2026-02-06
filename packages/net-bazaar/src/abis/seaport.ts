/**
 * Minimal Seaport ABI for cancel operations
 */
export const SEAPORT_CANCEL_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "offerer", type: "address" },
          { internalType: "address", name: "zone", type: "address" },
          {
            components: [
              { internalType: "enum ItemType", name: "itemType", type: "uint8" },
              { internalType: "address", name: "token", type: "address" },
              { internalType: "uint256", name: "identifierOrCriteria", type: "uint256" },
              { internalType: "uint256", name: "startAmount", type: "uint256" },
              { internalType: "uint256", name: "endAmount", type: "uint256" },
            ],
            internalType: "struct OfferItem[]",
            name: "offer",
            type: "tuple[]",
          },
          {
            components: [
              { internalType: "enum ItemType", name: "itemType", type: "uint8" },
              { internalType: "address", name: "token", type: "address" },
              { internalType: "uint256", name: "identifierOrCriteria", type: "uint256" },
              { internalType: "uint256", name: "startAmount", type: "uint256" },
              { internalType: "uint256", name: "endAmount", type: "uint256" },
              { internalType: "address payable", name: "recipient", type: "address" },
            ],
            internalType: "struct ConsiderationItem[]",
            name: "consideration",
            type: "tuple[]",
          },
          { internalType: "enum OrderType", name: "orderType", type: "uint8" },
          { internalType: "uint256", name: "startTime", type: "uint256" },
          { internalType: "uint256", name: "endTime", type: "uint256" },
          { internalType: "bytes32", name: "zoneHash", type: "bytes32" },
          { internalType: "uint256", name: "salt", type: "uint256" },
          { internalType: "bytes32", name: "conduitKey", type: "bytes32" },
          { internalType: "uint256", name: "counter", type: "uint256" },
        ],
        internalType: "struct OrderComponents[]",
        name: "orders",
        type: "tuple[]",
      },
    ],
    name: "cancel",
    outputs: [{ internalType: "bool", name: "cancelled", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Shared ABI fragments for OrderParameters, OfferItem, and ConsiderationItem
const ORDER_PARAMETERS_COMPONENTS = [
  { internalType: "address", name: "offerer", type: "address" },
  { internalType: "address", name: "zone", type: "address" },
  {
    components: [
      { internalType: "enum ItemType", name: "itemType", type: "uint8" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "identifierOrCriteria", type: "uint256" },
      { internalType: "uint256", name: "startAmount", type: "uint256" },
      { internalType: "uint256", name: "endAmount", type: "uint256" },
    ],
    internalType: "struct OfferItem[]",
    name: "offer",
    type: "tuple[]",
  },
  {
    components: [
      { internalType: "enum ItemType", name: "itemType", type: "uint8" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "identifierOrCriteria", type: "uint256" },
      { internalType: "uint256", name: "startAmount", type: "uint256" },
      { internalType: "uint256", name: "endAmount", type: "uint256" },
      { internalType: "address payable", name: "recipient", type: "address" },
    ],
    internalType: "struct ConsiderationItem[]",
    name: "consideration",
    type: "tuple[]",
  },
  { internalType: "enum OrderType", name: "orderType", type: "uint8" },
  { internalType: "uint256", name: "startTime", type: "uint256" },
  { internalType: "uint256", name: "endTime", type: "uint256" },
  { internalType: "bytes32", name: "zoneHash", type: "bytes32" },
  { internalType: "uint256", name: "salt", type: "uint256" },
  { internalType: "bytes32", name: "conduitKey", type: "bytes32" },
  { internalType: "uint256", name: "totalOriginalConsiderationItems", type: "uint256" },
] as const;

/**
 * Seaport fulfillOrder ABI
 */
export const SEAPORT_FULFILL_ORDER_ABI = [
  {
    inputs: [
      {
        components: [
          {
            components: ORDER_PARAMETERS_COMPONENTS,
            internalType: "struct OrderParameters",
            name: "parameters",
            type: "tuple",
          },
          { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        internalType: "struct Order",
        name: "",
        type: "tuple",
      },
      { internalType: "bytes32", name: "fulfillerConduitKey", type: "bytes32" },
    ],
    name: "fulfillOrder",
    outputs: [{ internalType: "bool", name: "fulfilled", type: "bool" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

/**
 * Seaport fulfillAdvancedOrder ABI
 */
export const SEAPORT_FULFILL_ADVANCED_ORDER_ABI = [
  {
    inputs: [
      {
        components: [
          {
            components: ORDER_PARAMETERS_COMPONENTS,
            internalType: "struct OrderParameters",
            name: "parameters",
            type: "tuple",
          },
          { internalType: "uint120", name: "numerator", type: "uint120" },
          { internalType: "uint120", name: "denominator", type: "uint120" },
          { internalType: "bytes", name: "signature", type: "bytes" },
          { internalType: "bytes", name: "extraData", type: "bytes" },
        ],
        internalType: "struct AdvancedOrder",
        name: "",
        type: "tuple",
      },
      {
        components: [
          { internalType: "uint256", name: "orderIndex", type: "uint256" },
          { internalType: "enum Side", name: "side", type: "uint8" },
          { internalType: "uint256", name: "index", type: "uint256" },
          { internalType: "uint256", name: "identifier", type: "uint256" },
          { internalType: "bytes32[]", name: "criteriaProof", type: "bytes32[]" },
        ],
        internalType: "struct CriteriaResolver[]",
        name: "",
        type: "tuple[]",
      },
      { internalType: "bytes32", name: "fulfillerConduitKey", type: "bytes32" },
      { internalType: "address", name: "recipient", type: "address" },
    ],
    name: "fulfillAdvancedOrder",
    outputs: [{ internalType: "bool", name: "fulfilled", type: "bool" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

/**
 * Seaport getCounter ABI
 */
export const SEAPORT_GET_COUNTER_ABI = [
  {
    inputs: [{ internalType: "address", name: "offerer", type: "address" }],
    name: "getCounter",
    outputs: [{ internalType: "uint256", name: "counter", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * ERC721 approval ABIs (isApprovedForAll + setApprovalForAll)
 */
export const ERC721_APPROVAL_ABI = [
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * ERC20 approval ABIs (allowance + approve)
 */
export const ERC20_APPROVAL_ABI = [
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
