export const BAZAAR_V2_ABI = [
  {
    type: "function",
    name: "submit",
    inputs: [
      {
        name: "submission",
        type: "tuple",
        internalType: "struct BazaarV1.Submission",
        components: [
          {
            name: "parameters",
            type: "tuple",
            internalType: "struct OrderParameters",
            components: [
              { name: "offerer", type: "address", internalType: "address" },
              { name: "zone", type: "address", internalType: "address" },
              {
                name: "offer",
                type: "tuple[]",
                internalType: "struct OfferItem[]",
                components: [
                  { name: "itemType", type: "uint8", internalType: "enum ItemType" },
                  { name: "token", type: "address", internalType: "address" },
                  { name: "identifierOrCriteria", type: "uint256", internalType: "uint256" },
                  { name: "startAmount", type: "uint256", internalType: "uint256" },
                  { name: "endAmount", type: "uint256", internalType: "uint256" },
                ],
              },
              {
                name: "consideration",
                type: "tuple[]",
                internalType: "struct ConsiderationItem[]",
                components: [
                  { name: "itemType", type: "uint8", internalType: "enum ItemType" },
                  { name: "token", type: "address", internalType: "address" },
                  { name: "identifierOrCriteria", type: "uint256", internalType: "uint256" },
                  { name: "startAmount", type: "uint256", internalType: "uint256" },
                  { name: "endAmount", type: "uint256", internalType: "uint256" },
                  { name: "recipient", type: "address", internalType: "address payable" },
                ],
              },
              { name: "orderType", type: "uint8", internalType: "enum OrderType" },
              { name: "startTime", type: "uint256", internalType: "uint256" },
              { name: "endTime", type: "uint256", internalType: "uint256" },
              { name: "zoneHash", type: "bytes32", internalType: "bytes32" },
              { name: "salt", type: "uint256", internalType: "uint256" },
              { name: "conduitKey", type: "bytes32", internalType: "bytes32" },
              { name: "totalOriginalConsiderationItems", type: "uint256", internalType: "uint256" },
            ],
          },
          { name: "counter", type: "uint256", internalType: "uint256" },
          { name: "signature", type: "bytes", internalType: "bytes" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Submitted",
    inputs: [
      { name: "tokenAddress", type: "address", indexed: true, internalType: "address" },
      { name: "tokenId", type: "uint256", indexed: true, internalType: "uint256" },
    ],
    anonymous: false,
  },
  { type: "error", name: "ConsiderationItemsMustContainTwoItems", inputs: [] },
  { type: "error", name: "OfferItemsMustContainOneItem", inputs: [] },
] as const;

export const BAZAAR_COLLECTION_OFFERS_ABI = [
  {
    type: "function",
    name: "NET_APP_NAME",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "submit",
    inputs: [
      {
        name: "submission",
        type: "tuple",
        internalType: "struct BazaarV2CollectionOffers.Submission",
        components: [
          {
            name: "parameters",
            type: "tuple",
            internalType: "struct OrderParameters",
            components: [
              { name: "offerer", type: "address", internalType: "address" },
              { name: "zone", type: "address", internalType: "address" },
              {
                name: "offer",
                type: "tuple[]",
                internalType: "struct OfferItem[]",
                components: [
                  { name: "itemType", type: "uint8", internalType: "enum ItemType" },
                  { name: "token", type: "address", internalType: "address" },
                  { name: "identifierOrCriteria", type: "uint256", internalType: "uint256" },
                  { name: "startAmount", type: "uint256", internalType: "uint256" },
                  { name: "endAmount", type: "uint256", internalType: "uint256" },
                ],
              },
              {
                name: "consideration",
                type: "tuple[]",
                internalType: "struct ConsiderationItem[]",
                components: [
                  { name: "itemType", type: "uint8", internalType: "enum ItemType" },
                  { name: "token", type: "address", internalType: "address" },
                  { name: "identifierOrCriteria", type: "uint256", internalType: "uint256" },
                  { name: "startAmount", type: "uint256", internalType: "uint256" },
                  { name: "endAmount", type: "uint256", internalType: "uint256" },
                  { name: "recipient", type: "address", internalType: "address payable" },
                ],
              },
              { name: "orderType", type: "uint8", internalType: "enum OrderType" },
              { name: "startTime", type: "uint256", internalType: "uint256" },
              { name: "endTime", type: "uint256", internalType: "uint256" },
              { name: "zoneHash", type: "bytes32", internalType: "bytes32" },
              { name: "salt", type: "uint256", internalType: "uint256" },
              { name: "conduitKey", type: "bytes32", internalType: "bytes32" },
              { name: "totalOriginalConsiderationItems", type: "uint256", internalType: "uint256" },
            ],
          },
          { name: "counter", type: "uint256", internalType: "uint256" },
          { name: "signature", type: "bytes", internalType: "bytes" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Submitted",
    inputs: [
      { name: "tokenAddress", type: "address", indexed: true, internalType: "address" },
      { name: "tokenId", type: "uint256", indexed: true, internalType: "uint256" },
    ],
    anonymous: false,
  },
  { type: "error", name: "ConsiderationItemsMustContainTwoItems", inputs: [] },
  { type: "error", name: "ConsiderationItemsMustIncludeFeeAddress", inputs: [] },
  { type: "error", name: "ConsiderationItemsMustIncludeMsgSender", inputs: [] },
  { type: "error", name: "InvalidFee", inputs: [] },
  { type: "error", name: "OfferItemsMustContainOneItem", inputs: [] },
] as const;
