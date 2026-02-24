import type { Address } from "viem";

// --- Score Item types (discriminated union) ---

export type ScoreItem =
  | { type: "token"; tokenAddress: string }
  | { type: "storage"; operatorAddress: string; storageKey: string }
  | { type: "feed"; message: FeedMessage };

export type FeedMessage = {
  app: Address;
  sender: Address;
  timestamp: bigint;
  data: `0x${string}`;
  text: string;
  topic: string;
};

// --- Pool Key ---

export type PoolKey = {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
};

// --- Strategy metadata types ---

export type PureAlphaMetadata = {
  alphaAmount: bigint;
  alphaWethPrice: bigint;
  wethUsdcPrice: bigint;
  userAlphaBalance: bigint;
};

export type PoolStrategyMetadata = {
  tokenAmount: bigint;
  tokenWethPrice: bigint;
  wethUsdcPrice: bigint;
  alphaWethPrice: bigint;
  userTokenBalance: bigint;
};

export type DecodedStrategyMetadata =
  | PureAlphaMetadata
  | PoolStrategyMetadata
  | null;

export type DecodedUpvoteBlob = {
  scoreKey: `0x${string}`;
  scoreDelta: number;
  originalSender: Address;
  appAddress: Address;
  strategyAddress: Address;
  timestamp: number;
  scoreStoredContext: `0x${string}`;
  scoreUnstoredContext: `0x${string}`;
  decodedMetadata: DecodedStrategyMetadata;
} | null;

// --- Pool Discovery ---

export type PoolDiscoveryResult = {
  tokenAddress: string;
  baseTokenAddress: string;
  poolAddress: string | null;
  price: number | null;
  fee: number;
  poolKey?: PoolKey;
  balances?: {
    baseTokenBalance: string;
    token0Balance: string;
    token1Balance: string;
  };
};

// --- Client options ---

export type ScoreClientOptions = {
  chainId: number;
  overrides?: {
    scoreAddress?: Address;
    upvoteAppAddress?: Address;
    rpcUrls?: string[];
  };
};

export type GetUpvotesOptions = {
  scoreKeys: `0x${string}`[];
  strategies?: Address[];
};

export type GetUpvotesForItemsOptions = {
  items: ScoreItem[];
  strategies?: Address[];
};

export type GetStrategyKeyScoresOptions = {
  strategy: Address;
  scoreKeys: `0x${string}`[];
};

export type GetAppKeyScoresOptions = {
  app: Address;
  scoreKeys: `0x${string}`[];
};

// --- Hook options ---

export type UseUpvotesOptions = {
  chainId: number;
  scoreKey: `0x${string}`;
  strategies?: Address[];
  enabled?: boolean;
};

export type UseUpvotesBatchOptions = {
  chainId: number;
  items: ScoreItem[];
  strategies?: Address[];
  enabled?: boolean;
};

export type UseTokenUpvotesOptions = {
  chainId: number;
  tokenAddress: string;
  enabled?: boolean;
};
