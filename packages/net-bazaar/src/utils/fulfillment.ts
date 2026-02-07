/**
 * Fulfillment utilities for building Seaport fulfillOrder/fulfillAdvancedOrder transaction data
 */

import {
  SEAPORT_FULFILL_ORDER_ABI,
  SEAPORT_FULFILL_ADVANCED_ORDER_ABI,
} from "../abis";
import {
  SeaportSubmission,
  SeaportOrderParameters,
  ItemType,
  WriteTransactionConfig,
} from "../types";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

/**
 * Convert SeaportOrderParameters to the tuple format expected by Seaport ABI
 */
function formatOrderParameters(params: SeaportOrderParameters) {
  return {
    offerer: params.offerer,
    zone: params.zone,
    offer: params.offer.map((item) => ({
      itemType: item.itemType,
      token: item.token,
      identifierOrCriteria: item.identifierOrCriteria,
      startAmount: item.startAmount,
      endAmount: item.endAmount,
    })),
    consideration: params.consideration.map((item) => ({
      itemType: item.itemType,
      token: item.token,
      identifierOrCriteria: item.identifierOrCriteria,
      startAmount: item.startAmount,
      endAmount: item.endAmount,
      recipient: item.recipient,
    })),
    orderType: params.orderType,
    startTime: params.startTime,
    endTime: params.endTime,
    zoneHash: params.zoneHash,
    salt: params.salt,
    conduitKey: params.conduitKey,
    totalOriginalConsiderationItems: params.totalOriginalConsiderationItems,
  };
}

/**
 * Calculate the total native currency value needed from consideration items
 */
function getNativeConsiderationValue(params: SeaportOrderParameters): bigint {
  return params.consideration.reduce((acc, item) => {
    if (item.itemType === ItemType.NATIVE) {
      return acc + item.startAmount;
    }
    return acc;
  }, BigInt(0));
}

/**
 * Build a fulfillAdvancedOrder transaction for an NFT listing (buyer pays native currency for NFT).
 *
 * Uses fulfillAdvancedOrder (instead of fulfillOrder) to support both standard and
 * private listings — private listings use a restricted zone that requires the
 * advanced order path.
 *
 * @param submission - Decoded Seaport submission from the listing's messageData
 * @param recipient - Address to receive the NFT
 * @param seaportAddress - Seaport contract address
 * @returns WriteTransactionConfig with value set to the native currency payment
 */
export function buildFulfillListingTx(
  submission: SeaportSubmission,
  recipient: `0x${string}`,
  seaportAddress: `0x${string}`
): WriteTransactionConfig {
  const advancedOrder = {
    parameters: formatOrderParameters(submission.parameters),
    numerator: BigInt(1),
    denominator: BigInt(1),
    signature: submission.signature,
    extraData: "0x" as `0x${string}`,
  };

  return {
    to: seaportAddress,
    functionName: "fulfillAdvancedOrder",
    args: [advancedOrder, [], ZERO_BYTES32, recipient],
    abi: SEAPORT_FULFILL_ADVANCED_ORDER_ABI,
    value: getNativeConsiderationValue(submission.parameters),
  };
}

/**
 * Build a fulfillAdvancedOrder transaction for a collection offer.
 *
 * The fulfiller provides a specific NFT (tokenId) to satisfy the offerer's
 * ERC721_WITH_CRITERIA consideration item.
 *
 * @param submission - Decoded Seaport submission from the offer's messageData
 * @param tokenId - The specific token ID the fulfiller is providing
 * @param recipient - Address to receive the WETH payment
 * @param seaportAddress - Seaport contract address
 * @returns WriteTransactionConfig with value=0 (no native currency needed)
 */
export function buildFulfillCollectionOfferTx(
  submission: SeaportSubmission,
  tokenId: bigint,
  recipient: `0x${string}`,
  seaportAddress: `0x${string}`
): WriteTransactionConfig {
  const advancedOrder = {
    parameters: formatOrderParameters(submission.parameters),
    numerator: BigInt(1),
    denominator: BigInt(1),
    signature: submission.signature,
    extraData: "0x" as `0x${string}`,
  };

  // CriteriaResolver: resolve the NFT criteria item in consideration (side=1)
  const criteriaResolvers = [
    {
      orderIndex: BigInt(0),
      side: 1, // Consideration side
      index: BigInt(0), // First consideration item (the NFT)
      identifier: tokenId,
      criteriaProof: [] as `0x${string}`[],
    },
  ];

  return {
    to: seaportAddress,
    functionName: "fulfillAdvancedOrder",
    args: [advancedOrder, criteriaResolvers, ZERO_BYTES32, recipient],
    abi: SEAPORT_FULFILL_ADVANCED_ORDER_ABI,
    value: BigInt(0),
  };
}

/**
 * Build a fulfillOrder transaction for an ERC20 offer (seller provides ERC20 tokens, buyer pays WETH).
 *
 * @param submission - Decoded Seaport submission from the offer's messageData
 * @param seaportAddress - Seaport contract address
 * @returns WriteTransactionConfig with value=0 (no native currency needed)
 */
export function buildFulfillErc20OfferTx(
  submission: SeaportSubmission,
  seaportAddress: `0x${string}`
): WriteTransactionConfig {
  const order = {
    parameters: formatOrderParameters(submission.parameters),
    signature: submission.signature,
  };

  return {
    to: seaportAddress,
    functionName: "fulfillOrder",
    args: [order, ZERO_BYTES32],
    abi: SEAPORT_FULFILL_ORDER_ABI,
    value: BigInt(0),
  };
}

/**
 * Build a fulfillAdvancedOrder transaction for an ERC20 listing (buyer pays native currency for ERC20 tokens).
 *
 * Uses fulfillAdvancedOrder to support both standard and private listings.
 *
 * @param submission - Decoded Seaport submission from the listing's messageData
 * @param recipient - Address to receive the ERC20 tokens
 * @param seaportAddress - Seaport contract address
 * @returns WriteTransactionConfig with value set to the native currency payment
 */
export function buildFulfillErc20ListingTx(
  submission: SeaportSubmission,
  recipient: `0x${string}`,
  seaportAddress: `0x${string}`
): WriteTransactionConfig {
  const advancedOrder = {
    parameters: formatOrderParameters(submission.parameters),
    numerator: BigInt(1),
    denominator: BigInt(1),
    signature: submission.signature,
    extraData: "0x" as `0x${string}`,
  };

  return {
    to: seaportAddress,
    functionName: "fulfillAdvancedOrder",
    args: [advancedOrder, [], ZERO_BYTES32, recipient],
    abi: SEAPORT_FULFILL_ADVANCED_ORDER_ABI,
    value: getNativeConsiderationValue(submission.parameters),
  };
}
