export const BULK_SEAPORT_ORDER_STATUS_FETCHER_ABI = [
  { type: "constructor", inputs: [], stateMutability: "nonpayable" },
  {
    type: "function",
    name: "getOrderStatuses",
    inputs: [
      { name: "seaport", type: "address", internalType: "address" },
      { name: "orderHashes", type: "bytes32[]", internalType: "bytes32[]" },
    ],
    outputs: [
      {
        name: "results",
        type: "tuple[]",
        internalType: "struct BulkSeaportOrderStatusFetcher.OrderStatusInfo[]",
        components: [
          { name: "isValidated", type: "bool", internalType: "bool" },
          { name: "isCancelled", type: "bool", internalType: "bool" },
          { name: "totalFilled", type: "uint256", internalType: "uint256" },
          { name: "totalSize", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

export const ERC721_OWNER_OF_HELPER_ABI = [
  {
    type: "function",
    name: "getTokenOwners",
    inputs: [
      { name: "nftContract", type: "address", internalType: "address" },
      { name: "tokenIds", type: "uint256[]", internalType: "uint256[]" },
    ],
    outputs: [
      { name: "owners", type: "address[]", internalType: "address[]" },
    ],
    stateMutability: "view",
  },
  { type: "error", name: "InvalidAddress", inputs: [] },
  { type: "error", name: "TokenQueryFailed", inputs: [] },
] as const;

export const ERC20_BULK_BALANCE_CHECKER_ABI = [
  {
    type: "function",
    name: "getBalances",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "addresses", type: "address[]", internalType: "address[]" },
    ],
    outputs: [
      { name: "balances", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
] as const;
