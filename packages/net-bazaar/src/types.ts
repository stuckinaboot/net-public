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
  /** NFT collection address (optional - if omitted, fetches recent listings across all collections) */
  nftAddress?: `0x${string}`;
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
  /** Include expired listings in results (default: false) */
  includeExpired?: boolean;
}

/**
 * Options for fetching collection offers
 */
export interface GetCollectionOffersOptions {
  /** NFT collection address (optional - if omitted, fetches recent offers across all collections) */
  nftAddress?: `0x${string}`;
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
 * Sale information (parsed from zone storage)
 */
export interface Sale {
  /** Seller's address (offerer) */
  seller: `0x${string}`;
  /** Buyer's address (fulfiller) */
  buyer: `0x${string}`;
  /** NFT/token contract address */
  tokenAddress: `0x${string}`;
  /** Token ID */
  tokenId: string;
  /** Amount of tokens sold */
  amount: bigint;
  /** Item type (ERC20, ERC721, etc.) */
  itemType: ItemType;
  /** Total price in wei */
  priceWei: bigint;
  /** Total price in native currency (formatted) */
  price: number;
  /** Currency symbol (e.g., "eth", "degen") */
  currency: string;
  /** Sale timestamp in seconds */
  timestamp: number;
  /** Seaport order hash */
  orderHash: string;
}

/**
 * Options for fetching sales
 */
export interface GetSalesOptions {
  /** NFT collection address */
  nftAddress: `0x${string}`;
  /** Maximum number of messages to fetch (default: 100) */
  maxMessages?: number;
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
  /** Native currency value to send (in wei) */
  value?: bigint;
}

/**
 * Prepared fulfillment with optional approvals and the Seaport call
 */
export interface PreparedFulfillment {
  /** ERC721/ERC20 approve txs (empty if not needed) */
  approvals: WriteTransactionConfig[];
  /** The Seaport fulfillOrder or fulfillAdvancedOrder call */
  fulfillment: WriteTransactionConfig;
}

/**
 * EIP-712 typed data for signing a Seaport order
 */
export interface EIP712OrderData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: `0x${string}`;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  /** OrderComponents message (without totalOriginalConsiderationItems, with counter) */
  message: Record<string, unknown>;
  /** Full order parameters for step 2 submission */
  orderParameters: SeaportOrderParameters;
  /** The counter used in the order */
  counter: bigint;
}

/**
 * Prepared order with EIP-712 data for signing and maker approvals
 */
export interface PreparedOrder {
  /** EIP-712 typed data for the caller to sign */
  eip712: EIP712OrderData;
  /** Maker approvals needed (e.g., NFT/ERC20/WETH approve for Seaport) */
  approvals: WriteTransactionConfig[];
}

/**
 * Parameters for creating an ERC20 offer (buying ERC20 tokens with WETH)
 */
export interface CreateErc20OfferParams {
  /** ERC20 token address to buy */
  tokenAddress: `0x${string}`;
  /** Amount of tokens to buy */
  tokenAmount: bigint;
  /** Total price in wei (WETH) */
  priceWei: bigint;
  /** Expiration timestamp in seconds (defaults to 24h from now) */
  expirationDate?: number;
}

/**
 * Parameters for creating an ERC20 listing (selling ERC20 tokens for native currency)
 */
export interface CreateErc20ListingParams {
  /** ERC20 token address to sell */
  tokenAddress: `0x${string}`;
  /** Amount of tokens to sell */
  tokenAmount: bigint;
  /** Total price in wei (native currency) */
  priceWei: bigint;
  /** Expiration timestamp in seconds (defaults to 24h from now) */
  expirationDate?: number;
}
