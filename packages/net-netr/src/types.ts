export type NetrTokenMetadata = {
  name: string;
  symbol: string;
  deployer: `0x${string}`;
  image: string;
  animation: string;
  fid: bigint;
  totalSupply: bigint;
  decimals: number;
  extraStringData: string;
};

export type NetrStorageData = {
  messageIndex: bigint;
  dropIndex: bigint | undefined;
  dropAddress: `0x${string}` | undefined;
  poolAddress: `0x${string}` | undefined;
  lockerAddress: `0x${string}` | undefined;
};

export type PoolSlot0 = {
  sqrtPriceX96: bigint;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
};

export type NetrPriceData = {
  priceInWeth: number;
  priceInEth: number;
  sqrtPriceX96: bigint;
  tick: number;
};

export type NetrLockerData = {
  owner: `0x${string}`;
  duration: bigint;
  endTimestamp: bigint;
  version: string;
};

export type NetrSaltResult = {
  salt: `0x${string}`;
  predictedAddress: `0x${string}`;
};

export type NetrDeployConfig = {
  name: string;
  symbol: string;
  image: string;
  animation?: string;
  deployer: `0x${string}`;
  fid?: bigint;
  totalSupply?: bigint;
  initialTick?: number;
  metadataAddress?: `0x${string}`;
  extraStringData?: string;
  mintPrice?: bigint;
  mintEndTimestamp?: bigint;
  maxMintSupply?: bigint;
  /** ETH amount in wei to swap for tokens on deployment */
  initialBuy?: bigint;
};

export type NetrDeployTxConfig = {
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: "deployToken";
  args: readonly [
    bigint,
    number,
    `0x${string}`,
    `0x${string}`,
    bigint,
    bigint,
    bigint,
    bigint,
    string,
    string,
    string,
    string,
    `0x${string}`,
    string
  ];
  chainId: number;
  /** ETH value to send with transaction (for initial buy) */
  value?: bigint;
};

export type UseNetrTokenOptions = {
  chainId: number;
  tokenAddress?: `0x${string}`;
  enabled?: boolean;
};

export type UseNetrPriceOptions = {
  chainId: number;
  tokenAddress?: `0x${string}`;
  enabled?: boolean;
  refreshInterval?: number;
};

export type UseNetrLockerOptions = {
  chainId: number;
  lockerAddress?: `0x${string}`;
  enabled?: boolean;
};

export type NetrClientOptions = {
  chainId: number;
  overrides?: { rpcUrls: string[] };
};
