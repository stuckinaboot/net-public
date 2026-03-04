export interface UpvoteTokenOptions {
  tokenAddress: string;
  count: string;
  splitType?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

export interface GetUpvotesOptions {
  tokenAddress: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

export interface UpvoteUserOptions {
  address: string;
  count: string;
  token?: string;
  feeTier?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

export interface GetUserUpvotesOptions {
  address: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}
