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
