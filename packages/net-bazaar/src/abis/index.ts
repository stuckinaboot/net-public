export { BAZAAR_V2_ABI, BAZAAR_COLLECTION_OFFERS_ABI, BAZAAR_ERC20_OFFERS_ABI } from "./bazaarV2";
export {
  BULK_SEAPORT_ORDER_STATUS_FETCHER_ABI,
  ERC721_OWNER_OF_HELPER_ABI,
  ERC20_BULK_BALANCE_CHECKER_ABI,
} from "./helpers";
export {
  SEAPORT_CANCEL_ABI,
  SEAPORT_FULFILL_ORDER_ABI,
  SEAPORT_FULFILL_ADVANCED_ORDER_ABI,
  SEAPORT_GET_COUNTER_ABI,
  ERC721_APPROVAL_ABI,
  ERC20_APPROVAL_ABI,
} from "./seaport";

/**
 * ABI for decoding Seaport submission from Net message data
 */
export const BAZAAR_SUBMISSION_ABI = [
  {
    name: "submission",
    type: "tuple",
    internalType: "struct BazaarV2.Submission",
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
] as const;
