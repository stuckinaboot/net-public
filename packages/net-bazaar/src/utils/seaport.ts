/**
 * Seaport-related utilities for decoding and computing order hashes
 */

import { decodeAbiParameters, formatEther } from "viem";
import { Seaport } from "@opensea/seaport-js";
import { ethers } from "ethers";
import { BAZAAR_SUBMISSION_ABI } from "../abis";
import {
  SeaportSubmission,
  SeaportOrderParameters,
  SeaportOrderStatus,
  SeaportOrderStatusInfo,
} from "../types";
import { getSeaportAddress, getHighEthAddress } from "../chainConfig";

/**
 * Decode Seaport submission from Net message data
 */
export function decodeSeaportSubmission(messageData: `0x${string}`): SeaportSubmission {
  const [decoded] = decodeAbiParameters(BAZAAR_SUBMISSION_ABI, messageData);

  return {
    parameters: {
      offerer: decoded.parameters.offerer as `0x${string}`,
      zone: decoded.parameters.zone as `0x${string}`,
      offer: decoded.parameters.offer.map((item: any) => ({
        itemType: item.itemType,
        token: item.token as `0x${string}`,
        identifierOrCriteria: BigInt(item.identifierOrCriteria),
        startAmount: BigInt(item.startAmount),
        endAmount: BigInt(item.endAmount),
      })),
      consideration: decoded.parameters.consideration.map((item: any) => ({
        itemType: item.itemType,
        token: item.token as `0x${string}`,
        identifierOrCriteria: BigInt(item.identifierOrCriteria),
        startAmount: BigInt(item.startAmount),
        endAmount: BigInt(item.endAmount),
        recipient: item.recipient as `0x${string}`,
      })),
      orderType: decoded.parameters.orderType,
      startTime: BigInt(decoded.parameters.startTime),
      endTime: BigInt(decoded.parameters.endTime),
      zoneHash: decoded.parameters.zoneHash as `0x${string}`,
      salt: BigInt(decoded.parameters.salt),
      conduitKey: decoded.parameters.conduitKey as `0x${string}`,
      totalOriginalConsiderationItems: BigInt(decoded.parameters.totalOriginalConsiderationItems),
    },
    counter: BigInt(decoded.counter),
    signature: decoded.signature as `0x${string}`,
  };
}

/**
 * Get Seaport order from message data with string identifiers
 * (needed for Seaport SDK compatibility)
 */
export function getSeaportOrderFromMessageData(messageData: `0x${string}`): {
  parameters: any;
  signature: `0x${string}`;
  counter: bigint;
} {
  const submission = decodeSeaportSubmission(messageData);

  return {
    parameters: {
      ...submission.parameters,
      // Convert BigInts to strings for Seaport SDK compatibility
      offer: submission.parameters.offer.map((item) => ({
        ...item,
        identifierOrCriteria: item.identifierOrCriteria.toString(),
        startAmount: item.startAmount.toString(),
        endAmount: item.endAmount.toString(),
      })),
      consideration: submission.parameters.consideration.map((item) => ({
        ...item,
        identifierOrCriteria: item.identifierOrCriteria.toString(),
        startAmount: item.startAmount.toString(),
        endAmount: item.endAmount.toString(),
      })),
      startTime: submission.parameters.startTime.toString(),
      endTime: submission.parameters.endTime.toString(),
      salt: submission.parameters.salt.toString(),
      totalOriginalConsiderationItems: submission.parameters.totalOriginalConsiderationItems.toString(),
      counter: submission.counter.toString(),
    },
    signature: submission.signature,
    counter: submission.counter,
  };
}

/**
 * Create a Seaport instance for a chain using a public RPC
 */
export function createSeaportInstance(chainId: number, rpcUrl: string): Seaport {
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Use a dummy signer for read-only operations
  const signer = new ethers.Wallet(
    // Random private key for read-only operations
    "dc63e9af2088e2afd61499411cb6dd718d00a3d9e46e2cb5e33912c781bd77fe",
    provider
  );

  // Override getAddress to return a high-balance address for checks
  const highEthAddress = getHighEthAddress(chainId);
  const finalSigner = highEthAddress
    ? {
        ...signer,
        getAddress: () => highEthAddress,
        address: highEthAddress,
      }
    : signer;

  return new Seaport(finalSigner as any, {
    overrides: { contractAddress: getSeaportAddress(chainId) },
  });
}

/**
 * Compute Seaport order hash
 */
export function computeOrderHash(
  seaport: Seaport,
  orderParameters: any,
  counter: bigint | string
): string {
  return seaport.getOrderHash({
    ...orderParameters,
    counter: counter.toString(),
  });
}

/**
 * Determine order status from on-chain status info
 */
export function getOrderStatusFromInfo(
  orderParameters: SeaportOrderParameters,
  statusInfo: SeaportOrderStatusInfo
): SeaportOrderStatus {
  if (statusInfo.isCancelled) {
    return SeaportOrderStatus.CANCELLED;
  }

  if (
    statusInfo.totalFilled === statusInfo.totalSize &&
    statusInfo.totalFilled > BigInt(0)
  ) {
    return SeaportOrderStatus.FILLED;
  }

  const now = BigInt(Math.floor(Date.now() / 1000));
  if (orderParameters.endTime < now) {
    return SeaportOrderStatus.EXPIRED;
  }

  return SeaportOrderStatus.OPEN;
}

/**
 * Calculate total consideration amount (price) from order
 */
export function getTotalConsiderationAmount(parameters: SeaportOrderParameters): bigint {
  return parameters.consideration.reduce(
    (acc, item) => acc + item.startAmount,
    BigInt(0)
  );
}

/**
 * Format price from wei to display string.
 * Returns a string to preserve full decimal precision (parseFloat loses
 * precision for very small values common with high-decimal ERC-20 tokens).
 */
export function formatPrice(priceWei: bigint): string {
  return formatEther(priceWei);
}

/**
 * Compute price-per-token with full precision using scaled bigint arithmetic.
 *
 * Plain `priceWei / tokenAmount` is integer division; when the token amount
 * (in raw units) exceeds the wei value the result truncates to 0.
 * By scaling priceWei up by 10^18 before dividing, we keep 18 extra digits
 * of precision, then `formatEther` converts the result back into a
 * human-readable decimal string.
 */
export function formatPricePerToken(priceWei: bigint, tokenAmount: bigint): string {
  if (tokenAmount === 0n) return "0";
  const scaled = priceWei * 10n ** 18n;
  const result = scaled / tokenAmount;
  return formatEther(result);
}
