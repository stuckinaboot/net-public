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
