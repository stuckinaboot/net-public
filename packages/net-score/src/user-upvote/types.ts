import type { Address } from "viem";

// --- Parsed message from Net protocol ---

export type ParsedUserUpvoteMessage = {
  upvotedUserString: string;
  actualToken: string;
  numUpvotes: number;
  tokenWethPrice: bigint;
  wethUsdcPrice: bigint;
  alphaWethPrice: bigint;
  userTokenBalance?: bigint;
};

export type TokenAddressExtraction = {
  tokenAddresses: string[];
  validMessages: ParsedUserUpvoteMessage[];
};

// --- Enriched upvote data ---

export type UserUpvote = {
  tokenAddress: string;
  numUpvotes: number;
  timestamp: number;
  priceInUsdc?: number;
  userTokenBalance: number;
  userTokenBalanceUsdValue?: number;
  upvotedUserAddress?: string;
  tokenInfo?: {
    name: string;
    symbol: string;
    decimals: number;
  };
};

export type UserUpvoteReceived = {
  upvoterAddress: string;
  tokenAddress: string;
  numUpvotes: number;
  timestamp: number;
  priceInUsdc?: number;
  userTokenBalance: number;
  userTokenBalanceUsdValue?: number;
  tokenInfo?: {
    name: string;
    symbol: string;
    decimals: number;
  };
};

// --- Client options ---

export type UserUpvoteClientOptions = {
  chainId: number;
  overrides?: {
    contractAddress?: Address;
    rpcUrls?: string[];
  };
};

// --- Net message type (compatible with @net-protocol/core NetMessage) ---

export type UserUpvoteNetMessage = {
  app: `0x${string}`;
  sender: `0x${string}`;
  timestamp: bigint;
  data: `0x${string}`;
  text: string;
  topic: string;
};
