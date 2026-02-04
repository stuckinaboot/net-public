/**
 * BazaarClient - Client for interacting with Net Bazaar (NFT marketplace)
 *
 * Provides methods for:
 * - Reading NFT listings and collection offers
 * - Preparing transactions for creating/canceling listings and offers
 */

import { PublicClient, createPublicClient, defineChain, http } from "viem";
import { NetClient } from "@net-protocol/core";
import {
  Listing,
  CollectionOffer,
  Erc20Offer,
  GetListingsOptions,
  GetCollectionOffersOptions,
  GetErc20OffersOptions,
  SeaportOrderStatus,
  WriteTransactionConfig,
  SeaportOrderComponents,
} from "../types";
import { SEAPORT_CANCEL_ABI } from "../abis";
import {
  getBazaarChainConfig,
  getBazaarAddress,
  getCollectionOffersAddress,
  getErc20OffersAddress,
  getSeaportAddress,
  getWrappedNativeCurrency,
  isBazaarSupportedOnChain,
} from "../chainConfig";
import {
  parseListingFromMessage,
  parseCollectionOfferFromMessage,
  parseErc20OfferFromMessage,
  getBestListingPerToken,
  sortListingsByPrice,
  sortOffersByPrice,
  sortErc20OffersByPricePerToken,
  createSeaportInstance,
  computeOrderHash,
  getSeaportOrderFromMessageData,
  getOrderStatusFromInfo,
} from "../utils";
import {
  bulkFetchOrderStatuses,
  bulkFetchNftOwners,
  bulkFetchErc20Balances,
  isListingValid,
  isCollectionOfferValid,
  isErc20OfferValid,
} from "../utils/validation";

// Default RPC URLs for chains (same as @net-protocol/core)
const CHAIN_RPC_URLS: Record<number, string[]> = {
  8453: ["https://base-mainnet.public.blastapi.io", "https://mainnet.base.org"],
  84532: ["https://sepolia.base.org"],
  666666666: ["https://rpc.degen.tips"],
  5112: ["https://rpc.ham.fun"],
  57073: ["https://rpc-qnd.inkonchain.com"],
  130: ["https://mainnet.unichain.org"],
  999: ["https://rpc.hyperliquid.xyz/evm"],
  9745: ["https://rpc.plasma.to"],
  143: ["https://rpc3.monad.xyz"],
};

export class BazaarClient {
  private chainId: number;
  private client: PublicClient;
  private netClient: NetClient;
  private rpcUrl: string;

  constructor(params: { chainId: number; rpcUrl?: string }) {
    if (!isBazaarSupportedOnChain(params.chainId)) {
      throw new Error(`Bazaar is not supported on chain ${params.chainId}`);
    }

    this.chainId = params.chainId;
    this.rpcUrl = params.rpcUrl || CHAIN_RPC_URLS[params.chainId]?.[0] || "";

    if (!this.rpcUrl) {
      throw new Error(`No RPC URL available for chain ${params.chainId}`);
    }

    const config = getBazaarChainConfig(params.chainId)!;

    this.client = createPublicClient({
      chain: defineChain({
        id: params.chainId,
        name: `Chain ${params.chainId}`,
        nativeCurrency: {
          name: config.wrappedNativeCurrency.name.replace("Wrapped ", ""),
          symbol: config.currencySymbol.toUpperCase(),
          decimals: 18,
        },
        rpcUrls: {
          default: { http: [this.rpcUrl] },
        },
      }),
      transport: http(this.rpcUrl),
      batch: { multicall: true },
    });

    this.netClient = new NetClient({
      chainId: params.chainId,
      overrides: params.rpcUrl ? { rpcUrls: [params.rpcUrl] } : undefined,
    });
  }

  /**
   * Get valid NFT listings for a collection
   *
   * Returns listings that are:
   * - OPEN status (not filled, cancelled, or expired)
   * - Not expired
   * - Seller still owns the NFT
   *
   * Results are deduplicated (one per token) and sorted by price (lowest first)
   */
  async getListings(options: GetListingsOptions): Promise<Listing[]> {
    const { nftAddress, excludeMaker, maxMessages = 200 } = options;
    const bazaarAddress = getBazaarAddress(this.chainId);

    // Get message count
    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: bazaarAddress,
        topic: nftAddress.toLowerCase(),
      },
    });

    if (count === 0) {
      return [];
    }

    // Fetch messages (most recent)
    const startIndex = Math.max(0, count - maxMessages);
    const messages = await this.netClient.getMessages({
      filter: {
        appAddress: bazaarAddress,
        topic: nftAddress.toLowerCase(),
      },
      startIndex,
      endIndex: count,
    });

    // Parse messages into listings
    let listings: Listing[] = [];
    for (const message of messages) {
      const listing = parseListingFromMessage(message, this.chainId);
      if (!listing) continue;

      // Filter by excludeMaker
      if (excludeMaker && listing.maker.toLowerCase() === excludeMaker.toLowerCase()) {
        continue;
      }

      listings.push(listing);
    }

    if (listings.length === 0) {
      return [];
    }

    // Compute order hashes
    const seaport = createSeaportInstance(this.chainId, this.rpcUrl);
    for (const listing of listings) {
      const order = getSeaportOrderFromMessageData(listing.messageData);
      listing.orderHash = computeOrderHash(seaport, order.parameters, order.counter) as `0x${string}`;
    }

    // Fetch order statuses
    const orderHashes = listings.map((l) => l.orderHash as `0x${string}`);
    const statusInfos = await bulkFetchOrderStatuses(this.client, this.chainId, orderHashes);

    // Update order statuses
    listings.forEach((listing, index) => {
      const statusInfo = statusInfos[index];
      listing.orderStatus = getOrderStatusFromInfo(listing.orderComponents!, statusInfo);
    });

    // Filter to OPEN orders only
    listings = listings.filter(
      (l) =>
        l.orderStatus === SeaportOrderStatus.OPEN &&
        l.expirationDate > Math.floor(Date.now() / 1000)
    );

    if (listings.length === 0) {
      return [];
    }

    // Validate ownership
    const tokenIds = listings.map((l) => l.tokenId);
    const owners = await bulkFetchNftOwners(this.client, nftAddress, tokenIds);

    // Filter to listings where seller still owns the NFT
    listings = listings.filter((listing, index) => {
      const owner = owners[index];
      return isListingValid(
        listing.orderStatus,
        listing.expirationDate,
        listing.maker,
        owner
      );
    });

    // Deduplicate (best price per token) and sort
    return sortListingsByPrice(getBestListingPerToken(listings));
  }

  /**
   * Get valid collection offers for a collection
   *
   * Returns offers that are:
   * - OPEN status (not filled, cancelled, or expired)
   * - Not expired
   * - Buyer has sufficient WETH balance
   *
   * Results are sorted by price (highest first)
   */
  async getCollectionOffers(options: GetCollectionOffersOptions): Promise<CollectionOffer[]> {
    const { nftAddress, excludeMaker, maxMessages = 100 } = options;
    const collectionOffersAddress = getCollectionOffersAddress(this.chainId);
    const weth = getWrappedNativeCurrency(this.chainId);

    if (!weth) {
      return [];
    }

    // Get message count
    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: collectionOffersAddress,
        topic: nftAddress.toLowerCase(),
      },
    });

    if (count === 0) {
      return [];
    }

    // Fetch messages (most recent)
    const startIndex = Math.max(0, count - maxMessages);
    const messages = await this.netClient.getMessages({
      filter: {
        appAddress: collectionOffersAddress,
        topic: nftAddress.toLowerCase(),
      },
      startIndex,
      endIndex: count,
    });

    // Parse messages into offers
    let offers: CollectionOffer[] = [];
    for (const message of messages) {
      const offer = parseCollectionOfferFromMessage(message, this.chainId);
      if (!offer) continue;

      // Validate WETH token matches
      const order = getSeaportOrderFromMessageData(offer.messageData);
      const offerToken = order.parameters.offer?.[0]?.token?.toLowerCase();
      if (offerToken !== weth.address.toLowerCase()) {
        continue;
      }

      // Filter by excludeMaker
      if (excludeMaker && offer.maker.toLowerCase() === excludeMaker.toLowerCase()) {
        continue;
      }

      offers.push(offer);
    }

    if (offers.length === 0) {
      return [];
    }

    // Compute order hashes
    const seaport = createSeaportInstance(this.chainId, this.rpcUrl);
    for (const offer of offers) {
      const order = getSeaportOrderFromMessageData(offer.messageData);
      offer.orderHash = computeOrderHash(seaport, order.parameters, order.counter) as `0x${string}`;
    }

    // Fetch order statuses
    const orderHashes = offers.map((o) => o.orderHash as `0x${string}`);
    const statusInfos = await bulkFetchOrderStatuses(this.client, this.chainId, orderHashes);

    // Update order statuses
    offers.forEach((offer, index) => {
      const statusInfo = statusInfos[index];
      offer.orderStatus = getOrderStatusFromInfo(offer.orderComponents!, statusInfo);
    });

    // Filter to OPEN orders only
    offers = offers.filter(
      (o) =>
        o.orderStatus === SeaportOrderStatus.OPEN &&
        o.expirationDate > Math.floor(Date.now() / 1000)
    );

    if (offers.length === 0) {
      return [];
    }

    // Validate WETH balances
    const uniqueMakers = [...new Set(offers.map((o) => o.maker))];
    const balances = await bulkFetchErc20Balances(this.client, weth.address, uniqueMakers);

    const balanceMap = new Map<string, bigint>();
    uniqueMakers.forEach((maker, index) => {
      balanceMap.set(maker.toLowerCase(), balances[index]);
    });

    // Filter to offers where buyer has sufficient balance
    offers = offers.filter((offer) => {
      const balance = balanceMap.get(offer.maker.toLowerCase()) || BigInt(0);
      return isCollectionOfferValid(
        offer.orderStatus,
        offer.expirationDate,
        offer.priceWei,
        balance
      );
    });

    // Sort by price (highest first)
    return sortOffersByPrice(offers);
  }

  /**
   * Get valid ERC20 offers for a token
   *
   * ERC20 offers are only available on Base (8453) and HyperEVM (999).
   *
   * Returns offers that are:
   * - OPEN status (not filled, cancelled, or expired)
   * - Not expired
   * - Buyer has sufficient WETH balance
   *
   * Results are sorted by price per token (highest first)
   */
  async getErc20Offers(options: GetErc20OffersOptions): Promise<Erc20Offer[]> {
    const { tokenAddress, excludeMaker, maxMessages = 200 } = options;
    const erc20OffersAddress = getErc20OffersAddress(this.chainId);
    const weth = getWrappedNativeCurrency(this.chainId);

    // ERC20 offers only available on Base and HyperEVM
    if (!erc20OffersAddress || !weth) {
      return [];
    }

    // Get message count
    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: erc20OffersAddress,
        topic: tokenAddress.toLowerCase(),
      },
    });

    if (count === 0) {
      return [];
    }

    // Fetch messages (most recent)
    const startIndex = Math.max(0, count - maxMessages);
    const messages = await this.netClient.getMessages({
      filter: {
        appAddress: erc20OffersAddress,
        topic: tokenAddress.toLowerCase(),
      },
      startIndex,
      endIndex: count,
    });

    // Parse messages into offers
    let offers: Erc20Offer[] = [];
    for (const message of messages) {
      const offer = parseErc20OfferFromMessage(message, this.chainId);
      if (!offer) continue;

      // Validate WETH token matches
      const order = getSeaportOrderFromMessageData(offer.messageData);
      const offerToken = order.parameters.offer?.[0]?.token?.toLowerCase();
      if (offerToken !== weth.address.toLowerCase()) {
        continue;
      }

      // Validate the consideration token matches the requested token
      if (offer.tokenAddress.toLowerCase() !== tokenAddress.toLowerCase()) {
        continue;
      }

      // Filter by excludeMaker
      if (excludeMaker && offer.maker.toLowerCase() === excludeMaker.toLowerCase()) {
        continue;
      }

      offers.push(offer);
    }

    if (offers.length === 0) {
      return [];
    }

    // Compute order hashes
    const seaport = createSeaportInstance(this.chainId, this.rpcUrl);
    for (const offer of offers) {
      const order = getSeaportOrderFromMessageData(offer.messageData);
      offer.orderHash = computeOrderHash(seaport, order.parameters, order.counter) as `0x${string}`;
    }

    // Fetch order statuses
    const orderHashes = offers.map((o) => o.orderHash);
    const statusInfos = await bulkFetchOrderStatuses(this.client, this.chainId, orderHashes);

    // Update order statuses
    offers.forEach((offer, index) => {
      const statusInfo = statusInfos[index];
      offer.orderStatus = getOrderStatusFromInfo(offer.orderComponents!, statusInfo);
    });

    // Filter to OPEN orders only
    offers = offers.filter(
      (o) =>
        o.orderStatus === SeaportOrderStatus.OPEN &&
        o.expirationDate > Math.floor(Date.now() / 1000)
    );

    if (offers.length === 0) {
      return [];
    }

    // Validate WETH balances
    const uniqueMakers = [...new Set(offers.map((o) => o.maker))];
    const balances = await bulkFetchErc20Balances(this.client, weth.address, uniqueMakers);

    const balanceMap = new Map<string, bigint>();
    uniqueMakers.forEach((maker, index) => {
      balanceMap.set(maker.toLowerCase(), balances[index]);
    });

    // Filter to offers where buyer has sufficient balance
    offers = offers.filter((offer) => {
      const balance = balanceMap.get(offer.maker.toLowerCase()) || BigInt(0);
      return isErc20OfferValid(
        offer.orderStatus,
        offer.expirationDate,
        offer.priceWei,
        balance
      );
    });

    // Sort by price per token (highest first) - no deduplication for ERC20 offers
    return sortErc20OffersByPricePerToken(offers);
  }

  /**
   * Get the chain ID this client is configured for
   */
  getChainId(): number {
    return this.chainId;
  }

  /**
   * Get the bazaar contract address for this chain
   */
  getBazaarAddress(): `0x${string}` {
    return getBazaarAddress(this.chainId);
  }

  /**
   * Get the collection offers contract address for this chain
   */
  getCollectionOffersAddress(): `0x${string}` {
    return getCollectionOffersAddress(this.chainId);
  }

  /**
   * Get the ERC20 offers contract address for this chain
   * Only available on Base (8453) and HyperEVM (999)
   */
  getErc20OffersAddress(): `0x${string}` | undefined {
    return getErc20OffersAddress(this.chainId);
  }

  /**
   * Get the Seaport contract address for this chain
   */
  getSeaportAddress(): `0x${string}` {
    return getSeaportAddress(this.chainId);
  }

  /**
   * Prepare a transaction to cancel a listing
   *
   * The listing must have been created by the caller.
   * Use the orderComponents from the Listing object returned by getListings().
   */
  prepareCancelListing(listing: Listing): WriteTransactionConfig {
    if (!listing.orderComponents) {
      throw new Error("Listing does not have order components");
    }

    return this.prepareCancelOrder(listing.orderComponents);
  }

  /**
   * Prepare a transaction to cancel a collection offer
   *
   * The offer must have been created by the caller.
   * Use the orderComponents from the CollectionOffer object returned by getCollectionOffers().
   */
  prepareCancelCollectionOffer(offer: CollectionOffer): WriteTransactionConfig {
    if (!offer.orderComponents) {
      throw new Error("Offer does not have order components");
    }

    return this.prepareCancelOrder(offer.orderComponents);
  }

  /**
   * Prepare a transaction to cancel a Seaport order
   *
   * This is a low-level method. Prefer prepareCancelListing or prepareCancelCollectionOffer.
   */
  prepareCancelOrder(orderComponents: SeaportOrderComponents): WriteTransactionConfig {
    const seaportAddress = getSeaportAddress(this.chainId);

    // Convert order components to the format expected by Seaport
    const orderForCancel = {
      offerer: orderComponents.offerer,
      zone: orderComponents.zone,
      offer: orderComponents.offer.map((item) => ({
        itemType: item.itemType,
        token: item.token,
        identifierOrCriteria: item.identifierOrCriteria,
        startAmount: item.startAmount,
        endAmount: item.endAmount,
      })),
      consideration: orderComponents.consideration.map((item) => ({
        itemType: item.itemType,
        token: item.token,
        identifierOrCriteria: item.identifierOrCriteria,
        startAmount: item.startAmount,
        endAmount: item.endAmount,
        recipient: item.recipient,
      })),
      orderType: orderComponents.orderType,
      startTime: orderComponents.startTime,
      endTime: orderComponents.endTime,
      zoneHash: orderComponents.zoneHash,
      salt: orderComponents.salt,
      conduitKey: orderComponents.conduitKey,
      counter: orderComponents.counter,
    };

    return {
      to: seaportAddress,
      functionName: "cancel",
      args: [[orderForCancel]],
      abi: SEAPORT_CANCEL_ABI,
    };
  }
}
