/**
 * Utilities for parsing Net messages into listings and offers
 */

import { NetMessage } from "@net-protocol/core";
import { Listing, CollectionOffer, Erc20Offer, Erc20Listing, SeaportOrderStatus, ItemType } from "../types";
import {
  decodeSeaportSubmission,
  getSeaportOrderFromMessageData,
  getTotalConsiderationAmount,
  formatPrice,
} from "./seaport";
import { getCurrencySymbol, NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS, NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS } from "../chainConfig";

/**
 * Parse a Net message into an NFT listing
 */
export function parseListingFromMessage(
  message: NetMessage,
  chainId: number
): Listing | null {
  try {
    const submission = decodeSeaportSubmission(message.data as `0x${string}`);
    const { parameters } = submission;

    // NFT listings have the NFT in the offer array
    const offerItem = parameters.offer[0];
    if (!offerItem) {
      return null;
    }

    // Must be ERC721 or ERC1155
    if (offerItem.itemType !== ItemType.ERC721 && offerItem.itemType !== ItemType.ERC1155) {
      return null;
    }

    const priceWei = getTotalConsiderationAmount(parameters);
    const tokenId = offerItem.identifierOrCriteria.toString();

    const targetFulfiller =
      parameters.zone.toLowerCase() === NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS.toLowerCase() &&
      parameters.zoneHash !== "0x0000000000000000000000000000000000000000000000000000000000000000"
        ? parameters.zoneHash
        : undefined;

    return {
      maker: parameters.offerer,
      nftAddress: offerItem.token,
      tokenId,
      priceWei,
      price: formatPrice(priceWei),
      currency: getCurrencySymbol(chainId),
      expirationDate: Number(parameters.endTime),
      orderHash: "", // Will be computed later
      orderStatus: SeaportOrderStatus.OPEN, // Will be validated later
      messageData: message.data as `0x${string}`,
      orderComponents: {
        ...parameters,
        counter: submission.counter,
      },
      targetFulfiller,
    };
  } catch {
    return null;
  }
}

/**
 * Parse a Net message into a collection offer
 */
export function parseCollectionOfferFromMessage(
  message: NetMessage,
  chainId: number
): CollectionOffer | null {
  try {
    const submission = decodeSeaportSubmission(message.data as `0x${string}`);
    const { parameters } = submission;

    // Collection offers must use the collection offer zone
    if (
      parameters.zone.toLowerCase() !==
      NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS.toLowerCase()
    ) {
      return null;
    }

    // Collection offers have WETH in the offer array
    const offerItem = parameters.offer[0];
    if (!offerItem || offerItem.itemType !== ItemType.ERC20) {
      return null;
    }

    // The NFT is in the consideration array with criteria type
    const nftConsideration = parameters.consideration.find(
      (item) =>
        item.itemType === ItemType.ERC721_WITH_CRITERIA ||
        item.itemType === ItemType.ERC1155_WITH_CRITERIA
    );

    if (!nftConsideration) {
      return null;
    }

    // Only support single NFT offers
    if (nftConsideration.startAmount !== BigInt(1)) {
      return null;
    }

    const priceWei = offerItem.startAmount;

    return {
      maker: parameters.offerer,
      nftAddress: nftConsideration.token,
      priceWei,
      price: formatPrice(priceWei),
      currency: getCurrencySymbol(chainId),
      expirationDate: Number(parameters.endTime),
      orderHash: "", // Will be computed later
      orderStatus: SeaportOrderStatus.OPEN, // Will be validated later
      messageData: message.data as `0x${string}`,
      orderComponents: {
        ...parameters,
        counter: submission.counter,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Get the best listing for each token (lowest price)
 */
export function getBestListingPerToken(listings: Listing[]): Listing[] {
  const tokenMap = new Map<string, Listing>();

  for (const listing of listings) {
    const key = `${listing.nftAddress.toLowerCase()}-${listing.tokenId}`;
    const existing = tokenMap.get(key);

    if (!existing || listing.priceWei < existing.priceWei) {
      tokenMap.set(key, listing);
    }
  }

  return Array.from(tokenMap.values());
}

/**
 * Get the best collection offer (highest price)
 */
export function getBestCollectionOffer(offers: CollectionOffer[]): CollectionOffer | null {
  if (offers.length === 0) {
    return null;
  }

  return offers.reduce((best, current) =>
    current.priceWei > best.priceWei ? current : best
  );
}

/**
 * Sort listings by price (lowest first)
 */
export function sortListingsByPrice(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => {
    const diff = a.priceWei - b.priceWei;
    if (diff < BigInt(0)) return -1;
    if (diff > BigInt(0)) return 1;
    return 0;
  });
}

/**
 * Sort offers by price (highest first)
 */
export function sortOffersByPrice(offers: CollectionOffer[]): CollectionOffer[] {
  return [...offers].sort((a, b) => {
    const diff = b.priceWei - a.priceWei;
    if (diff < BigInt(0)) return -1;
    if (diff > BigInt(0)) return 1;
    return 0;
  });
}

/**
 * Parse a Net message into an ERC20 offer
 */
export function parseErc20OfferFromMessage(
  message: NetMessage,
  chainId: number
): Erc20Offer | null {
  try {
    const submission = decodeSeaportSubmission(message.data as `0x${string}`);
    const { parameters } = submission;

    // ERC20 offers must use the collection offer zone
    if (
      parameters.zone.toLowerCase() !==
      NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS.toLowerCase()
    ) {
      return null;
    }

    // ERC20 offers have WETH in the offer array
    const offerItem = parameters.offer[0];
    if (!offerItem || offerItem.itemType !== ItemType.ERC20) {
      return null;
    }

    // The ERC20 token being purchased is in the consideration array
    const erc20Consideration = parameters.consideration.find(
      (item) => item.itemType === ItemType.ERC20
    );

    if (!erc20Consideration) {
      return null;
    }

    // Must have a non-zero token amount
    const tokenAmount = erc20Consideration.startAmount;
    if (tokenAmount === BigInt(0)) {
      return null;
    }

    const priceWei = offerItem.startAmount;
    const pricePerTokenWei = priceWei / tokenAmount;

    return {
      maker: parameters.offerer,
      tokenAddress: erc20Consideration.token,
      tokenAmount,
      priceWei,
      pricePerTokenWei,
      price: formatPrice(priceWei),
      pricePerToken: formatPrice(pricePerTokenWei),
      currency: getCurrencySymbol(chainId),
      expirationDate: Number(parameters.endTime),
      orderHash: "0x" as `0x${string}`, // Will be computed later
      orderStatus: SeaportOrderStatus.OPEN, // Will be validated later
      messageData: message.data as `0x${string}`,
      orderComponents: {
        ...parameters,
        counter: submission.counter,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Sort ERC20 offers by price per token (highest first)
 */
export function sortErc20OffersByPricePerToken(offers: Erc20Offer[]): Erc20Offer[] {
  return [...offers].sort((a, b) => {
    const diff = b.pricePerTokenWei - a.pricePerTokenWei;
    if (diff < BigInt(0)) return -1;
    if (diff > BigInt(0)) return 1;
    return 0;
  });
}

/**
 * Parse a Net message into an ERC20 listing
 *
 * ERC20 listings have the ERC20 token in the offer array (seller is offering tokens)
 * and native currency payments in the consideration array.
 * They do NOT use the collection offer zone (that would be an offer, not a listing).
 */
export function parseErc20ListingFromMessage(
  message: NetMessage,
  chainId: number
): Erc20Listing | null {
  try {
    const submission = decodeSeaportSubmission(message.data as `0x${string}`);
    const { parameters } = submission;

    // ERC20 listings must NOT use the collection offer zone (that would be an offer)
    if (
      parameters.zone.toLowerCase() ===
      NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS.toLowerCase()
    ) {
      return null;
    }

    // ERC20 listings have the ERC20 token in the offer array
    const offerItem = parameters.offer[0];
    if (!offerItem || offerItem.itemType !== ItemType.ERC20) {
      return null;
    }

    const tokenAmount = offerItem.startAmount;
    if (tokenAmount === BigInt(0)) {
      return null;
    }

    const priceWei = getTotalConsiderationAmount(parameters);
    if (priceWei === BigInt(0)) {
      return null;
    }

    const pricePerTokenWei = priceWei / tokenAmount;

    return {
      maker: parameters.offerer,
      tokenAddress: offerItem.token,
      tokenAmount,
      priceWei,
      pricePerTokenWei,
      price: formatPrice(priceWei),
      pricePerToken: formatPrice(pricePerTokenWei),
      currency: getCurrencySymbol(chainId),
      expirationDate: Number(parameters.endTime),
      orderHash: "0x" as `0x${string}`, // Will be computed later
      orderStatus: SeaportOrderStatus.OPEN, // Will be validated later
      messageData: message.data as `0x${string}`,
      orderComponents: {
        ...parameters,
        counter: submission.counter,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Sort ERC20 listings by price per token (lowest first)
 */
export function sortErc20ListingsByPricePerToken(listings: Erc20Listing[]): Erc20Listing[] {
  return [...listings].sort((a, b) => {
    const diff = a.pricePerTokenWei - b.pricePerTokenWei;
    if (diff < BigInt(0)) return -1;
    if (diff > BigInt(0)) return 1;
    return 0;
  });
}
