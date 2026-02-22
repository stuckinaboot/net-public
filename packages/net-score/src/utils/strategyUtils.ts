import { decodeAbiParameters, type Address } from "viem";
import {
  PURE_ALPHA_STRATEGY,
  UNIV234_POOLS_STRATEGY,
  DYNAMIC_SPLIT_STRATEGY,
} from "../constants";
import type {
  PureAlphaMetadata,
  PoolStrategyMetadata,
  DecodedStrategyMetadata,
  PoolKey,
} from "../types";

/**
 * Convert token address to bytes32 upvote key.
 */
export const encodeUpvoteKey = (tokenAddress: string): `0x${string}` => {
  return `0x${BigInt(`0x${tokenAddress.slice(2)}`)
    .toString(16)
    .padStart(64, "0")}`;
};

/**
 * Convert token address to upvote key string format.
 * Strips leading zeros to match Solidity's Strings.toHexString(uint256(scoreKey)).
 */
export function tokenAddressToUpvoteKeyString(tokenAddress: string): string {
  const lower = tokenAddress.toLowerCase();
  const withoutPrefix = lower.slice(2);
  const stripped = withoutPrefix.replace(/^0+/, "") || "0";
  return "0x" + stripped;
}

/**
 * Check if a topic string represents a strategy message.
 */
export function isStrategyMessage(topic: string): boolean {
  return topic.startsWith("s") && topic.length > 43;
}

/**
 * Check if a topic string represents a user upvote message.
 */
export function isUserUpvoteMessage(topic: string): boolean {
  return topic.startsWith("t");
}

/**
 * Extracts strategy address from topic string.
 * Handles both new format and legacy format.
 */
export function extractStrategyAddress(topic: string): string {
  try {
    if (topic.startsWith("t")) {
      return topic.slice(1);
    }

    if (topic.startsWith("s")) {
      return topic.slice(1, 43);
    }

    if (topic.startsWith("t-")) {
      return topic.slice(2);
    }

    const parts = topic.split("-");
    if (parts.length >= 2) {
      return parts[0];
    }

    return "";
  } catch {
    return "";
  }
}

export function isPureAlphaStrategy(strategyAddress: string): boolean {
  return (
    strategyAddress.toLowerCase() ===
    PURE_ALPHA_STRATEGY.address.toLowerCase()
  );
}

export function isUniv234PoolsStrategy(strategyAddress: string): boolean {
  return (
    strategyAddress.toLowerCase() ===
    UNIV234_POOLS_STRATEGY.address.toLowerCase()
  );
}

export function isDynamicSplitStrategy(strategyAddress: string): boolean {
  return (
    strategyAddress.toLowerCase() ===
    DYNAMIC_SPLIT_STRATEGY.address.toLowerCase()
  );
}

/**
 * Decode strategy-specific metadata from ABI-encoded bytes.
 */
export const decodeStrategyMetadata = (
  metadata: `0x${string}`,
  strategyAddress: string
): DecodedStrategyMetadata => {
  try {
    if (isPureAlphaStrategy(strategyAddress)) {
      const [alphaAmount, alphaWethPrice, wethUsdcPrice, userAlphaBalance] =
        decodeAbiParameters(
          [
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
          ],
          metadata
        );
      return {
        alphaAmount,
        alphaWethPrice,
        wethUsdcPrice,
        userAlphaBalance,
      } as PureAlphaMetadata;
    } else if (
      isUniv234PoolsStrategy(strategyAddress) ||
      isDynamicSplitStrategy(strategyAddress)
    ) {
      const [
        tokenAmount,
        tokenWethPrice,
        wethUsdcPrice,
        alphaWethPrice,
        userTokenBalance,
      ] = decodeAbiParameters(
        [
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
        ],
        metadata
      );
      return {
        tokenAmount,
        tokenWethPrice,
        wethUsdcPrice,
        alphaWethPrice,
        userTokenBalance,
      } as PoolStrategyMetadata;
    } else {
      return null;
    }
  } catch {
    return null;
  }
};

/**
 * Decode the full Score storage blob.
 */
export const decodeUpvoteStorageBlob = (value: `0x${string}`) => {
  try {
    const [
      scoreKey,
      scoreDelta,
      originalSender,
      appAddress,
      strategyAddress,
      timestamp,
      scoreStoredContext,
      scoreUnstoredContext,
      metadata,
    ] = decodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "int256" },
        { type: "address" },
        { type: "address" },
        { type: "address" },
        { type: "uint256" },
        { type: "bytes" },
        { type: "bytes" },
        { type: "bytes" },
      ],
      value
    );

    const decodedMetadata = decodeStrategyMetadata(
      metadata as `0x${string}`,
      strategyAddress as string
    );

    return {
      scoreKey: scoreKey as `0x${string}`,
      scoreDelta: Number(scoreDelta),
      originalSender: originalSender as Address,
      appAddress: appAddress as Address,
      strategyAddress: strategyAddress as Address,
      timestamp: Number(timestamp),
      scoreStoredContext: scoreStoredContext as `0x${string}`,
      scoreUnstoredContext: scoreUnstoredContext as `0x${string}`,
      decodedMetadata,
    };
  } catch {
    return null;
  }
};

/**
 * Select the appropriate strategy based on pool key validity.
 * Returns PURE_ALPHA if no valid pool key; DYNAMIC_SPLIT otherwise.
 */
export const selectStrategy = (poolKey?: PoolKey | null): Address => {
  if (!poolKey || !isValidPoolKey(poolKey)) {
    return PURE_ALPHA_STRATEGY.address;
  }
  return DYNAMIC_SPLIT_STRATEGY.address;
};

function isValidPoolKey(poolKey: PoolKey): boolean {
  return (
    poolKey.fee !== undefined ||
    poolKey.tickSpacing !== undefined ||
    poolKey.currency0 !== undefined
  );
}

/**
 * Decode an upvote message from Net protocol into a consistent format.
 * Handles both legacy and strategy message formats.
 */
export function decodeUpvoteMessage(msg: {
  topic: string;
  data: `0x${string}`;
  text: string;
}) {
  try {
    if (msg.topic === "t") {
      if (!msg.data || msg.data === "0x" || msg.data.length < 32) {
        return null;
      }

      try {
        const [
          numUpvotesDecoded,
          tokenWethPrice,
          wethUsdcPrice,
          alphaWethPrice,
          userTokenBalance,
        ] = decodeAbiParameters(
          [
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
          ],
          msg.data
        );

        return {
          scoreDelta: Number(numUpvotesDecoded),
          tokenWethPrice: Number(tokenWethPrice),
          wethUsdcPrice: Number(wethUsdcPrice),
          alphaWethPrice: Number(alphaWethPrice),
          userTokenBalance: Number(userTokenBalance),
          tokenAddress: msg.text,
          messageType: "legacy" as const,
        };
      } catch {
        return null;
      }
    } else if (
      (msg.topic.startsWith("0x") && msg.topic.length === 42) ||
      msg.topic.startsWith("p-")
    ) {
      const [
        numUpvotesDecoded,
        tokenWethPrice,
        wethUsdcPrice,
        alphaWethPrice,
        userTokenBalance,
      ] = decodeAbiParameters(
        [
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
        ],
        msg.data
      );

      return {
        scoreDelta: Number(numUpvotesDecoded),
        tokenWethPrice: Number(tokenWethPrice),
        wethUsdcPrice: Number(wethUsdcPrice),
        alphaWethPrice: Number(alphaWethPrice),
        userTokenBalance: Number(userTokenBalance),
        tokenAddress: msg.topic,
        messageType: "legacy" as const,
      };
    } else if (msg.topic.startsWith("app-") && msg.topic.endsWith("-first")) {
      const topicParts = msg.topic.split("-");

      if (topicParts.length === 3) {
        // "app-{addr}-first"
        return {
          appAddress: topicParts[1],
          messageType: "app-first" as const,
        };
      } else if (topicParts.length === 5 && topicParts[2] === "strategy") {
        // "app-{addr}-strategy-{strat}-first"
        return {
          appAddress: topicParts[1],
          strategyAddress: topicParts[3],
          messageType: "app-strategy-first" as const,
        };
      } else if (topicParts.length === 5 && topicParts[2] === "user") {
        // "app-{addr}-user-{user}-first"
        return {
          appAddress: topicParts[1],
          userAddress: topicParts[3],
          tokenAddress: msg.text,
          messageType: "app-user-first" as const,
        };
      } else if (
        topicParts.length === 7 &&
        topicParts[2] === "strategy" &&
        topicParts[4] === "user"
      ) {
        // "app-{addr}-strategy-{strat}-user-{user}-first"
        return {
          appAddress: topicParts[1],
          strategyAddress: topicParts[3],
          userAddress: topicParts[5],
          tokenAddress: msg.text,
          messageType: "app-strategy-user-first" as const,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
