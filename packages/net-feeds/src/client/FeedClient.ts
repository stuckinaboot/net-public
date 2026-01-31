import { stringToHex } from "viem";
import { readContract } from "viem/actions";
import { NetClient, NULL_ADDRESS, getPublicClient } from "@net-protocol/core";
import { normalizeFeedTopic } from "../utils/feedUtils";
import {
  getCommentTopic,
  encodeCommentData,
  generatePostHash,
} from "../utils/commentUtils";
import { TOPIC_COUNT_BULK_HELPER_CONTRACT } from "../constants";
import type {
  WriteTransactionConfig,
  NetMessage,
  FeedClientOptions,
  GetFeedPostsOptions,
  PrepareFeedPostOptions,
  GetCommentsOptions,
  PrepareCommentOptions,
  CommentData,
} from "../types";

/**
 * Client class for interacting with Net Protocol feeds.
 * Provides non-React methods for reading and writing to feeds.
 */
export class FeedClient {
  private netClient: NetClient;
  private chainId: number;
  private rpcUrls?: string[];

  /**
   * Creates a new FeedClient instance.
   *
   * @param params - Client configuration
   * @param params.chainId - Chain ID to interact with
   * @param params.overrides - Optional RPC URL overrides
   */
  constructor(params: FeedClientOptions) {
    this.chainId = params.chainId;
    this.rpcUrls = params.overrides?.rpcUrls;
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

  /**
   * Gets comments for a post.
   *
   * @param params - Comment options
   * @param params.post - The post to get comments for
   * @param params.maxComments - Maximum number of comments to fetch (default: 50)
   * @returns Array of comments (NetMessage[])
   *
   * @example
   * ```ts
   * const client = new FeedClient({ chainId: 8453 });
   * const comments = await client.getComments({ post, maxComments: 50 });
   * ```
   */
  async getComments(params: GetCommentsOptions): Promise<NetMessage[]> {
    const commentTopic = getCommentTopic(params.post);

    // Get total count
    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        topic: commentTopic,
      },
    });

    // Calculate pagination (get last maxComments comments)
    const maxComments = params.maxComments ?? 50;
    const startIndex =
      maxComments === 0 ? count : count > maxComments ? count - maxComments : 0;

    // Get messages
    const messages = await this.netClient.getMessages({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        topic: commentTopic,
      },
      startIndex,
      endIndex: count,
    });

    return messages;
  }

  /**
   * Gets the total count of comments for a post.
   *
   * @param post - The post to get comment count for
   * @returns Total number of comments on the post
   *
   * @example
   * ```ts
   * const client = new FeedClient({ chainId: 8453 });
   * const count = await client.getCommentCount(post);
   * ```
   */
  async getCommentCount(post: NetMessage): Promise<number> {
    const commentTopic = getCommentTopic(post);

    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: NULL_ADDRESS as `0x${string}`,
        topic: commentTopic,
      },
    });

    return count;
  }

  /**
   * Prepares a transaction configuration for posting a comment on a feed post.
   * Does not submit the transaction - you must submit it using your wallet library.
   *
   * @param params - Comment options
   * @param params.post - The post to comment on
   * @param params.text - Comment text content
   * @param params.replyTo - Optional: reference to another comment to reply to (for nested replies)
   * @returns Transaction configuration ready to be submitted
   *
   * @example
   * ```ts
   * const client = new FeedClient({ chainId: 8453 });
   *
   * // Top-level comment
   * const config = client.prepareComment({
   *   post,
   *   text: "Great post!",
   * });
   *
   * // Reply to another comment
   * const replyConfig = client.prepareComment({
   *   post,
   *   text: "I agree!",
   *   replyTo: { sender: "0x123...", timestamp: 1234567890 },
   * });
   * ```
   */
  prepareComment(params: PrepareCommentOptions): WriteTransactionConfig {
    const commentTopic = getCommentTopic(params.post);

    // Build comment data with parent reference
    const commentData: CommentData = {
      parentTopic: params.post.topic,
      parentSender: params.post.sender,
      parentTimestamp: Number(params.post.timestamp),
    };

    // Add replyTo if replying to another comment
    if (params.replyTo) {
      commentData.replyTo = params.replyTo;
    }

    const data = encodeCommentData(commentData);

    return this.netClient.prepareSendMessage({
      text: params.text,
      topic: commentTopic,
      data,
    });
  }

  /**
   * Gets comment counts for multiple posts in a single RPC call.
   * Uses the TopicCountBulkHelper contract for efficient batching.
   *
   * @param posts - Array of posts to get comment counts for
   * @returns Map from post hash to comment count
   *
   * @example
   * ```ts
   * const client = new FeedClient({ chainId: 8453 });
   * const posts = await client.getFeedPosts({ topic: "crypto" });
   * const counts = await client.getCommentCountBatch(posts);
   *
   * // Get count for a specific post
   * const postHash = generatePostHash(post);
   * const count = counts.get(postHash) ?? 0;
   * ```
   */
  async getCommentCountBatch(
    posts: NetMessage[]
  ): Promise<Map<`0x${string}`, number>> {
    const counts = new Map<`0x${string}`, number>();

    if (posts.length === 0) {
      return counts;
    }

    // Generate comment topics for each post
    const topics = posts.map((post) => getCommentTopic(post));
    const postHashes = posts.map((post) => generatePostHash(post));

    // Get public client for this chain
    const client = getPublicClient({
      chainId: this.chainId,
      rpcUrl: this.rpcUrls,
    });

    // Call the bulk helper contract
    const result = await readContract(client, {
      abi: TOPIC_COUNT_BULK_HELPER_CONTRACT.abi,
      address: TOPIC_COUNT_BULK_HELPER_CONTRACT.address,
      functionName: "getMessageCountsForTopics",
      args: [NULL_ADDRESS, topics],
    });

    // Build the result map
    const countsArray = result as bigint[];
    for (let i = 0; i < postHashes.length; i++) {
      counts.set(postHashes[i], Number(countsArray[i]));
    }

    return counts;
  }
}

