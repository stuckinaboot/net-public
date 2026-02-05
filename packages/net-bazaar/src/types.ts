/**
 * Bazaar types for NFT listings and collection offers
 */

/**
 * Seaport order status
 */
export enum SeaportOrderStatus {
  CANCELLED = 0,
  EXPIRED = 1,
  OPEN = 2,
  FILLED = 3,
}

/**
 * NFT listing information
 */
export interface Listing {
  /** Seller's address */
  maker: `0x${string}`;
  /** NFT contract address */
  nftAddress: `0x${string}`;
  /** Token ID */
  tokenId: string;
  /** Price in wei */
  priceWei: bigint;
  /** Price in native currency (formatted) */
  price: number;
  /** Currency symbol (e.g., "eth", "degen") */
  currency: string;
  /** Expiration timestamp in seconds */
  expirationDate: number;
  /** Seaport order hash */
  orderHash: string;
  /** Order status (open, filled, cancelled, expired) */
  orderStatus: SeaportOrderStatus;
  /** Raw message data for fulfillment */
  messageData: `0x${string}`;
  /** Decoded Seaport order components */
  orderComponents?: SeaportOrderComponents;
  /** Private order fulfiller zone hash (undefined = public order) */
  targetFulfiller?: `0x${string}`;
}

/**
 * Collection offer information
 */
export interface CollectionOffer {
  /** Buyer's address */
  maker: `0x${string}`;
  /** NFT collection address */
  nftAddress: `0x${string}`;
  /** Offer price in wei (WETH) */
  priceWei: bigint;
  /** Offer price in native currency (formatted) */
  price: number;
  /** Currency symbol */
  currency: string;
  /** Expiration timestamp in seconds */
  expirationDate: number;
  /** Seaport order hash */
  orderHash: string;
  /** Order status */
  orderStatus: SeaportOrderStatus;
  /** Raw message data for acceptance */
  messageData: `0x${string}`;
  /** Decoded Seaport order components */
  orderComponents?: SeaportOrderComponents;
}

/**
 * ERC20 offer information
 */
export interface Erc20Offer {
  /** Buyer's address */
  maker: `0x${string}`;
  /** ERC20 token address being purchased */
  tokenAddress: `0x${string}`;
  /** Amount of tokens being purchased */
  tokenAmount: bigint;
  /** Total WETH price in wei */
  priceWei: bigint;
  /** Price per token in wei (priceWei / tokenAmount) */
  pricePerTokenWei: bigint;
  /** Total price in native currency (formatted) */
  price: number;
  /** Price per token in native currency (formatted) */
  pricePerToken: number;
  /** Currency symbol (e.g., "eth", "hype") */
  currency: string;
  /** Expiration timestamp in seconds */
  expirationDate: number;
  /** Seaport order hash */
  orderHash: `0x${string}`;
  /** Order status */
  orderStatus: SeaportOrderStatus;
  /** Raw message data for acceptance */
  messageData: `0x${string}`;
  /** Decoded Seaport order components */
  orderComponents?: SeaportOrderComponents;
}

/**
 * ERC20 listing information
 */
export interface Erc20Listing {
  /** Seller's address */
  maker: `0x${string}`;
  /** ERC20 token address being sold */
  tokenAddress: `0x${string}`;
  /** Amount of tokens being sold */
  tokenAmount: bigint;
  /** Total price in wei (native currency) */
  priceWei: bigint;
  /** Price per token in wei (priceWei / tokenAmount) */
  pricePerTokenWei: bigint;
  /** Total price in native currency (formatted) */
  price: number;
  /** Price per token in native currency (formatted) */
  pricePerToken: number;
  /** Currency symbol (e.g., "eth", "hype") */
  currency: string;
  /** Expiration timestamp in seconds */
  expirationDate: number;
  /** Seaport order hash */
  orderHash: `0x${string}`;
  /** Order status */
  orderStatus: SeaportOrderStatus;
  /** Raw message data for fulfillment */
  messageData: `0x${string}`;
  /** Decoded Seaport order components */
  orderComponents?: SeaportOrderComponents;
}

/**
 * Seaport item types
 */
export enum ItemType {
  NATIVE = 0,
  ERC20 = 1,
  ERC721 = 2,
  ERC1155 = 3,
  ERC721_WITH_CRITERIA = 4,
  ERC1155_WITH_CRITERIA = 5,
}

/**
 * Seaport order type
 */
export enum OrderType {
  FULL_OPEN = 0,
  PARTIAL_OPEN = 1,
  FULL_RESTRICTED = 2,
  PARTIAL_RESTRICTED = 3,
}

/**
 * Seaport offer item
 */
export interface OfferItem {
  itemType: ItemType;
  token: `0x${string}`;
  identifierOrCriteria: bigint;
  startAmount: bigint;
  endAmount: bigint;
}

/**
 * Seaport consideration item
 */
export interface ConsiderationItem {
  itemType: ItemType;
  token: `0x${string}`;
  identifierOrCriteria: bigint;
  startAmount: bigint;
  endAmount: bigint;
  recipient: `0x${string}`;
}

/**
 * Seaport order parameters
 */
export interface SeaportOrderParameters {
  offerer: `0x${string}`;
  zone: `0x${string}`;
  offer: OfferItem[];
  consideration: ConsiderationItem[];
  orderType: OrderType;
  startTime: bigint;
  endTime: bigint;
  zoneHash: `0x${string}`;
  salt: bigint;
  conduitKey: `0x${string}`;
  totalOriginalConsiderationItems: bigint;
}

/**
 * Seaport order components (parameters + counter)
 */
export interface SeaportOrderComponents extends SeaportOrderParameters {
  counter: bigint;
}

/**
 * Seaport submission (order + signature)
 */
export interface SeaportSubmission {
  parameters: SeaportOrderParameters;
  counter: bigint;
  signature: `0x${string}`;
}

/**
 * Seaport order status info from on-chain
 */
export interface SeaportOrderStatusInfo {
  isValidated: boolean;
  isCancelled: boolean;
  totalFilled: bigint;
  totalSize: bigint;
}

/**
 * Parameters for creating an NFT listing
 */
export interface CreateListingParams {
  /** NFT contract address */
  nftAddress: `0x${string}`;
  /** Token ID to list */
  tokenId: string;
  /** Price in wei */
  priceWei: bigint;
  /** Expiration timestamp in seconds (defaults to 24h from now) */
  expirationDate?: number;
}

/**
 * Parameters for creating a collection offer
 */
export interface CreateCollectionOfferParams {
  /** NFT collection address */
  nftAddress: `0x${string}`;
  /** Offer price in wei (WETH) */
  priceWei: bigint;
  /** Expiration timestamp in seconds (defaults to 24h from now) */
  expirationDate?: number;
}

/**
 * Options for fetching listings
 */
export interface GetListingsOptions {
  /** NFT collection address */
  nftAddress: `0x${string}`;
  /** Exclude listings from this address */
  excludeMaker?: `0x${string}`;
  /** Only include listings from this address */
  maker?: `0x${string}`;
  /** Maximum number of messages to fetch (default: 200) */
  maxMessages?: number;
  /** Override start index for message range */
  startIndex?: number;
  /** Override end index for message range */
  endIndex?: number;
}

/**
 * Options for fetching collection offers
 */
export interface GetCollectionOffersOptions {
  /** NFT collection address */
  nftAddress: `0x${string}`;
  /** Exclude offers from this address */
  excludeMaker?: `0x${string}`;
  /** Maximum number of messages to fetch (default: 100) */
  maxMessages?: number;
}

/**
 * Options for fetching ERC20 offers
 */
export interface GetErc20OffersOptions {
  /** ERC20 token address to filter by */
  tokenAddress: `0x${string}`;
  /** Exclude offers from this address */
  excludeMaker?: `0x${string}`;
  /** Maximum number of messages to fetch (default: 200) */
  maxMessages?: number;
}

/**
 * Options for fetching ERC20 listings
 */
export interface GetErc20ListingsOptions {
  /** ERC20 token address to filter by */
  tokenAddress: `0x${string}`;
  /** Exclude listings from this address */
  excludeMaker?: `0x${string}`;
  /** Only include listings from this address */
  maker?: `0x${string}`;
  /** Maximum number of messages to fetch (default: 200) */
  maxMessages?: number;
  /** Override start index for message range */
  startIndex?: number;
  /** Override end index for message range */
  endIndex?: number;
}

/**
 * Transaction configuration for write operations
 */
export interface WriteTransactionConfig {
  /** Contract address to call */
  to: `0x${string}`;
  /** Function name */
  functionName: string;
  /** Function arguments */
  args: readonly unknown[];
  /** Contract ABI */
  abi: readonly unknown[];
}
