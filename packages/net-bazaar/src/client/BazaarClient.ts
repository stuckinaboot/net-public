/**
 * BazaarClient - Client for interacting with Net Bazaar
 *
 * Provides methods for:
 * - Reading NFT listings and collection offers
 * - Preparing transactions for creating/canceling listings and offers
 */

import { PublicClient, createPublicClient, defineChain, http, type Abi } from "viem";
import { readContract } from "viem/actions";
import { NetClient, NetMessage } from "@net-protocol/core";
import {
  Listing,
  CollectionOffer,
  Erc20Offer,
  Erc20Listing,
  Sale,
  GetListingsOptions,
  GetCollectionOffersOptions,
  GetErc20OffersOptions,
  GetErc20ListingsOptions,
  GetSalesOptions,
  SeaportOrderStatus,
  WriteTransactionConfig,
  SeaportOrderComponents,
  SeaportOrderParameters,
  PreparedFulfillment,
  PreparedOrder,
  CreateListingParams,
  CreateCollectionOfferParams,
  CreateErc20OfferParams,
  CreateErc20ListingParams,
} from "../types";
import {
  SEAPORT_CANCEL_ABI,
  SEAPORT_GET_COUNTER_ABI,
  BAZAAR_V2_ABI,
  BAZAAR_COLLECTION_OFFERS_ABI,
  BAZAAR_ERC20_OFFERS_ABI,
} from "../abis";
import {
  getBazaarChainConfig,
  getBazaarAddress,
  getCollectionOffersAddress,
  getErc20OffersAddress,
  getErc20BazaarAddress,
  getSeaportAddress,
  getWrappedNativeCurrency,
  isBazaarSupportedOnChain,
  NET_SEAPORT_ZONE_ADDRESS,
} from "../chainConfig";
import {
  parseListingFromMessage,
  parseCollectionOfferFromMessage,
  parseErc20OfferFromMessage,
  parseErc20ListingFromMessage,
  parseSaleFromStoredData,
  getBestListingPerToken,
  sortListingsByPrice,
  sortOffersByPrice,
  sortErc20OffersByPricePerToken,
  sortErc20ListingsByPricePerToken,
  createSeaportInstance,
  computeOrderHash,
  getSeaportOrderFromMessageData,
  getOrderStatusFromInfo,
  decodeSeaportSubmission,
} from "../utils";
import {
  bulkFetchOrderStatuses,
  bulkFetchNftOwners,
  bulkFetchErc20Balances,
  isListingValid,
  isCollectionOfferValid,
  isErc20OfferValid,
  isErc20ListingValid,
} from "../utils/validation";
import { STORAGE_CONTRACT } from "@net-protocol/storage";
import { checkErc721Approval, checkErc20Approval } from "../utils/approvals";
import {
  buildFulfillListingTx,
  buildFulfillCollectionOfferTx,
  buildFulfillErc20OfferTx,
  buildFulfillErc20ListingTx,
} from "../utils/fulfillment";
import {
  buildListingOrderComponents,
  buildCollectionOfferOrderComponents,
  buildErc20OfferOrderComponents,
  buildErc20ListingOrderComponents,
  buildEIP712OrderData,
  buildSubmitOrderTx,
} from "../utils/orderCreation";

// ERC721TokenOwnerRangeHelper contract (deployed via CREATE2, same address on all chains)
const ERC721_TOKEN_OWNER_RANGE_HELPER_ADDRESS = "0x00000000f4ec2016d6e856b0cb14d635949bfd3f" as const;

const ERC721_TOKEN_OWNER_RANGE_HELPER_ABI = [
  {
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "user", type: "address" },
      { name: "startTokenId", type: "uint256" },
      { name: "endTokenId", type: "uint256" },
    ],
    name: "getOwnedTokensInRange",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Batch size for owned token queries (matches website)
const OWNED_TOKENS_BATCH_SIZE = 5000n;

// Default RPC URLs for chains (same as @net-protocol/core)
const CHAIN_RPC_URLS: Record<number, string[]> = {
  1: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
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

// ERC20 decimals ABI for on-chain lookup
const ERC20_DECIMALS_ABI = [
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
  },
] as const;

// Cache for token decimals (shared across BazaarClient instances)
const tokenDecimalsCache = new Map<string, number>();

export class BazaarClient {
  private chainId: number;
  private client: PublicClient;
  private netClient: NetClient;
  private rpcUrl: string;

  constructor(params: { chainId: number; rpcUrl?: string; publicClient?: PublicClient }) {
    if (!isBazaarSupportedOnChain(params.chainId)) {
      throw new Error(`Bazaar is not supported on chain ${params.chainId}`);
    }

    this.chainId = params.chainId;
    this.rpcUrl = params.rpcUrl || CHAIN_RPC_URLS[params.chainId]?.[0] || "";

    if (params.publicClient) {
      this.client = params.publicClient;
    } else {
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
    }

    this.netClient = new NetClient({
      chainId: params.chainId,
      overrides: params.rpcUrl ? { rpcUrls: [params.rpcUrl] } : undefined,
    });
  }

  /**
   * Fetch ERC20 token decimals with caching.
   * Falls back to 18 if the on-chain call fails.
   */
  private async fetchTokenDecimals(tokenAddress: `0x${string}`): Promise<number> {
    const cacheKey = `${this.chainId}:${tokenAddress.toLowerCase()}`;
    const cached = tokenDecimalsCache.get(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const result = await readContract(this.client, {
        address: tokenAddress,
        abi: ERC20_DECIMALS_ABI,
        functionName: "decimals",
      });
      const decimals = Number(result);
      tokenDecimalsCache.set(cacheKey, decimals);
      return decimals;
    } catch {
      console.warn(`[BazaarClient] Failed to fetch decimals for ${tokenAddress}, defaulting to 18`);
      return 18;
    }
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
    const { nftAddress, excludeMaker, maker, maxMessages = 200 } = options;
    const bazaarAddress = getBazaarAddress(this.chainId);

    const filter = {
      appAddress: bazaarAddress,
      topic: nftAddress?.toLowerCase(),
      maker,
    };

    let startIndex: number;
    let endIndex: number;

    if (options.startIndex != null && options.endIndex != null) {
      startIndex = options.startIndex;
      endIndex = options.endIndex;
    } else {
      // Get message count
      const count = await this.netClient.getMessageCount({ filter });
      if (count === 0) {
        return [];
      }
      startIndex = Math.max(0, count - maxMessages);
      endIndex = count;
    }

    // Fetch messages (most recent)
    const messages = await this.netClient.getMessages({
      filter,
      startIndex,
      endIndex,
    });

    return this.processListingsFromMessages(messages, options);
  }

  /**
   * Process pre-fetched messages into valid NFT listings.
   *
   * Use this when messages have already been fetched (e.g. via useNetMessages)
   * to avoid redundant RPC calls.
   */
  async processListingsFromMessages(
    messages: NetMessage[],
    options: Pick<GetListingsOptions, "nftAddress" | "excludeMaker" | "includeExpired">
  ): Promise<Listing[]> {
    const { nftAddress, excludeMaker, includeExpired = false } = options;
    const tag = `[BazaarClient.processListings chain=${this.chainId}]`;

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

    console.log(tag, `parsed ${listings.length}/${messages.length} messages into listings`);

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

    // Log status distribution before filtering
    const statusCounts: Record<string, number> = {};
    const now = Math.floor(Date.now() / 1000);
    let expiredCount = 0;
    for (const l of listings) {
      statusCounts[l.orderStatus] = (statusCounts[l.orderStatus] || 0) + 1;
      if (l.expirationDate <= now) expiredCount++;
    }
    console.log(tag, `order statuses:`, statusCounts, `expired: ${expiredCount}`);

    // Filter by order status: keep OPEN (and optionally EXPIRED) listings
    listings = listings.filter(
      (l) =>
        (l.orderStatus === SeaportOrderStatus.OPEN && l.expirationDate > now) ||
        (includeExpired && l.orderStatus === SeaportOrderStatus.EXPIRED)
    );

    console.log(tag, `after status filter: ${listings.length} (OPEN${includeExpired ? ' + EXPIRED' : ''})`);

    if (listings.length === 0) {
      return [];
    }

    // Validate ownership (only for OPEN listings; expired listings skip ownership check)
    const openListings = listings.filter((l) => l.orderStatus === SeaportOrderStatus.OPEN);
    const expiredListings = includeExpired ? listings.filter((l) => l.orderStatus === SeaportOrderStatus.EXPIRED) : [];

    let validOpenListings: Listing[];
    const beforeOwnership = openListings.length;

    if (nftAddress) {
      // Single collection: one bulkFetchNftOwners call
      const tokenIds = openListings.map((l) => l.tokenId);
      const owners = await bulkFetchNftOwners(this.client, nftAddress, tokenIds);

      validOpenListings = openListings.filter((listing, index) => {
        const owner = owners[index];
        return isListingValid(
          listing.orderStatus,
          listing.expirationDate,
          listing.maker,
          owner
        );
      });
    } else {
      // Cross-collection: group by nftAddress, fetch owners per group in parallel
      const groups = new Map<string, Listing[]>();
      for (const listing of openListings) {
        const key = listing.nftAddress.toLowerCase();
        const group = groups.get(key);
        if (group) {
          group.push(listing);
        } else {
          groups.set(key, [listing]);
        }
      }

      const groupEntries = Array.from(groups.entries());
      const ownerResults = await Promise.all(
        groupEntries.map(([addr, groupListings]) =>
          bulkFetchNftOwners(
            this.client,
            addr as `0x${string}`,
            groupListings.map((l) => l.tokenId)
          )
        )
      );

      validOpenListings = [];
      groupEntries.forEach(([, groupListings], groupIndex) => {
        const owners = ownerResults[groupIndex];
        for (let i = 0; i < groupListings.length; i++) {
          const listing = groupListings[i];
          if (
            isListingValid(
              listing.orderStatus,
              listing.expirationDate,
              listing.maker,
              owners[i]
            )
          ) {
            validOpenListings.push(listing);
          }
        }
      });
    }

    console.log(tag, `after ownership filter: ${validOpenListings.length}/${beforeOwnership} (${beforeOwnership - validOpenListings.length} dropped)`);

    // Deduplicate open listings (best price per token), sort by price
    const dedupedOpen = sortListingsByPrice(getBestListingPerToken(validOpenListings));

    // For expired: only keep tokens that don't already have an active listing
    const activeTokenKeys = new Set(dedupedOpen.map((l) => `${l.nftAddress.toLowerCase()}-${l.tokenId}`));
    const uniqueExpired = getBestListingPerToken(
      expiredListings.filter((l) => !activeTokenKeys.has(`${l.nftAddress.toLowerCase()}-${l.tokenId}`))
    );
    const sortedExpired = sortListingsByPrice(uniqueExpired);

    // Active listings first (by price), then expired listings after
    const result = [...dedupedOpen, ...sortedExpired];
    console.log(tag, `final: ${result.length} listings (${dedupedOpen.length} open, ${sortedExpired.length} expired)`);
    return result;
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

    // Get message count
    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: collectionOffersAddress,
        topic: nftAddress?.toLowerCase(),
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
        topic: nftAddress?.toLowerCase(),
      },
      startIndex,
      endIndex: count,
    });

    return this.processCollectionOffersFromMessages(messages, options);
  }

  /**
   * Process pre-fetched messages into valid collection offers.
   *
   * Use this when messages have already been fetched (e.g. via useNetMessages)
   * to avoid redundant RPC calls.
   */
  async processCollectionOffersFromMessages(
    messages: NetMessage[],
    options: Pick<GetCollectionOffersOptions, "nftAddress" | "excludeMaker">
  ): Promise<CollectionOffer[]> {
    const { nftAddress, excludeMaker } = options;
    const tag = `[BazaarClient.processCollectionOffers chain=${this.chainId}]`;
    const weth = getWrappedNativeCurrency(this.chainId);

    if (!weth) {
      return [];
    }

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

    console.log(tag, `parsed ${offers.length}/${messages.length} messages into offers`);

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
    const now = Math.floor(Date.now() / 1000);
    offers = offers.filter(
      (o) =>
        o.orderStatus === SeaportOrderStatus.OPEN &&
        o.expirationDate > now
    );

    console.log(tag, `after status filter: ${offers.length} OPEN & not expired`);

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
    const beforeBalance = offers.length;
    offers = offers.filter((offer) => {
      const balance = balanceMap.get(offer.maker.toLowerCase()) || BigInt(0);
      return isCollectionOfferValid(
        offer.orderStatus,
        offer.expirationDate,
        offer.priceWei,
        balance
      );
    });

    console.log(tag, `after balance filter: ${offers.length}/${beforeBalance} (${beforeBalance - offers.length} dropped)`);

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

    // ERC20 offers only available on Base and HyperEVM
    if (!erc20OffersAddress) {
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

    return this.processErc20OffersFromMessages(messages, options);
  }

  /**
   * Process pre-fetched messages into valid ERC20 offers.
   *
   * Use this when messages have already been fetched (e.g. via useNetMessages)
   * to avoid redundant RPC calls.
   */
  async processErc20OffersFromMessages(
    messages: NetMessage[],
    options: Pick<GetErc20OffersOptions, "tokenAddress" | "excludeMaker">
  ): Promise<Erc20Offer[]> {
    const { tokenAddress, excludeMaker } = options;
    const tag = `[BazaarClient.processErc20Offers chain=${this.chainId}]`;
    const weth = getWrappedNativeCurrency(this.chainId);

    if (!weth) {
      return [];
    }

    // Fetch token decimals for accurate price-per-token computation
    const tokenDecimals = await this.fetchTokenDecimals(tokenAddress);

    // Parse messages into offers
    let offers: Erc20Offer[] = [];
    for (const message of messages) {
      const offer = parseErc20OfferFromMessage(message, this.chainId, tokenDecimals);
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

    console.log(tag, `parsed ${offers.length}/${messages.length} messages into offers`);

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
    const now = Math.floor(Date.now() / 1000);
    offers = offers.filter(
      (o) =>
        o.orderStatus === SeaportOrderStatus.OPEN &&
        o.expirationDate > now
    );

    console.log(tag, `after status filter: ${offers.length} OPEN & not expired`);

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
    const beforeBalance = offers.length;
    offers = offers.filter((offer) => {
      const balance = balanceMap.get(offer.maker.toLowerCase()) || BigInt(0);
      return isErc20OfferValid(
        offer.orderStatus,
        offer.expirationDate,
        offer.priceWei,
        balance
      );
    });

    console.log(tag, `after balance filter: ${offers.length}/${beforeBalance} (${beforeBalance - offers.length} dropped)`);

    // Sort by price per token (highest first) - no deduplication for ERC20 offers
    return sortErc20OffersByPricePerToken(offers);
  }

  /**
   * Get valid ERC20 listings for a token
   *
   * Returns listings that are:
   * - OPEN status (not filled, cancelled, or expired)
   * - Not expired
   * - Seller has sufficient ERC20 token balance
   *
   * Results are sorted by price per token (lowest first). No deduplication —
   * all valid listings are returned (grouped by maker in the UI).
   */
  async getErc20Listings(options: GetErc20ListingsOptions): Promise<Erc20Listing[]> {
    const { tokenAddress, excludeMaker, maker, maxMessages = 200 } = options;
    const erc20BazaarAddress = getErc20BazaarAddress(this.chainId);

    const filter = {
      appAddress: erc20BazaarAddress,
      topic: tokenAddress.toLowerCase(),
      maker,
    };

    let startIndex: number;
    let endIndex: number;

    if (options.startIndex != null && options.endIndex != null) {
      startIndex = options.startIndex;
      endIndex = options.endIndex;
    } else {
      // Get message count
      const count = await this.netClient.getMessageCount({ filter });
      if (count === 0) {
        return [];
      }
      startIndex = Math.max(0, count - maxMessages);
      endIndex = count;
    }

    // Fetch messages (most recent)
    const messages = await this.netClient.getMessages({
      filter,
      startIndex,
      endIndex,
    });

    return this.processErc20ListingsFromMessages(messages, options);
  }

  /**
   * Process pre-fetched messages into valid ERC20 listings.
   *
   * Use this when messages have already been fetched (e.g. via useNetMessages)
   * to avoid redundant RPC calls.
   */
  async processErc20ListingsFromMessages(
    messages: NetMessage[],
    options: Pick<GetErc20ListingsOptions, "tokenAddress" | "excludeMaker">
  ): Promise<Erc20Listing[]> {
    const { tokenAddress, excludeMaker } = options;
    const tag = `[BazaarClient.processErc20Listings chain=${this.chainId}]`;

    // Fetch token decimals for accurate price-per-token computation
    const tokenDecimals = await this.fetchTokenDecimals(tokenAddress);

    // Parse messages into listings
    let listings: Erc20Listing[] = [];
    for (const message of messages) {
      const listing = parseErc20ListingFromMessage(message, this.chainId, tokenDecimals);
      if (!listing) continue;

      // Validate the offer token matches the requested token
      if (listing.tokenAddress.toLowerCase() !== tokenAddress.toLowerCase()) {
        continue;
      }

      // Filter by excludeMaker
      if (excludeMaker && listing.maker.toLowerCase() === excludeMaker.toLowerCase()) {
        continue;
      }

      listings.push(listing);
    }

    console.log(tag, `parsed ${listings.length}/${messages.length} messages into listings`);

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
    const orderHashes = listings.map((l) => l.orderHash);
    const statusInfos = await bulkFetchOrderStatuses(this.client, this.chainId, orderHashes);

    // Update order statuses
    listings.forEach((listing, index) => {
      const statusInfo = statusInfos[index];
      listing.orderStatus = getOrderStatusFromInfo(listing.orderComponents!, statusInfo);
    });

    // Log status distribution before filtering
    const statusCounts: Record<string, number> = {};
    const now = Math.floor(Date.now() / 1000);
    let expiredCount = 0;
    for (const l of listings) {
      statusCounts[l.orderStatus] = (statusCounts[l.orderStatus] || 0) + 1;
      if (l.expirationDate <= now) expiredCount++;
    }
    console.log(tag, `order statuses:`, statusCounts, `expired: ${expiredCount}`);

    // Filter to OPEN orders only
    listings = listings.filter(
      (l) =>
        l.orderStatus === SeaportOrderStatus.OPEN &&
        l.expirationDate > now
    );

    console.log(tag, `after status filter: ${listings.length} OPEN & not expired`);

    if (listings.length === 0) {
      return [];
    }

    // Validate seller's ERC20 balances
    const uniqueMakers = [...new Set(listings.map((l) => l.maker))];
    const balances = await bulkFetchErc20Balances(this.client, tokenAddress, uniqueMakers);

    const balanceMap = new Map<string, bigint>();
    uniqueMakers.forEach((maker, index) => {
      balanceMap.set(maker.toLowerCase(), balances[index]);
    });

    // Filter to listings where seller has sufficient token balance
    const beforeBalance = listings.length;
    listings = listings.filter((listing) => {
      const balance = balanceMap.get(listing.maker.toLowerCase()) || BigInt(0);
      return isErc20ListingValid(
        listing.orderStatus,
        listing.expirationDate,
        listing.tokenAmount,
        balance
      );
    });

    console.log(tag, `after balance filter: ${listings.length}/${beforeBalance} (${beforeBalance - listings.length} dropped)`);

    // Sort by price per token (lowest first) — no deduplication for ERC20 listings
    return sortErc20ListingsByPricePerToken(listings);
  }

  /**
   * Get recent sales for a collection
   *
   * Sales are stored differently from listings: Net messages contain order hashes,
   * and the actual sale data is fetched from the bulk storage contract.
   *
   * Results are sorted by timestamp (most recent first)
   */
  async getSales(options: GetSalesOptions): Promise<Sale[]> {
    const { nftAddress, maxMessages = 100 } = options;

    const filter = {
      appAddress: NET_SEAPORT_ZONE_ADDRESS as `0x${string}`,
      topic: nftAddress.toLowerCase(),
    };

    // Get message count
    const count = await this.netClient.getMessageCount({ filter });
    if (count === 0) {
      return [];
    }

    // Fetch messages (most recent)
    const startIndex = Math.max(0, count - maxMessages);
    const messages = await this.netClient.getMessages({
      filter,
      startIndex,
      endIndex: count,
    });

    return this.processSalesFromMessages(messages, options);
  }

  /**
   * Process pre-fetched messages into sales.
   *
   * Each message's data field contains an order hash. The actual sale data
   * is fetched from the bulk storage contract using these order hashes.
   */
  async processSalesFromMessages(
    messages: NetMessage[],
    options: Pick<GetSalesOptions, "nftAddress">
  ): Promise<Sale[]> {
    const tag = `[BazaarClient.processSales chain=${this.chainId}]`;

    if (messages.length === 0) {
      return [];
    }

    // Extract order hashes from message data
    const orderHashes = messages.map((m) => m.data);
    console.log(tag, `fetching ${orderHashes.length} sale details from storage...`);

    // Build bulk storage keys: each keyed by order hash, operator = zone address
    const bulkKeys = orderHashes.map((hash) => ({
      key: hash as `0x${string}`,
      operator: NET_SEAPORT_ZONE_ADDRESS as `0x${string}`,
    }));

    // Fetch sale data from bulk storage contract
    let storedResults: readonly { text: string; value: string }[];
    try {
      storedResults = await this.client.readContract({
        abi: STORAGE_CONTRACT.abi,
        address: STORAGE_CONTRACT.address,
        functionName: "bulkGet",
        args: [bulkKeys],
      }) as readonly { text: string; value: string }[];
    } catch (err) {
      console.error(tag, "bulk storage fetch failed:", err);
      return [];
    }

    // Parse each stored result into a Sale
    const sales: Sale[] = [];
    for (const result of storedResults) {
      if (!result.value || result.value === "0x") continue;
      const sale = parseSaleFromStoredData(result.value, this.chainId);
      if (sale) {
        sales.push(sale);
      }
    }

    console.log(tag, `parsed ${sales.length}/${storedResults.length} sales`);

    return sales;
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
   * Get the ERC20 bazaar (listings) contract address for this chain
   */
  getErc20BazaarAddress(): `0x${string}` {
    return getErc20BazaarAddress(this.chainId);
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
   * Prepare a transaction to cancel an ERC20 listing
   *
   * The listing must have been created by the caller.
   * Use the orderComponents from the Erc20Listing object returned by getErc20Listings().
   */
  prepareCancelErc20Listing(listing: Erc20Listing): WriteTransactionConfig {
    if (!listing.orderComponents) {
      throw new Error("Listing does not have order components");
    }

    return this.prepareCancelOrder(listing.orderComponents);
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

  // ─── Fulfillment Methods ───────────────────────────────────────────

  /**
   * Prepare a fulfillment for an NFT listing (buy an NFT).
   *
   * Returns approval transactions (if the listing requires ERC20 payment) and
   * the Seaport `fulfillAdvancedOrder` transaction with the correct native currency value.
   */
  async prepareFulfillListing(
    listing: Listing,
    fulfillerAddress: `0x${string}`
  ): Promise<PreparedFulfillment> {
    const submission = decodeSeaportSubmission(listing.messageData);
    const seaportAddress = getSeaportAddress(this.chainId);
    const fulfillment = buildFulfillListingTx(submission, fulfillerAddress, seaportAddress);

    // NFT listings paid in native currency don't need ERC20 approvals from the buyer
    return { approvals: [], fulfillment };
  }

  /**
   * Prepare a fulfillment for a collection offer (sell your NFT into an offer).
   *
   * Returns ERC721 approval transaction (if the NFT isn't approved for Seaport)
   * and the Seaport `fulfillAdvancedOrder` transaction.
   */
  async prepareFulfillCollectionOffer(
    offer: CollectionOffer,
    tokenId: string,
    fulfillerAddress: `0x${string}`
  ): Promise<PreparedFulfillment> {
    const submission = decodeSeaportSubmission(offer.messageData);
    const seaportAddress = getSeaportAddress(this.chainId);

    // Check ERC721 approval (fulfiller needs to approve Seaport to transfer their NFT)
    const approvals: WriteTransactionConfig[] = [];
    const nftApproval = await checkErc721Approval(
      this.client,
      offer.nftAddress,
      fulfillerAddress,
      seaportAddress
    );
    if (nftApproval) {
      approvals.push(nftApproval);
    }

    const fulfillment = buildFulfillCollectionOfferTx(
      submission,
      BigInt(tokenId),
      fulfillerAddress,
      seaportAddress
    );

    return { approvals, fulfillment };
  }

  /**
   * Prepare a fulfillment for an ERC20 offer (sell your ERC20 tokens into an offer).
   *
   * Returns ERC20 approval transaction (if the token isn't approved for Seaport)
   * and the Seaport `fulfillOrder` transaction.
   */
  async prepareFulfillErc20Offer(
    offer: Erc20Offer,
    fulfillerAddress: `0x${string}`
  ): Promise<PreparedFulfillment> {
    const submission = decodeSeaportSubmission(offer.messageData);
    const seaportAddress = getSeaportAddress(this.chainId);

    // Check ERC20 approval (fulfiller needs to approve Seaport for the token being sold)
    const approvals: WriteTransactionConfig[] = [];
    const tokenApproval = await checkErc20Approval(
      this.client,
      offer.tokenAddress,
      fulfillerAddress,
      seaportAddress,
      offer.tokenAmount
    );
    if (tokenApproval) {
      approvals.push(tokenApproval);
    }

    const fulfillment = buildFulfillErc20OfferTx(submission, seaportAddress);

    return { approvals, fulfillment };
  }

  /**
   * Prepare a fulfillment for an ERC20 listing (buy ERC20 tokens with native currency).
   *
   * Returns the Seaport `fulfillAdvancedOrder` transaction with the correct native currency value.
   * No approvals needed since the buyer pays in native currency.
   */
  async prepareFulfillErc20Listing(
    listing: Erc20Listing,
    fulfillerAddress: `0x${string}`
  ): Promise<PreparedFulfillment> {
    const submission = decodeSeaportSubmission(listing.messageData);
    const seaportAddress = getSeaportAddress(this.chainId);
    const fulfillment = buildFulfillErc20ListingTx(submission, fulfillerAddress, seaportAddress);

    return { approvals: [], fulfillment };
  }

  // ─── Order Creation Methods (Step 1: Build EIP-712 data) ──────────

  /**
   * Fetch the Seaport counter for an address
   */
  private async getSeaportCounter(offerer: `0x${string}`): Promise<bigint> {
    const seaportAddress = getSeaportAddress(this.chainId);
    const counter = await readContract(this.client, {
      address: seaportAddress,
      abi: SEAPORT_GET_COUNTER_ABI,
      functionName: "getCounter",
      args: [offerer],
    });
    return BigInt(counter as bigint);
  }

  /**
   * Prepare an NFT listing order for signing.
   *
   * Returns EIP-712 typed data for the caller to sign, plus any maker approvals needed
   * (ERC721 `setApprovalForAll` for Seaport).
   */
  async prepareCreateListing(
    params: CreateListingParams & { offerer: `0x${string}`; targetFulfiller?: `0x${string}` }
  ): Promise<PreparedOrder> {
    const seaportAddress = getSeaportAddress(this.chainId);
    const counter = await this.getSeaportCounter(params.offerer);

    const { orderParameters } = buildListingOrderComponents(params, this.chainId, counter);
    const eip712 = buildEIP712OrderData(orderParameters, counter, this.chainId, seaportAddress);

    // Check ERC721 approval
    const approvals: WriteTransactionConfig[] = [];
    const nftApproval = await checkErc721Approval(
      this.client,
      params.nftAddress,
      params.offerer,
      seaportAddress
    );
    if (nftApproval) {
      approvals.push(nftApproval);
    }

    return { eip712, approvals };
  }

  /**
   * Prepare a collection offer order for signing.
   *
   * Returns EIP-712 typed data for the caller to sign, plus any maker approvals needed
   * (WETH `approve` for Seaport).
   */
  async prepareCreateCollectionOffer(
    params: CreateCollectionOfferParams & { offerer: `0x${string}` }
  ): Promise<PreparedOrder> {
    const seaportAddress = getSeaportAddress(this.chainId);
    const weth = getWrappedNativeCurrency(this.chainId);
    if (!weth) {
      throw new Error(`No wrapped native currency configured for chain ${this.chainId}`);
    }

    const counter = await this.getSeaportCounter(params.offerer);

    const { orderParameters } = buildCollectionOfferOrderComponents(params, this.chainId, counter);
    const eip712 = buildEIP712OrderData(orderParameters, counter, this.chainId, seaportAddress);

    // Check WETH approval
    const approvals: WriteTransactionConfig[] = [];
    const wethApproval = await checkErc20Approval(
      this.client,
      weth.address,
      params.offerer,
      seaportAddress,
      params.priceWei
    );
    if (wethApproval) {
      approvals.push(wethApproval);
    }

    return { eip712, approvals };
  }

  /**
   * Prepare an ERC20 offer order for signing.
   *
   * Returns EIP-712 typed data for the caller to sign, plus any maker approvals needed
   * (WETH `approve` for Seaport).
   */
  async prepareCreateErc20Offer(
    params: CreateErc20OfferParams & { offerer: `0x${string}` }
  ): Promise<PreparedOrder> {
    const seaportAddress = getSeaportAddress(this.chainId);
    const weth = getWrappedNativeCurrency(this.chainId);
    if (!weth) {
      throw new Error(`No wrapped native currency configured for chain ${this.chainId}`);
    }

    const counter = await this.getSeaportCounter(params.offerer);

    const { orderParameters } = buildErc20OfferOrderComponents(params, this.chainId, counter);
    const eip712 = buildEIP712OrderData(orderParameters, counter, this.chainId, seaportAddress);

    // Check WETH approval
    const approvals: WriteTransactionConfig[] = [];
    const wethApproval = await checkErc20Approval(
      this.client,
      weth.address,
      params.offerer,
      seaportAddress,
      params.priceWei
    );
    if (wethApproval) {
      approvals.push(wethApproval);
    }

    return { eip712, approvals };
  }

  /**
   * Prepare an ERC20 listing order for signing.
   *
   * Returns EIP-712 typed data for the caller to sign, plus any maker approvals needed
   * (ERC20 `approve` for Seaport).
   */
  async prepareCreateErc20Listing(
    params: CreateErc20ListingParams & { offerer: `0x${string}`; targetFulfiller?: `0x${string}` }
  ): Promise<PreparedOrder> {
    const seaportAddress = getSeaportAddress(this.chainId);
    const counter = await this.getSeaportCounter(params.offerer);

    const { orderParameters } = buildErc20ListingOrderComponents(params, this.chainId, counter);
    const eip712 = buildEIP712OrderData(orderParameters, counter, this.chainId, seaportAddress);

    // Check ERC20 approval (seller needs to approve Seaport for the token being sold)
    const approvals: WriteTransactionConfig[] = [];
    const tokenApproval = await checkErc20Approval(
      this.client,
      params.tokenAddress,
      params.offerer,
      seaportAddress,
      params.tokenAmount
    );
    if (tokenApproval) {
      approvals.push(tokenApproval);
    }

    return { eip712, approvals };
  }

  // ─── Order Creation Methods (Step 2: Submit signed order) ─────────

  /**
   * Prepare a submit transaction for an NFT listing.
   *
   * Call this after the user has signed the EIP-712 data from prepareCreateListing().
   */
  prepareSubmitListing(
    orderParameters: SeaportOrderParameters,
    counter: bigint,
    signature: `0x${string}`
  ): WriteTransactionConfig {
    return buildSubmitOrderTx(
      getBazaarAddress(this.chainId),
      BAZAAR_V2_ABI,
      orderParameters,
      counter,
      signature
    );
  }

  /**
   * Prepare a submit transaction for a collection offer.
   *
   * Call this after the user has signed the EIP-712 data from prepareCreateCollectionOffer().
   */
  prepareSubmitCollectionOffer(
    orderParameters: SeaportOrderParameters,
    counter: bigint,
    signature: `0x${string}`
  ): WriteTransactionConfig {
    return buildSubmitOrderTx(
      getCollectionOffersAddress(this.chainId),
      BAZAAR_COLLECTION_OFFERS_ABI,
      orderParameters,
      counter,
      signature
    );
  }

  /**
   * Prepare a submit transaction for an ERC20 offer.
   *
   * Call this after the user has signed the EIP-712 data from prepareCreateErc20Offer().
   */
  prepareSubmitErc20Offer(
    orderParameters: SeaportOrderParameters,
    counter: bigint,
    signature: `0x${string}`
  ): WriteTransactionConfig {
    const erc20OffersAddress = getErc20OffersAddress(this.chainId);
    if (!erc20OffersAddress) {
      throw new Error(`ERC20 offers not available on chain ${this.chainId}`);
    }

    return buildSubmitOrderTx(
      erc20OffersAddress,
      BAZAAR_ERC20_OFFERS_ABI,
      orderParameters,
      counter,
      signature
    );
  }

  /**
   * Prepare a submit transaction for an ERC20 listing.
   *
   * Call this after the user has signed the EIP-712 data from prepareCreateErc20Listing().
   */
  prepareSubmitErc20Listing(
    orderParameters: SeaportOrderParameters,
    counter: bigint,
    signature: `0x${string}`
  ): WriteTransactionConfig {
    return buildSubmitOrderTx(
      getErc20BazaarAddress(this.chainId),
      BAZAAR_V2_ABI,
      orderParameters,
      counter,
      signature
    );
  }

  // ─── Owned Tokens Query ─────────────────────────────────────────────

  /**
   * Get token IDs owned by an address for an ERC721 collection.
   *
   * Uses the on-chain ERC721TokenOwnerRangeHelper contract, batching
   * large ranges into 5000-token chunks to avoid RPC limits.
   */
  async getOwnedTokens(params: {
    nftAddress: `0x${string}`;
    ownerAddress: `0x${string}`;
    startTokenId?: bigint;
    endTokenId?: bigint;
  }): Promise<bigint[]> {
    const { nftAddress, ownerAddress } = params;
    const startTokenId = params.startTokenId ?? 0n;
    const endTokenId = params.endTokenId ?? 10000n;

    const ownedTokens: bigint[] = [];
    let current = startTokenId;

    while (current < endTokenId) {
      const batchEnd = current + OWNED_TOKENS_BATCH_SIZE < endTokenId
        ? current + OWNED_TOKENS_BATCH_SIZE
        : endTokenId;

      try {
        const result = await readContract(this.client, {
          address: ERC721_TOKEN_OWNER_RANGE_HELPER_ADDRESS,
          abi: ERC721_TOKEN_OWNER_RANGE_HELPER_ABI as unknown as Abi,
          functionName: "getOwnedTokensInRange",
          args: [nftAddress, ownerAddress, current, batchEnd],
        }) as bigint[];

        for (const tokenId of result) {
          ownedTokens.push(tokenId);
        }
      } catch {
        // Batch failed (e.g. RPC timeout or gas limit), skip it
      }

      current = batchEnd;
    }

    return ownedTokens;
  }
}
