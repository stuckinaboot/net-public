// Client
export { ScoreClient } from "./client/ScoreClient";

// Utilities
export {
  getTokenScoreKey,
  getStorageScoreKey,
  getFeedContentKey,
  getScoreKey,
  isTokenScoreKey,
  extractTokenAddressFromScoreKey,
  getStorageUpvoteContext,
} from "./utils/scoreKeyUtils";
export {
  encodeUpvoteKey,
  tokenAddressToUpvoteKeyString,
  isStrategyMessage,
  isUserUpvoteMessage,
  extractStrategyAddress,
  isPureAlphaStrategy,
  isUniv234PoolsStrategy,
  isDynamicSplitStrategy,
  decodeStrategyMetadata,
  decodeUpvoteStorageBlob,
  selectStrategy,
  decodeUpvoteMessage,
} from "./utils/strategyUtils";
export { encodePoolKey } from "./utils/poolKeyUtils";

// Constants
export {
  SCORE_CONTRACT,
  UPVOTE_APP,
  UPVOTE_STORAGE_APP,
  PURE_ALPHA_STRATEGY,
  UNIV234_POOLS_STRATEGY,
  DYNAMIC_SPLIT_STRATEGY,
  ALL_STRATEGY_ADDRESSES,
  LEGACY_UPVOTE_V1_ADDRESS,
  LEGACY_UPVOTE_V2_ADDRESS,
  SUPPORTED_SCORE_CHAINS,
} from "./constants";

// Types
export type {
  ScoreItem,
  FeedMessage,
  PoolKey,
  PureAlphaMetadata,
  PoolStrategyMetadata,
  DecodedStrategyMetadata,
  DecodedUpvoteBlob,
  ScoreClientOptions,
  GetUpvotesOptions,
  GetUpvotesForItemsOptions,
  GetStrategyKeyScoresOptions,
  GetAppKeyScoresOptions,
  UseUpvotesOptions,
  UseUpvotesBatchOptions,
  UseTokenUpvotesOptions,
} from "./types";
