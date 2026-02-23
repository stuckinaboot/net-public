import {
  type Address,
  encodeAbiParameters,
  keccak256,
  encodePacked,
  getAddress,
} from "viem";
import { getStorageKeyBytes } from "@net-protocol/storage";
import { encodeUpvoteKey } from "./strategyUtils";
import type { ScoreItem, FeedMessage } from "../types";

/**
 * Generate score key for token upvotes.
 * Pads the token address into a bytes32 value.
 */
export const getTokenScoreKey = (tokenAddress: string): `0x${string}` => {
  return encodeUpvoteKey(tokenAddress);
};

/**
 * Generate score key for storage upvotes.
 * keccak256(encodePacked(storageKeyBytes32, operatorAddress))
 */
export const getStorageScoreKey = (
  operatorAddress: string,
  storageKey: string
): `0x${string}` => {
  const bytes32Key = getStorageKeyBytes(storageKey) as `0x${string}`;
  return keccak256(
    encodePacked(
      ["bytes32", "address"],
      [bytes32Key, operatorAddress as Address]
    )
  );
};

/**
 * Generate content-based key for feed posts.
 * Uses all message content to create a unique identifier that's
 * independent of query filter (works regardless of how messages are fetched).
 *
 * Two messages with identical content will share the same key (and upvotes),
 * which is semantically correct - they are the same content.
 */
export const getFeedContentKey = (message: FeedMessage): `0x${string}` => {
  return keccak256(
    encodePacked(
      ["address", "string", "address", "uint256", "string", "bytes"],
      [
        message.app,
        message.topic,
        message.sender,
        message.timestamp,
        message.text,
        message.data,
      ]
    )
  );
};

/**
 * Get score key for any ScoreItem type.
 */
export const getScoreKey = (item: ScoreItem): `0x${string}` => {
  switch (item.type) {
    case "token":
      return getTokenScoreKey(item.tokenAddress);
    case "storage":
      return getStorageScoreKey(item.operatorAddress, item.storageKey);
    case "feed": {
      const contentKey = getFeedContentKey(item.message);
      return getStorageScoreKey(
        item.message.sender,
        contentKey
      );
    }
  }
};

/**
 * Check if a score key represents a token upvote (zero-padded address)
 * vs a hash-based key (storage/feed).
 */
export const isTokenScoreKey = (scoreKey: string): boolean => {
  return scoreKey.startsWith("0x000000000000000000000000");
};

/**
 * Extract and validate token address from a token score key.
 * Returns the checksummed address or null if invalid.
 */
export const extractTokenAddressFromScoreKey = (
  scoreKey: string
): string | null => {
  if (!isTokenScoreKey(scoreKey)) {
    return null;
  }

  const tokenAddress = `0x${scoreKey.slice(26)}`;

  if (tokenAddress.startsWith("0x") && tokenAddress.length === 42) {
    try {
      return getAddress(tokenAddress);
    } catch {
      return null;
    }
  }

  return null;
};

/**
 * Generate upvote stored context for storage upvotes.
 * ABI-encodes (bytes32 storageKeyBytes, address operatorAddress).
 */
export const getStorageUpvoteContext = (
  operatorAddress: string,
  storageKey: string
): `0x${string}` => {
  const bytes32Key = getStorageKeyBytes(storageKey) as `0x${string}`;
  return encodeAbiParameters(
    [{ type: "bytes32" }, { type: "address" }],
    [bytes32Key, operatorAddress as Address]
  );
};
