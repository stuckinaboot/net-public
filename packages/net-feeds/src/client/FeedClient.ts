import { stringToHex } from "viem";
import { NetClient, NULL_ADDRESS } from "@net-protocol/core";
import { normalizeFeedTopic } from "../utils/feedUtils";
import type {
  WriteTransactionConfig,
  NetMessage,
  FeedClientOptions,
  GetFeedPostsOptions,
  PrepareFeedPostOptions,
} from "../types";

/**
 * Client class for interacting with Net Protocol feeds.
 * Provides non-React methods for reading and writing to feeds.
 */
export class FeedClient {
  private netClient: NetClient;

  /**
   * Creates a new FeedClient instance.
   *
   * @param params - Client configuration
   * @param params.chainId - Chain ID to interact with
   * @param params.overrides - Optional RPC URL overrides
   */
  constructor(params: FeedClientOptions) {
    this.netClient = new NetClient({
      chainId: params.chainId,
      overrides: params.overrides,
    });
  }

  /**
   * Gets feed posts for a topic.
   *
   * @param params - Feed posts options
   * @param params.topic - Topic name (will be auto-prefixed with "feed-" if not already present)
   * @param params.maxPosts - Maximum number of posts to fetch (default: 50)
   * @returns Array of feed posts (NetMessage[])
   *
   * @example
   * ```ts
   * const client = new FeedClient({ chainId: 8453 });
   * const posts = await client.getFeedPosts({ topic: "crypto", maxPosts: 50 });
   * ```
   */
  async getFeedPosts(params: GetFeedPostsOptions): Promise<NetMessage[]> {
    const normalizedTopic = normalizeFeedTopic(params.topic);

    // Get total count
    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        topic: normalizedTopic,
      },
    });

    // Calculate pagination (get last maxPosts posts)
    // Handle maxPosts = 0 specially (should return empty array)
    const maxPosts = params.maxPosts ?? 50;
    const startIndex =
      maxPosts === 0 ? count : count > maxPosts ? count - maxPosts : 0;

    // Get messages
    const messages = await this.netClient.getMessages({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        topic: normalizedTopic,
      },
      startIndex,
      endIndex: count,
    });

    return messages;
  }

  /**
   * Gets the total count of posts in a feed topic.
   *
   * @param topic - Topic name (will be auto-prefixed with "feed-" if not already present)
   * @returns Total number of posts in the feed
   *
   * @example
   * ```ts
   * const client = new FeedClient({ chainId: 8453 });
   * const count = await client.getFeedPostCount("crypto");
   * ```
   */
  async getFeedPostCount(topic: string): Promise<number> {
    const normalizedTopic = normalizeFeedTopic(topic);

    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        topic: normalizedTopic,
      },
    });

    return count;
  }

  /**
   * Prepares a transaction configuration for posting to a feed.
   * Does not submit the transaction - you must submit it using your wallet library.
   *
   * @param params - Post options
   * @param params.topic - Topic name (will be auto-prefixed with "feed-" if not already present)
   * @param params.text - Post text content
   * @param params.data - Optional arbitrary data (string will be converted to hex bytes). Can be a storage key, JSON, or any other data.
   * @returns Transaction configuration ready to be submitted
   *
   * @example
   * ```ts
   * const client = new FeedClient({ chainId: 8453 });
   * const config = client.preparePostToFeed({
   *   topic: "crypto",
   *   text: "Hello world!",
   *   data: "netid-abc123", // Optional - can be storage key, JSON, or any string
   * });
   * // Then submit using your wallet library
   * ```
   */
  preparePostToFeed(params: PrepareFeedPostOptions): WriteTransactionConfig {
    const normalizedTopic = normalizeFeedTopic(params.topic);

    // Convert data string to hex if provided
    const data = params.data ? stringToHex(params.data) : undefined;

    return this.netClient.prepareSendMessage({
      text: params.text,
      topic: normalizedTopic,
      data,
    });
  }
}

