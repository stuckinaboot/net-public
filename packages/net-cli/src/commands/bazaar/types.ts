export interface ListListingsOptions {
  nftAddress?: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

export interface ListOffersOptions {
  nftAddress: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

export interface ListSalesOptions {
  nftAddress: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

export interface CreateListingOptions {
  nftAddress: string;
  tokenId: string;
  price: string;
  targetFulfiller?: string;
  offerer?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
}

export interface CreateOfferOptions {
  nftAddress: string;
  price: string;
  offerer?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
}

export interface SubmitListingOptions {
  orderData: string;
  signature: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

export interface SubmitOfferOptions {
  orderData: string;
  signature: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

export interface BuyListingOptions {
  orderHash: string;
  nftAddress: string;
  buyer?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

export interface AcceptOfferOptions {
  orderHash: string;
  nftAddress: string;
  tokenId: string;
  seller?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

export interface OwnedNftsOptions {
  nftAddress: string;
  owner: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
  startTokenId?: string;
  endTokenId?: string;
}

export interface ListErc20ListingsOptions {
  tokenAddress: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

export interface ListErc20OffersOptions {
  tokenAddress: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

export interface CreateErc20ListingOptions {
  tokenAddress: string;
  tokenAmount: string;
  price: string;
  offerer?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
}

export interface CreateErc20OfferOptions {
  tokenAddress: string;
  tokenAmount: string;
  price: string;
  offerer?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
}

export interface SubmitErc20ListingOptions {
  orderData: string;
  signature: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

export interface SubmitErc20OfferOptions {
  orderData: string;
  signature: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

export interface BuyErc20ListingOptions {
  orderHash: string;
  tokenAddress: string;
  buyer?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

export interface AcceptErc20OfferOptions {
  orderHash: string;
  tokenAddress: string;
  seller?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}
