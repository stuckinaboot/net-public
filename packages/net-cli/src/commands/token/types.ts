export interface TokenDeployOptions {
  name: string;
  symbol: string;
  image: string;
  animation?: string;
  fid?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
  mintPrice?: string;
  mintEndTimestamp?: string;
  maxMintSupply?: string;
  metadataAddress?: string;
  extraStringData?: string;
  initialBuy?: string;
}

export interface TokenInfoOptions {
  address: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

export interface TokenSendOptions {
  /** Token address, or "ETH" for native ETH */
  token: string;
  to: string;
  /** Amount in token units, e.g. "5" for 5 USDC */
  amount: string;
  message?: string;
  privateKey?: string;
  /** Sender address; required with --encode-only (no private key) to check allowance */
  sender?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

export interface TokenTransfersOptions {
  sentBy?: string;
  receivedBy?: string;
  from?: string;
  to?: string;
  token?: string;
  limit?: string;
  offset?: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}
