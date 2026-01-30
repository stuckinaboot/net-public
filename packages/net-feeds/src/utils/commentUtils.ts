import { keccak256, encodePacked, stringToHex, hexToString } from "viem";
import type { NetMessage, CommentData } from "../types";
import { COMMENT_TOPIC_SUFFIX } from "../constants";
import { normalizeFeedTopic } from "./feedUtils";

/**
 * Generates a deterministic hash for a post based on its content.
 * Used as part of the comment topic to identify which post comments belong to.
 *
 * @param post - The post to generate a hash for
 * @returns A hex string hash of the post
 *
 * @example
 * ```ts
 * const hash = generatePostHash(post);
 * // "0x1234567890abcdef..."
 * ```
 */
export function generatePostHash(post: NetMessage): `0x${string}` {
  return keccak256(
    encodePacked(
      ["address", "uint256", "string", "string"],
      [post.sender, post.timestamp, post.topic, post.text]
    )
  );
}

/**
 * Gets the topic string for comments on a specific post.
 * Comments are stored in a separate topic following the convention:
 * feed-{topic}:comments:{postHash}
 *
 * @param post - The post to get the comment topic for
 * @returns The topic string for comments on this post
 *
 * @example
 * ```ts
 * const commentTopic = getCommentTopic(post);
 * // "feed-crypto:comments:0x1234567890abcdef..."
 * ```
 */
export function getCommentTopic(post: NetMessage): string {
  const normalizedTopic = normalizeFeedTopic(post.topic);
  const postHash = generatePostHash(post);
  return `${normalizedTopic}${COMMENT_TOPIC_SUFFIX}${postHash}`;
}

/**
 * Parses the data field of a comment message to extract CommentData.
 * Returns null if the data is invalid or not a comment.
 *
 * @param data - The hex-encoded data field from a NetMessage
 * @returns Parsed CommentData or null if invalid
 *
 * @example
 * ```ts
 * const commentData = parseCommentData(comment.data);
 * if (commentData) {
 *   console.log(commentData.parentTopic);
 * }
 * ```
 */
export function parseCommentData(data: `0x${string}`): CommentData | null {
  try {
    // Empty data is not a valid comment
    if (data === "0x" || data.length <= 2) {
      return null;
    }

    // Decode hex to string and parse as JSON
    const jsonString = hexToString(data);
    const parsed = JSON.parse(jsonString);

    // Validate required fields
    if (
      typeof parsed.parentTopic !== "string" ||
      typeof parsed.parentSender !== "string" ||
      typeof parsed.parentTimestamp !== "number"
    ) {
      return null;
    }

    // Validate parentSender is a valid address
    if (!parsed.parentSender.startsWith("0x")) {
      return null;
    }

    const result: CommentData = {
      parentTopic: parsed.parentTopic,
      parentSender: parsed.parentSender as `0x${string}`,
      parentTimestamp: parsed.parentTimestamp,
    };

    // Parse optional replyTo field
    if (parsed.replyTo) {
      if (
        typeof parsed.replyTo.sender === "string" &&
        parsed.replyTo.sender.startsWith("0x") &&
        typeof parsed.replyTo.timestamp === "number"
      ) {
        result.replyTo = {
          sender: parsed.replyTo.sender as `0x${string}`,
          timestamp: parsed.replyTo.timestamp,
        };
      }
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Encodes CommentData into a hex string for storage in a message's data field.
 *
 * @param data - The CommentData to encode
 * @returns Hex-encoded string ready for the data field
 *
 * @example
 * ```ts
 * const hexData = encodeCommentData({
 *   parentTopic: "feed-crypto",
 *   parentSender: "0x123...",
 *   parentTimestamp: 1234567890,
 * });
 * ```
 */
export function encodeCommentData(data: CommentData): `0x${string}` {
  const jsonString = JSON.stringify(data);
  return stringToHex(jsonString);
}

/**
 * Checks if a topic is a comment topic (contains the comments suffix).
 *
 * @param topic - The topic to check
 * @returns True if the topic is a comment topic
 *
 * @example
 * ```ts
 * isCommentTopic("feed-crypto:comments:0x123...") // true
 * isCommentTopic("feed-crypto") // false
 * ```
 */
export function isCommentTopic(topic: string): boolean {
  return topic.includes(COMMENT_TOPIC_SUFFIX);
}
