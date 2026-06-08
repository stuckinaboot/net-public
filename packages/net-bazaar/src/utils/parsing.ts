/**
 * Utilities for parsing Net messages into listings and offers
 */

import { NetMessage } from "@net-protocol/core";
import { decodeAbiParameters } from "viem";
import { Listing, CollectionOffer, Erc20Offer, Erc20Listing, Sale, SeaportOrderStatus, ItemType } from "../types";
import {
  decodeSeaportSubmission,
  getSeaportOrderFromMessageData,
  getTotalConsiderationAmount,
  formatPrice,
  formatPricePerToken,
} from "./seaport";
import {
  getCurrencySymbol,
  getErc20QuoteToken,
  getWrappedNativeCurrency,
  QuoteToken,
  NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS,
  NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS,
} from "../chainConfig";

/**
 * Resolve display fields (decimals + lowercased symbol) for a parsed
 * ERC20 trade's payment side.
 *
 * - If a `quoteToken` is provided (e.g. USDC on Base), use its decimals
 *   and symbol so prices format in that token.
 * - Otherwise fall back to 18 decimals and the chain's native currency
 *   symbol — matches the legacy WETH-for-offers / NATIVE-for-listings
 *   shape on chains without a configured quote token.
 */
function resolvePaymentDisplay(
  quoteToken: QuoteToken | undefined,
  chainId: number
): { decimals: number; symbol: string } {
  if (quoteToken) {
    return { decimals: quoteToken.decimals, symbol: quoteToken.symbol.toLowerCase() };
  }
  return { decimals: 18, symbol: getCurrencySymbol(chainId) };
}

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
  chainId: number,
  tokenDecimals: number = 18
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

    // ERC20 offers have the quote token (WETH or USDC) in the offer array
    const offerItem = parameters.offer[0];
    if (!offerItem || offerItem.itemType !== ItemType.ERC20) {
      return null;
    }

    // On chains with a configured ERC20 quote token, strictly require the
    // offer item to be that token. This naturally hides legacy WETH orders
    // on chains that have migrated to USDC.
    const offerTokenLower = offerItem.token.toLowerCase();
    const quoteToken = getErc20QuoteToken(chainId);
    if (quoteToken && offerTokenLower !== quoteToken.address.toLowerCase()) {
      return null;
    }

    // The ERC20 token being purchased is in the consideration array.
    // It must be different from the quote token (otherwise the fee/payment
    // items would shadow the actual traded token).
    const erc20Consideration = parameters.consideration.find(
      (item) =>
        item.itemType === ItemType.ERC20 &&
        item.token.toLowerCase() !== offerTokenLower
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

    const { decimals: paymentDecimals, symbol: paymentSymbol } =
      resolvePaymentDisplay(quoteToken, chainId);

    return {
      maker: parameters.offerer,
      tokenAddress: erc20Consideration.token,
      tokenAmount,
      priceWei,
      pricePerTokenWei,
      price: formatPrice(priceWei, paymentDecimals),
      pricePerToken: formatPricePerToken(priceWei, tokenAmount, tokenDecimals, paymentDecimals),
      currency: paymentSymbol,
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
  chainId: number,
  tokenDecimals: number = 18
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

    // On chains with a configured ERC20 quote token, strictly require every
    // consideration item to be that quote token. This hides legacy
    // native-payment listings on chains that have migrated to USDC.
    const quoteToken = getErc20QuoteToken(chainId);
    if (quoteToken) {
      const quoteAddrLower = quoteToken.address.toLowerCase();
      const allMatch = parameters.consideration.every(
        (item) =>
          item.itemType === ItemType.ERC20 &&
          item.token.toLowerCase() === quoteAddrLower
      );
      if (!allMatch) {
        return null;
      }
    }

    const priceWei = getTotalConsiderationAmount(parameters);
    if (priceWei === BigInt(0)) {
      return null;
    }

    const pricePerTokenWei = priceWei / tokenAmount;

    const targetFulfiller =
      parameters.zone.toLowerCase() === NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS.toLowerCase() &&
      parameters.zoneHash !== "0x0000000000000000000000000000000000000000000000000000000000000000"
        ? parameters.zoneHash
        : undefined;

    const { decimals: paymentDecimals, symbol: paymentSymbol } =
      resolvePaymentDisplay(quoteToken, chainId);

    return {
      maker: parameters.offerer,
      tokenAddress: offerItem.token,
      tokenAmount,
      priceWei,
      pricePerTokenWei,
      price: formatPrice(priceWei, paymentDecimals),
      pricePerToken: formatPricePerToken(priceWei, tokenAmount, tokenDecimals, paymentDecimals),
      currency: paymentSymbol,
      expirationDate: Number(parameters.endTime),
      orderHash: "0x" as `0x${string}`, // Will be computed later
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

/**
 * ABI for decoding zone-stored sale data from bulk storage.
 * The stored data contains: timestamp, netTotalMessageLength,
 * netTotalMessageForAppTopicLength, and the full ZoneParameters struct.
 */
const ZONE_STORED_SALE_ABI = [
  { type: "uint256" }, // timestamp
  { type: "uint256" }, // netTotalMessageLength
  { type: "uint256" }, // netTotalMessageForAppTopicLength
  {
    name: "zoneParameters",
    type: "tuple",
    internalType: "struct ZoneParameters",
    components: [
      { name: "orderHash", type: "bytes32", internalType: "bytes32" },
      { name: "fulfiller", type: "address", internalType: "address" },
      { name: "offerer", type: "address", internalType: "address" },
      {
        name: "offer",
        type: "tuple[]",
        internalType: "struct SpentItem[]",
        components: [
          { name: "itemType", type: "uint8", internalType: "enum ItemType" },
          { name: "token", type: "address", internalType: "address" },
          { name: "identifier", type: "uint256", internalType: "uint256" },
          { name: "amount", type: "uint256", internalType: "uint256" },
        ],
      },
      {
        name: "consideration",
        type: "tuple[]",
        internalType: "struct ReceivedItem[]",
        components: [
          { name: "itemType", type: "uint8", internalType: "enum ItemType" },
          { name: "token", type: "address", internalType: "address" },
          { name: "identifier", type: "uint256", internalType: "uint256" },
          { name: "amount", type: "uint256", internalType: "uint256" },
          { name: "recipient", type: "address", internalType: "address payable" },
        ],
      },
      { name: "extraData", type: "bytes", internalType: "bytes" },
      { name: "orderHashes", type: "bytes32[]", internalType: "bytes32[]" },
      { name: "startTime", type: "uint256", internalType: "uint256" },
      { name: "endTime", type: "uint256", internalType: "uint256" },
      { name: "zoneHash", type: "bytes32", internalType: "bytes32" },
    ],
  },
] as const;

/**
 * Parse a sale from bulk storage data (zone-stored sale details).
 *
 * The storage contract stores the full ZoneParameters struct for each sale,
 * keyed by order hash with operator = NET_SEAPORT_ZONE_ADDRESS.
 */
export function parseSaleFromStoredData(
  storedData: string,
  chainId: number
): Sale | null {
  try {
    const cleanedData = (
      "0x" +
      (storedData.startsWith("0x") ? storedData.slice(2) : storedData)
    ) as `0x${string}`;

    const [timestamp, , , zoneParameters] = decodeAbiParameters(
      ZONE_STORED_SALE_ABI,
      cleanedData
    );

    const offerItem = zoneParameters.offer[0];
    if (!offerItem) return null;

    const totalConsideration = zoneParameters.consideration.reduce(
      (acc, item) => acc + item.amount,
      BigInt(0)
    );

    // The currency the seller received is the consideration's payment side.
    // Match `consideration[0].token` against the chain's configured quote
    // token by address — not just by itemType — so legacy ERC20-paying
    // sales (e.g. WETH-denominated listings filled before a chain migrated
    // to USDC) don't get force-formatted through the quote token's
    // decimals/symbol.
    //
    // - NATIVE consideration → 18 decimals + native symbol (e.g. "eth").
    // - ERC20 consideration whose token matches the chain's quote token
    //   (USDC on Base) → quote-token decimals + symbol ("usdc", 6).
    // - ERC20 consideration whose token is anything else (e.g. legacy WETH
    //   sales on Base) → assume the wrapped native at 18 decimals and use
    //   that symbol; don't reuse the quote-token decimals or we silently
    //   inflate the price by `10^(18 - quoteDecimals)`.
    const paymentItem = zoneParameters.consideration[0];
    const paymentItemType = paymentItem?.itemType as ItemType | undefined;
    const quoteToken = getErc20QuoteToken(chainId);
    const wrappedNative = getWrappedNativeCurrency(chainId);

    let paymentDecimals: number;
    let paymentSymbol: string;
    if (paymentItemType === ItemType.ERC20 && paymentItem) {
      const paymentToken = paymentItem.token.toLowerCase();
      if (quoteToken && paymentToken === quoteToken.address.toLowerCase()) {
        paymentDecimals = quoteToken.decimals;
        paymentSymbol = quoteToken.symbol.toLowerCase();
      } else {
        // Some other ERC20 — almost always WETH on chains that had ERC20
        // listings/offers before the quote-token migration.
        paymentDecimals = 18;
        paymentSymbol = (
          wrappedNative?.symbol ?? getCurrencySymbol(chainId)
        ).toLowerCase();
      }
    } else {
      paymentDecimals = 18;
      paymentSymbol = getCurrencySymbol(chainId);
    }

    return {
      seller: zoneParameters.offerer as `0x${string}`,
      buyer: zoneParameters.fulfiller as `0x${string}`,
      tokenAddress: offerItem.token as `0x${string}`,
      tokenId: offerItem.identifier.toString(),
      amount: offerItem.amount,
      itemType: offerItem.itemType as ItemType,
      priceWei: totalConsideration,
      price: formatPrice(totalConsideration, paymentDecimals),
      currency: paymentSymbol,
      timestamp: Number(timestamp),
      orderHash: zoneParameters.orderHash,
    };
  } catch {
    return null;
  }
}

/**
 * Sort sales by timestamp (most recent first)
 */
export function sortSalesByTimestamp(sales: Sale[]): Sale[] {
  return [...sales].sort((a, b) => b.timestamp - a.timestamp);
}
