/**
 * Bazaar chain configuration
 *
 * Contains contract addresses and configuration for each supported chain.
 */

export interface WrappedNativeCurrency {
  address: `0x${string}`;
  name: string;
  symbol: string;
}

/**
 * Quote token for ERC20 bazaar trades.
 *
 * When set, ERC20 offers and listings on this chain use this token as the
 * payment currency instead of the wrapped native currency / native currency.
 * Offers pay in this token; listings receive payment in this token (ERC20
 * consideration instead of NATIVE).
 */
export interface QuoteToken {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
}

export interface BazaarChainConfig {
  /** Main NFT listing contract */
  bazaarAddress: `0x${string}`;
  /** Collection offers contract */
  collectionOffersAddress: `0x${string}`;
  /** ERC20 offers contract */
  erc20OffersAddress?: `0x${string}`;
  /** ERC20 listings contract */
  erc20BazaarAddress?: `0x${string}`;
  /** Seaport contract address */
  seaportAddress: `0x${string}`;
  /** Fee collector address */
  feeCollectorAddress: `0x${string}`;
  /** Fee in basis points for NFT trades */
  nftFeeBps: number;
  /** Fee in basis points for ERC20 trades (defaults to DEFAULT_ERC20_FEE_BPS) */
  erc20FeeBps?: number;
  /** Wrapped native currency (WETH, etc.) */
  wrappedNativeCurrency: WrappedNativeCurrency;
  /**
   * Optional quote token for ERC20 bazaar trades.
   *
   * If set, ERC20 offers/listings on this chain use this token (e.g. USDC)
   * for pricing instead of the wrapped native currency / native currency.
   * If unset, offers use wrappedNativeCurrency and listings use NATIVE.
   */
  erc20QuoteToken?: QuoteToken;
  /** Address with high ETH balance for Seaport checks */
  highEthAddress?: `0x${string}`;
  /** Native currency symbol (lowercase) */
  currencySymbol: string;
}

// Default addresses used by most chains
const DEFAULT_SEAPORT_ADDRESS = "0x0000000000000068F116a894984e2DB1123eB395" as const;
const DEFAULT_BAZAAR_ADDRESS = "0x00000000E3dA5fC031282A39759bDDA78ae7fAE5" as const;
const DEFAULT_COLLECTION_OFFERS_ADDRESS = "0x0000000D43423E0A12CecB307a74591999b32B32" as const;
const DEFAULT_FEE_COLLECTOR_ADDRESS = "0x32D16C15410248bef498D7aF50D10Db1a546b9E5" as const;
const DEFAULT_ERC20_BAZAAR_ADDRESS = "0x00000000a2d173a4610c85c7471a25b6bc216a70" as const;
const DEFAULT_NFT_FEE_BPS = 500; // 5%
const DEFAULT_ERC20_FEE_BPS = 100; // 1%

// Helper contract addresses (same on all chains)
export const BULK_SEAPORT_ORDER_STATUS_FETCHER_ADDRESS = "0x0000009112ABCE652674b4fE3eD9C765B22d11A7" as const;
export const ERC721_OWNER_OF_HELPER_ADDRESS = "0x00000012E3eb0700925947fAF9cd1440319b4F37" as const;
export const ERC20_BULK_BALANCE_CHECKER_ADDRESS = "0x000000B50A9f2923F2DB931391824F6D1278f712" as const;

// Zone contract addresses (same on all chains)
export const NET_SEAPORT_ZONE_ADDRESS = "0x000000007F8c58fbf215bF91Bda7421A806cf3ae" as const;
export const NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS = "0x000000B799ec6D7aCC1B578f62bFc324c25DFC5A" as const;
export const NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS = "0x000000bC63761cbb05305632212e2f3AE2BE7a9B" as const;

/**
 * Chain-specific bazaar configuration
 */
const BAZAAR_CHAIN_CONFIGS: Record<number, BazaarChainConfig> = {
  // Ethereum Mainnet
  1: {
    bazaarAddress: "0x000000058f3ade587388daf827174d0e6fc97595",
    collectionOffersAddress: "0x0000000f9c45efcff0f78d8b54aa6a40092d66dc",
    erc20OffersAddress: "0x0000000e23a89aa06f317306aa1ae231d3503082",
    erc20BazaarAddress: "0x00000006557e3629e2fc50bbad0c002b27cac492",
    seaportAddress: DEFAULT_SEAPORT_ADDRESS,
    feeCollectorAddress: "0x66547ff4f7206e291F7BC157b54C026Fc6660961",
    nftFeeBps: 0, // 0% on Ethereum Mainnet
    erc20FeeBps: 0,
    wrappedNativeCurrency: {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      name: "Wrapped Ether",
      symbol: "WETH",
    },
    currencySymbol: "eth",
  },

  // Base Mainnet
  8453: {
    bazaarAddress: "0x000000058f3ade587388daf827174d0e6fc97595",
    collectionOffersAddress: "0x0000000f9c45efcff0f78d8b54aa6a40092d66dc",
    erc20OffersAddress: "0x0000000e23a89aa06f317306aa1ae231d3503082",
    erc20BazaarAddress: "0x00000006557e3629e2fc50bbad0c002b27cac492",
    seaportAddress: DEFAULT_SEAPORT_ADDRESS,
    feeCollectorAddress: "0x66547ff4f7206e291F7BC157b54C026Fc6660961",
    nftFeeBps: 0, // 0% on Base
    erc20FeeBps: 0,
    wrappedNativeCurrency: {
      address: "0x4200000000000000000000000000000000000006",
      name: "Wrapped Ether",
      symbol: "WETH",
    },
    // ERC20 bazaar trades on Base are priced in USDC, not WETH/ETH.
    erc20QuoteToken: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      symbol: "USDC",
      decimals: 6,
    },
    currencySymbol: "eth",
  },

  // Base Sepolia (Testnet)
  84532: {
    bazaarAddress: DEFAULT_BAZAAR_ADDRESS,
    collectionOffersAddress: DEFAULT_COLLECTION_OFFERS_ADDRESS,
    seaportAddress: DEFAULT_SEAPORT_ADDRESS,
    feeCollectorAddress: DEFAULT_FEE_COLLECTOR_ADDRESS,
    nftFeeBps: DEFAULT_NFT_FEE_BPS,
    wrappedNativeCurrency: {
      address: "0x4200000000000000000000000000000000000006",
      name: "Wrapped Ether",
      symbol: "WETH",
    },
    currencySymbol: "eth",
  },

  // Degen
  666666666: {
    bazaarAddress: DEFAULT_BAZAAR_ADDRESS,
    collectionOffersAddress: DEFAULT_COLLECTION_OFFERS_ADDRESS,
    seaportAddress: DEFAULT_SEAPORT_ADDRESS,
    feeCollectorAddress: DEFAULT_FEE_COLLECTOR_ADDRESS,
    nftFeeBps: DEFAULT_NFT_FEE_BPS,
    wrappedNativeCurrency: {
      address: "0xEb54dACB4C2ccb64F8074eceEa33b5eBb38E5387",
      name: "Wrapped Degen",
      symbol: "WDEGEN",
    },
    currencySymbol: "degen",
  },

  // Ham Chain
  5112: {
    bazaarAddress: DEFAULT_BAZAAR_ADDRESS,
    collectionOffersAddress: DEFAULT_COLLECTION_OFFERS_ADDRESS,
    seaportAddress: DEFAULT_SEAPORT_ADDRESS,
    feeCollectorAddress: DEFAULT_FEE_COLLECTOR_ADDRESS,
    nftFeeBps: DEFAULT_NFT_FEE_BPS,
    wrappedNativeCurrency: {
      address: "0x4200000000000000000000000000000000000006",
      name: "Wrapped Ether",
      symbol: "WETH",
    },
    highEthAddress: "0x4200000000000000000000000000000000000006",
    currencySymbol: "eth",
  },

  // Ink Chain
  57073: {
    bazaarAddress: DEFAULT_BAZAAR_ADDRESS,
    collectionOffersAddress: DEFAULT_COLLECTION_OFFERS_ADDRESS,
    // Custom Seaport address for Ink (no create2 factory)
    seaportAddress: "0xD00C96804e9fF35f10C7D2a92239C351Ff3F94e5",
    feeCollectorAddress: DEFAULT_FEE_COLLECTOR_ADDRESS,
    nftFeeBps: DEFAULT_NFT_FEE_BPS,
    wrappedNativeCurrency: {
      address: "0x4200000000000000000000000000000000000006",
      name: "Wrapped ETH",
      symbol: "WETH",
    },
    highEthAddress: "0x4200000000000000000000000000000000000006",
    currencySymbol: "eth",
  },

  // Unichain
  130: {
    bazaarAddress: DEFAULT_BAZAAR_ADDRESS,
    collectionOffersAddress: DEFAULT_COLLECTION_OFFERS_ADDRESS,
    seaportAddress: DEFAULT_SEAPORT_ADDRESS,
    feeCollectorAddress: DEFAULT_FEE_COLLECTOR_ADDRESS,
    nftFeeBps: DEFAULT_NFT_FEE_BPS,
    wrappedNativeCurrency: {
      address: "0x4200000000000000000000000000000000000006",
      name: "Wrapped Ether",
      symbol: "WETH",
    },
    currencySymbol: "eth",
  },

  // HyperEVM (Hyperliquid)
  999: {
    bazaarAddress: "0x000000058f3ade587388daf827174d0e6fc97595",
    collectionOffersAddress: "0x0000000f9c45efcff0f78d8b54aa6a40092d66dc",
    erc20OffersAddress: "0x0000000e23a89aa06f317306aa1ae231d3503082",
    erc20BazaarAddress: "0x00000006557e3629e2fc50bbad0c002b27cac492",
    seaportAddress: DEFAULT_SEAPORT_ADDRESS,
    feeCollectorAddress: "0x66547ff4f7206e291F7BC157b54C026Fc6660961",
    nftFeeBps: 0, // 0% on HyperEVM
    erc20FeeBps: 0,
    wrappedNativeCurrency: {
      address: "0x5555555555555555555555555555555555555555",
      name: "Wrapped Hype",
      symbol: "WHYPE",
    },
    currencySymbol: "hype",
  },

  // Plasma
  9745: {
    bazaarAddress: DEFAULT_BAZAAR_ADDRESS,
    collectionOffersAddress: DEFAULT_COLLECTION_OFFERS_ADDRESS,
    seaportAddress: DEFAULT_SEAPORT_ADDRESS,
    feeCollectorAddress: DEFAULT_FEE_COLLECTOR_ADDRESS,
    nftFeeBps: DEFAULT_NFT_FEE_BPS,
    wrappedNativeCurrency: {
      address: "0x6100e367285b01f48d07953803a2d8dca5d19873",
      name: "Wrapped XPL",
      symbol: "WXPL",
    },
    currencySymbol: "xpl",
  },

  // Monad
  143: {
    bazaarAddress: DEFAULT_BAZAAR_ADDRESS,
    collectionOffersAddress: DEFAULT_COLLECTION_OFFERS_ADDRESS,
    seaportAddress: DEFAULT_SEAPORT_ADDRESS,
    feeCollectorAddress: DEFAULT_FEE_COLLECTOR_ADDRESS,
    nftFeeBps: DEFAULT_NFT_FEE_BPS,
    wrappedNativeCurrency: {
      address: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
      name: "Wrapped Monad",
      symbol: "WMONAD",
    },
    currencySymbol: "monad",
  },

  // MegaETH
  4326: {
    bazaarAddress: "0x000000058f3ade587388daf827174d0e6fc97595",
    collectionOffersAddress: "0x0000000f9c45efcff0f78d8b54aa6a40092d66dc",
    erc20OffersAddress: "0x0000000e23a89aa06f317306aa1ae231d3503082",
    erc20BazaarAddress: "0x00000006557e3629e2fc50bbad0c002b27cac492",
    seaportAddress: DEFAULT_SEAPORT_ADDRESS,
    feeCollectorAddress: "0x66547ff4f7206e291F7BC157b54C026Fc6660961",
    nftFeeBps: DEFAULT_NFT_FEE_BPS,
    wrappedNativeCurrency: {
      address: "0x4200000000000000000000000000000000000006",
      name: "Wrapped Ether",
      symbol: "WETH",
    },
    currencySymbol: "eth",
  },

  // Robinhood Chain (ETH-native Arbitrum L2)
  4663: {
    bazaarAddress: DEFAULT_BAZAAR_ADDRESS,
    collectionOffersAddress: DEFAULT_COLLECTION_OFFERS_ADDRESS,
    seaportAddress: DEFAULT_SEAPORT_ADDRESS,
    feeCollectorAddress: DEFAULT_FEE_COLLECTOR_ADDRESS,
    nftFeeBps: DEFAULT_NFT_FEE_BPS,
    wrappedNativeCurrency: {
      // WETH on Robinhood Chain (non-standard address; not the OP predeploy)
      address: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
      name: "Wrapped Ether",
      symbol: "WETH",
    },
    currencySymbol: "eth",
  },
};

/**
 * Get bazaar configuration for a chain
 */
export function getBazaarChainConfig(chainId: number): BazaarChainConfig | undefined {
  return BAZAAR_CHAIN_CONFIGS[chainId];
}

/**
 * Get all supported bazaar chain IDs
 */
export function getBazaarSupportedChainIds(): number[] {
  return Object.keys(BAZAAR_CHAIN_CONFIGS).map(Number);
}

/**
 * Check if bazaar is supported on a chain
 */
export function isBazaarSupportedOnChain(chainId: number): boolean {
  return chainId in BAZAAR_CHAIN_CONFIGS;
}

/**
 * Get bazaar contract address for a chain
 */
export function getBazaarAddress(chainId: number): `0x${string}` {
  return BAZAAR_CHAIN_CONFIGS[chainId]?.bazaarAddress ?? DEFAULT_BAZAAR_ADDRESS;
}

/**
 * Get collection offers contract address for a chain
 */
export function getCollectionOffersAddress(chainId: number): `0x${string}` {
  return BAZAAR_CHAIN_CONFIGS[chainId]?.collectionOffersAddress ?? DEFAULT_COLLECTION_OFFERS_ADDRESS;
}

/**
 * Get Seaport contract address for a chain
 */
export function getSeaportAddress(chainId: number): `0x${string}` {
  return BAZAAR_CHAIN_CONFIGS[chainId]?.seaportAddress ?? DEFAULT_SEAPORT_ADDRESS;
}

/**
 * Get fee collector address for a chain
 */
export function getFeeCollectorAddress(chainId: number): `0x${string}` {
  return BAZAAR_CHAIN_CONFIGS[chainId]?.feeCollectorAddress ?? DEFAULT_FEE_COLLECTOR_ADDRESS;
}

/**
 * Get NFT fee in basis points for a chain
 */
export function getNftFeeBps(chainId: number): number {
  return BAZAAR_CHAIN_CONFIGS[chainId]?.nftFeeBps ?? DEFAULT_NFT_FEE_BPS;
}

/**
 * Get ERC20 trade fee in basis points for a chain
 */
export function getErc20FeeBps(chainId: number): number {
  return BAZAAR_CHAIN_CONFIGS[chainId]?.erc20FeeBps ?? DEFAULT_ERC20_FEE_BPS;
}

/**
 * Get wrapped native currency for a chain
 */
export function getWrappedNativeCurrency(chainId: number): WrappedNativeCurrency | undefined {
  return BAZAAR_CHAIN_CONFIGS[chainId]?.wrappedNativeCurrency;
}

/**
 * Get the ERC20 bazaar quote token for a chain, if one is configured.
 *
 * When set, ERC20 offers and listings on this chain price/settle in this
 * token (e.g. USDC on Base) instead of WETH/native ETH. When undefined,
 * the chain uses the legacy WETH-for-offers / native-for-listings flow.
 */
export function getErc20QuoteToken(chainId: number): QuoteToken | undefined {
  return BAZAAR_CHAIN_CONFIGS[chainId]?.erc20QuoteToken;
}

/**
 * Resolve the ERC20 token used to pay for offers (and to receive payment in
 * listings) on a chain.
 *
 * Returns the configured `erc20QuoteToken` if set (e.g. USDC on Base),
 * otherwise the wrapped native currency synthesized as a 18-decimal quote
 * token. Returns undefined when neither is configured.
 *
 * This is the single source of truth for "what token denominates ERC20
 * bazaar trades?" — call sites that previously combined `getErc20QuoteToken`
 * and `getWrappedNativeCurrency` should use this instead.
 */
export function getErc20PaymentToken(chainId: number): QuoteToken | undefined {
  const quote = BAZAAR_CHAIN_CONFIGS[chainId]?.erc20QuoteToken;
  if (quote) return quote;
  const weth = BAZAAR_CHAIN_CONFIGS[chainId]?.wrappedNativeCurrency;
  if (!weth) return undefined;
  return { address: weth.address, symbol: weth.symbol, decimals: 18 };
}

/**
 * Get currency symbol for a chain (lowercase)
 */
export function getCurrencySymbol(chainId: number): string {
  return BAZAAR_CHAIN_CONFIGS[chainId]?.currencySymbol ?? "eth";
}

/**
 * Get high ETH address for Seaport balance checks
 */
export function getHighEthAddress(chainId: number): `0x${string}` | undefined {
  return BAZAAR_CHAIN_CONFIGS[chainId]?.highEthAddress;
}

/**
 * Get ERC20 offers contract address for a chain
 * Only available on chains that have the ERC20 offers contract deployed
 */
export function getErc20OffersAddress(chainId: number): `0x${string}` | undefined {
  return BAZAAR_CHAIN_CONFIGS[chainId]?.erc20OffersAddress;
}

/**
 * Get ERC20 bazaar (listings) contract address for a chain
 */
export function getErc20BazaarAddress(chainId: number): `0x${string}` {
  return BAZAAR_CHAIN_CONFIGS[chainId]?.erc20BazaarAddress ?? DEFAULT_ERC20_BAZAAR_ADDRESS;
}
