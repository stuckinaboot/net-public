// React Hooks
export { useNetrToken } from "./hooks/useNetrToken";
export { useNetrPrice } from "./hooks/useNetrPrice";
export { useNetrLocker } from "./hooks/useNetrLocker";

// Client
export { NetrClient } from "./client/NetrClient";

// Utilities
export {
  addressToBytes32,
  bytes32ToAddress,
  isValidAddress,
} from "./utils/addressUtils";
export {
  calculatePriceFromSqrtPriceX96,
  estimateMarketCap,
  formatPrice,
  priceFromTick,
  tickFromPrice,
} from "./utils/priceUtils";
export {
  completeStorageData,
  decodeBangerStorageData,
  extractAddressesFromMessageData,
} from "./utils/storageDecoding";

// Chain Config
export {
  getNetrChainConfig,
  getNetrContract,
  getNetrSupportedChainIds,
  getNetAddress,
  getStorageAddress,
  getWethAddress,
  getInitialTick,
  getMintPrice,
  isNetrSupportedChain,
} from "./chainConfig";

// Types
export type {
  NetrClientOptions,
  NetrDeployConfig,
  NetrDeployTxConfig,
  NetrLockerData,
  NetrPriceData,
  NetrSaltResult,
  NetrStorageData,
  NetrTokenMetadata,
  PoolSlot0,
  UseNetrLockerOptions,
  UseNetrPriceOptions,
  UseNetrTokenOptions,
} from "./types";

// Constants
export {
  BANGER_V4_ABI,
  DEFAULT_INITIAL_TICK,
  DEFAULT_MINT_DURATION_SECONDS,
  DEFAULT_MINT_PRICE,
  DEFAULT_TOTAL_SUPPLY,
  LP_LOCKER_ABI,
  NETR_TOKEN_ABI,
  POOL_FEE_TIER,
  TOKEN_DECIMALS,
  UNISWAP_V3_POOL_ABI,
  ZERO_ADDRESS,
} from "./constants";
