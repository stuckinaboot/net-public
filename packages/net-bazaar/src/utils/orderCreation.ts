/**
 * Order creation utilities for building EIP-712 typed data and Bazaar submit transactions
 */

import { keccak256, toBytes } from "viem";
import {
  SeaportOrderParameters,
  EIP712OrderData,
  WriteTransactionConfig,
  ItemType,
  OrderType,
  CreateListingParams,
  CreateCollectionOfferParams,
  CreateErc20OfferParams,
  CreateErc20ListingParams,
} from "../types";
import {
  BAZAAR_V2_ABI,
  BAZAAR_COLLECTION_OFFERS_ABI,
  BAZAAR_ERC20_OFFERS_ABI,
} from "../abis";
import {
  getSeaportAddress,
  getFeeCollectorAddress,
  getNftFeeBps,
  getWrappedNativeCurrency,
  NET_SEAPORT_ZONE_ADDRESS,
  NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS,
  NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS,
} from "../chainConfig";

// EIP-712 constants
const SEAPORT_EIP712_DOMAIN_NAME = "Seaport";
const SEAPORT_EIP712_DOMAIN_VERSION = "1.6";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * EIP-712 type definitions for Seaport OrderComponents.
 *
 * Important: OrderComponents has `counter` at the end, NOT `totalOriginalConsiderationItems`.
 * This matches the Seaport contract's EIP-712 domain.
 */
const SEAPORT_ORDER_EIP712_TYPES = {
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
} as const;

/**
 * Calculate fee amount.
 *
 * - NFTs use floor division: `(price * bps) / 10000`
 * - ERC20s use ceiling division: `(price * bps + 9999) / 10000`
 */
export function calculateFee(
  price: bigint,
  feeBps: number,
  useCeilingDivision: boolean
): bigint {
  if (feeBps === 0) return BigInt(0);

  const fee = price * BigInt(feeBps);
  if (useCeilingDivision) {
    return (fee + BigInt(9999)) / BigInt(10000);
  }
  return fee / BigInt(10000);
}

/**
 * Generate a random salt for order uniqueness
 */
export function generateSalt(): bigint {
  const bytes = new Uint8Array(32);
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let hex = "0x";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return BigInt(hex);
}

/**
 * Get default expiration timestamp (24 hours from now, in seconds)
 */
export function getDefaultExpiration(): number {
  return Math.floor(Date.now() / 1000) + 86400;
}

/**
 * Build order components for an NFT listing.
 *
 * Offer: one ERC721 item
 * Consideration: native currency payment to offerer + optional fee to feeCollector
 */
export function buildListingOrderComponents(
  params: CreateListingParams & { offerer: `0x${string}`; targetFulfiller?: `0x${string}` },
  chainId: number,
  counter: bigint
): { orderParameters: SeaportOrderParameters; counter: bigint } {
  const feeBps = getNftFeeBps(chainId);
  const feeAmount = calculateFee(params.priceWei, feeBps, false);
  const sellerAmount = params.priceWei - feeAmount;
  const endTime = BigInt(params.expirationDate ?? getDefaultExpiration());
  const feeCollector = getFeeCollectorAddress(chainId);

  const consideration = [
    {
      itemType: ItemType.NATIVE,
      token: ZERO_ADDRESS as `0x${string}`,
      identifierOrCriteria: BigInt(0),
      startAmount: sellerAmount,
      endAmount: sellerAmount,
      recipient: params.offerer,
    },
  ];

  if (feeAmount > BigInt(0)) {
    consideration.push({
      itemType: ItemType.NATIVE,
      token: ZERO_ADDRESS as `0x${string}`,
      identifierOrCriteria: BigInt(0),
      startAmount: feeAmount,
      endAmount: feeAmount,
      recipient: feeCollector,
    });
  }

  // Private order support
  let zone: `0x${string}`;
  let zoneHash: `0x${string}`;

  if (params.targetFulfiller) {
    zone = NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS;
    // zoneHash is keccak256 of the raw address bytes (20 bytes)
    zoneHash = keccak256(toBytes(params.targetFulfiller));
  } else {
    zone = NET_SEAPORT_ZONE_ADDRESS;
    zoneHash = ZERO_BYTES32;
  }

  const orderParameters: SeaportOrderParameters = {
    offerer: params.offerer,
    zone,
    offer: [
      {
        itemType: ItemType.ERC721,
        token: params.nftAddress,
        identifierOrCriteria: BigInt(params.tokenId),
        startAmount: BigInt(1),
        endAmount: BigInt(1),
      },
    ],
    consideration,
    orderType: OrderType.FULL_RESTRICTED,
    startTime: BigInt(0),
    endTime,
    zoneHash,
    salt: generateSalt(),
    conduitKey: ZERO_BYTES32,
    totalOriginalConsiderationItems: BigInt(consideration.length),
  };

  return { orderParameters, counter };
}

/**
 * Build order components for a collection offer.
 *
 * Offer: WETH payment
 * Consideration: ERC721_WITH_CRITERIA (any token from collection) to offerer + optional fee
 */
export function buildCollectionOfferOrderComponents(
  params: CreateCollectionOfferParams & { offerer: `0x${string}` },
  chainId: number,
  counter: bigint
): { orderParameters: SeaportOrderParameters; counter: bigint } {
  const weth = getWrappedNativeCurrency(chainId);
  if (!weth) {
    throw new Error(`No wrapped native currency configured for chain ${chainId}`);
  }

  const feeBps = getNftFeeBps(chainId);
  const feeAmount = calculateFee(params.priceWei, feeBps, false);
  const endTime = BigInt(params.expirationDate ?? getDefaultExpiration());
  const feeCollector = getFeeCollectorAddress(chainId);

  const consideration = [
    {
      itemType: ItemType.ERC721_WITH_CRITERIA,
      token: params.nftAddress,
      identifierOrCriteria: BigInt(0), // Any token in the collection
      startAmount: BigInt(1),
      endAmount: BigInt(1),
      recipient: params.offerer,
    },
  ];

  if (feeAmount > BigInt(0)) {
    consideration.push({
      itemType: ItemType.ERC20,
      token: weth.address,
      identifierOrCriteria: BigInt(0),
      startAmount: feeAmount,
      endAmount: feeAmount,
      recipient: feeCollector,
    });
  }

  const orderParameters: SeaportOrderParameters = {
    offerer: params.offerer,
    zone: NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS,
    offer: [
      {
        itemType: ItemType.ERC20,
        token: weth.address,
        identifierOrCriteria: BigInt(0),
        startAmount: params.priceWei,
        endAmount: params.priceWei,
      },
    ],
    consideration,
    orderType: OrderType.FULL_RESTRICTED,
    startTime: BigInt(0),
    endTime,
    zoneHash: ZERO_BYTES32,
    salt: generateSalt(),
    conduitKey: ZERO_BYTES32,
    totalOriginalConsiderationItems: BigInt(consideration.length),
  };

  return { orderParameters, counter };
}

/**
 * Build order components for an ERC20 offer (buying ERC20 tokens with WETH).
 *
 * Offer: WETH payment
 * Consideration: ERC20 tokens to offerer + optional WETH fee to feeCollector
 */
export function buildErc20OfferOrderComponents(
  params: CreateErc20OfferParams & { offerer: `0x${string}` },
  chainId: number,
  counter: bigint
): { orderParameters: SeaportOrderParameters; counter: bigint } {
  const weth = getWrappedNativeCurrency(chainId);
  if (!weth) {
    throw new Error(`No wrapped native currency configured for chain ${chainId}`);
  }

  const feeBps = getNftFeeBps(chainId);
  const feeAmount = calculateFee(params.priceWei, feeBps, true); // Ceiling division for ERC20s
  const endTime = BigInt(params.expirationDate ?? getDefaultExpiration());
  const feeCollector = getFeeCollectorAddress(chainId);

  const consideration = [
    {
      itemType: ItemType.ERC20,
      token: params.tokenAddress,
      identifierOrCriteria: BigInt(0),
      startAmount: params.tokenAmount,
      endAmount: params.tokenAmount,
      recipient: params.offerer,
    },
  ];

  if (feeAmount > BigInt(0)) {
    consideration.push({
      itemType: ItemType.ERC20,
      token: weth.address,
      identifierOrCriteria: BigInt(0),
      startAmount: feeAmount,
      endAmount: feeAmount,
      recipient: feeCollector,
    });
  }

  const orderParameters: SeaportOrderParameters = {
    offerer: params.offerer,
    zone: NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS,
    offer: [
      {
        itemType: ItemType.ERC20,
        token: weth.address,
        identifierOrCriteria: BigInt(0),
        startAmount: params.priceWei,
        endAmount: params.priceWei,
      },
    ],
    consideration,
    orderType: OrderType.FULL_RESTRICTED,
    startTime: BigInt(0),
    endTime,
    zoneHash: ZERO_BYTES32,
    salt: generateSalt(),
    conduitKey: ZERO_BYTES32,
    totalOriginalConsiderationItems: BigInt(consideration.length),
  };

  return { orderParameters, counter };
}

/**
 * Build order components for an ERC20 listing (selling ERC20 tokens for native currency).
 *
 * Offer: ERC20 tokens
 * Consideration: native currency payment to offerer + optional fee to feeCollector
 */
export function buildErc20ListingOrderComponents(
  params: CreateErc20ListingParams & { offerer: `0x${string}`; targetFulfiller?: `0x${string}` },
  chainId: number,
  counter: bigint
): { orderParameters: SeaportOrderParameters; counter: bigint } {
  const feeBps = getNftFeeBps(chainId);
  const feeAmount = calculateFee(params.priceWei, feeBps, true); // Ceiling division for ERC20s
  const sellerAmount = params.priceWei - feeAmount;
  const endTime = BigInt(params.expirationDate ?? getDefaultExpiration());
  const feeCollector = getFeeCollectorAddress(chainId);

  const consideration = [
    {
      itemType: ItemType.NATIVE,
      token: ZERO_ADDRESS as `0x${string}`,
      identifierOrCriteria: BigInt(0),
      startAmount: sellerAmount,
      endAmount: sellerAmount,
      recipient: params.offerer,
    },
  ];

  if (feeAmount > BigInt(0)) {
    consideration.push({
      itemType: ItemType.NATIVE,
      token: ZERO_ADDRESS as `0x${string}`,
      identifierOrCriteria: BigInt(0),
      startAmount: feeAmount,
      endAmount: feeAmount,
      recipient: feeCollector,
    });
  }

  // Private order support
  let zone: `0x${string}`;
  let zoneHash: `0x${string}`;

  if (params.targetFulfiller) {
    zone = NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS;
    // zoneHash is keccak256 of the raw address bytes (20 bytes)
    zoneHash = keccak256(toBytes(params.targetFulfiller));
  } else {
    zone = NET_SEAPORT_ZONE_ADDRESS;
    zoneHash = ZERO_BYTES32;
  }

  const orderParameters: SeaportOrderParameters = {
    offerer: params.offerer,
    zone,
    offer: [
      {
        itemType: ItemType.ERC20,
        token: params.tokenAddress,
        identifierOrCriteria: BigInt(0),
        startAmount: params.tokenAmount,
        endAmount: params.tokenAmount,
      },
    ],
    consideration,
    orderType: OrderType.FULL_RESTRICTED,
    startTime: BigInt(0),
    endTime,
    zoneHash,
    salt: generateSalt(),
    conduitKey: ZERO_BYTES32,
    totalOriginalConsiderationItems: BigInt(consideration.length),
  };

  return { orderParameters, counter };
}

/**
 * Build EIP-712 typed data for a Seaport order.
 *
 * The message object uses `counter` instead of `totalOriginalConsiderationItems`,
 * matching Seaport's EIP-712 domain specification.
 */
export function buildEIP712OrderData(
  orderParameters: SeaportOrderParameters,
  counter: bigint,
  chainId: number,
  seaportAddress: `0x${string}`
): EIP712OrderData {
  // Build the EIP-712 message: OrderComponents (parameters without totalOriginalConsiderationItems, with counter)
  const message: Record<string, unknown> = {
    offerer: orderParameters.offerer,
    zone: orderParameters.zone,
    offer: orderParameters.offer.map((item) => ({
      itemType: item.itemType,
      token: item.token,
      identifierOrCriteria: item.identifierOrCriteria,
      startAmount: item.startAmount,
      endAmount: item.endAmount,
    })),
    consideration: orderParameters.consideration.map((item) => ({
      itemType: item.itemType,
      token: item.token,
      identifierOrCriteria: item.identifierOrCriteria,
      startAmount: item.startAmount,
      endAmount: item.endAmount,
      recipient: item.recipient,
    })),
    orderType: orderParameters.orderType,
    startTime: orderParameters.startTime,
    endTime: orderParameters.endTime,
    zoneHash: orderParameters.zoneHash,
    salt: orderParameters.salt,
    conduitKey: orderParameters.conduitKey,
    counter,
  };

  return {
    domain: {
      name: SEAPORT_EIP712_DOMAIN_NAME,
      version: SEAPORT_EIP712_DOMAIN_VERSION,
      chainId,
      verifyingContract: seaportAddress,
    },
    types: SEAPORT_ORDER_EIP712_TYPES as unknown as Record<string, Array<{ name: string; type: string }>>,
    primaryType: "OrderComponents",
    message,
    orderParameters,
    counter,
  };
}

/**
 * Build a submit transaction for a Bazaar contract (NFT listings, collection offers, ERC20 offers/listings).
 *
 * @param contractAddress - The Bazaar contract address to submit to
 * @param abi - The contract ABI (BAZAAR_V2_ABI, BAZAAR_COLLECTION_OFFERS_ABI, or BAZAAR_ERC20_OFFERS_ABI)
 * @param orderParameters - The signed order parameters
 * @param counter - The order counter
 * @param signature - The EIP-712 signature from the offerer
 */
export function buildSubmitOrderTx(
  contractAddress: `0x${string}`,
  abi: readonly unknown[],
  orderParameters: SeaportOrderParameters,
  counter: bigint,
  signature: `0x${string}`
): WriteTransactionConfig {
  const submission = {
    parameters: {
      offerer: orderParameters.offerer,
      zone: orderParameters.zone,
      offer: orderParameters.offer.map((item) => ({
        itemType: item.itemType,
        token: item.token,
        identifierOrCriteria: item.identifierOrCriteria,
        startAmount: item.startAmount,
        endAmount: item.endAmount,
      })),
      consideration: orderParameters.consideration.map((item) => ({
        itemType: item.itemType,
        token: item.token,
        identifierOrCriteria: item.identifierOrCriteria,
        startAmount: item.startAmount,
        endAmount: item.endAmount,
        recipient: item.recipient,
      })),
      orderType: orderParameters.orderType,
      startTime: orderParameters.startTime,
      endTime: orderParameters.endTime,
      zoneHash: orderParameters.zoneHash,
      salt: orderParameters.salt,
      conduitKey: orderParameters.conduitKey,
      totalOriginalConsiderationItems: orderParameters.totalOriginalConsiderationItems,
    },
    counter,
    signature,
  };

  return {
    to: contractAddress,
    functionName: "submit",
    args: [submission],
    abi,
  };
}
