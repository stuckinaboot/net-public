import { NetClient } from "@net-protocol/core";
import {
  FEED_REGISTRY_CONTRACT,
  MAX_FEED_NAME_LENGTH,
} from "../constants";
import type {
  WriteTransactionConfig,
  RegisteredFeed,
  PrepareRegisterFeedOptions,
} from "../types";

/**
 * Options for creating a FeedRegistryClient instance
 */
export type FeedRegistryClientOptions = {
  chainId: number;
  overrides?: { rpcUrls: string[] };
};

/**
 * Options for getting registered feeds
 */
export type GetRegisteredFeedsOptions = {
  maxFeeds?: number; // Defaults to 100 if not provided
};

/**
 * Client class for interacting with the FeedRegistry contract.
 * Provides non-React methods for registering and discovering feeds.
 */
export class FeedRegistryClient {
  private netClient: NetClient;

  /**
   * Creates a new FeedRegistryClient instance.
   *
   * @param params - Client configuration
   * @param params.chainId - Chain ID to interact with
   * @param params.overrides - Optional RPC URL overrides
   */
  constructor(params: FeedRegistryClientOptions) {
    // Create NetClient for reading messages
    this.netClient = new NetClient({
      chainId: params.chainId,
      overrides: params.overrides,
    });
  }

  /**
   * Validates a feed name without making any network calls.
   *
   * @param feedName - The feed name to validate
   * @returns Object with isValid boolean and optional error message
   *
   * @example
   * ```ts
   * const client = new FeedRegistryClient({ chainId: 8453 });
   * const { isValid, error } = client.validateFeedName("my-feed");
   * if (!isValid) {
   *   console.error(error);
   * }
   * ```
   */
  validateFeedName(feedName: string): { isValid: boolean; error?: string } {
    if (!feedName || feedName.length === 0) {
      return { isValid: false, error: "Feed name cannot be empty" };
    }

    if (feedName.length > MAX_FEED_NAME_LENGTH) {
      return {
        isValid: false,
        error: `Feed name cannot exceed ${MAX_FEED_NAME_LENGTH} characters`,
      };
    }

    return { isValid: true };
  }

  /**
   * Checks if a feed name is already registered.
   * Uses the same logic as the smart contract by checking message count.
   *
   * @param feedName - The feed name to check
   * @returns True if registered, false if available
   *
   * @example
   * ```ts
   * const client = new FeedRegistryClient({ chainId: 8453 });
   * const isRegistered = await client.isFeedRegistered("crypto");
   * ```
   */
  async isFeedRegistered(feedName: string): Promise<boolean> {
    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: FEED_REGISTRY_CONTRACT.address,
        topic: feedName,
      },
    });

    return count > 0;
  }

  /**
   * Gets all registered feeds.
   *
   * @param options - Options for fetching feeds
   * @param options.maxFeeds - Maximum number of feeds to fetch (default: 100)
   * @returns Array of registered feeds
   *
   * @example
   * ```ts
   * const client = new FeedRegistryClient({ chainId: 8453 });
   * const feeds = await client.getRegisteredFeeds({ maxFeeds: 50 });
   * ```
   */
  async getRegisteredFeeds(
    options: GetRegisteredFeedsOptions = {}
  ): Promise<RegisteredFeed[]> {
    const maxFeeds = options.maxFeeds ?? 100;

    // Get total count of registered feeds
    const count = await this.netClient.getMessageCount({
      filter: {
        appAddress: FEED_REGISTRY_CONTRACT.address,
      },
    });

    if (count === 0) {
      return [];
    }

    // Calculate pagination (get most recent feeds)
    const startIndex = count > maxFeeds ? count - maxFeeds : 0;

    // Get messages from the registry
    const messages = await this.netClient.getMessages({
      filter: {
        appAddress: FEED_REGISTRY_CONTRACT.address,
      },
      startIndex,
      endIndex: count,
    });

    // Parse messages into RegisteredFeed objects
    return messages.map((msg) => {
      // Decode hex data to string (data is description encoded as bytes)
      let description = "";
      if (msg.data && msg.data.length > 2) {
        const hexBytes = msg.data.slice(2).match(/.{1,2}/g);
        if (hexBytes) {
          description = new TextDecoder().decode(
            Uint8Array.from(hexBytes.map((byte) => parseInt(byte, 16)))
          );
        }
      }
      return {
        feedName: msg.topic, // Feed name is stored as the topic
        registrant: msg.sender,
        description,
        timestamp: Number(msg.timestamp),
      };
    });
  }

  /**
   * Gets the count of registered feeds.
   *
   * @returns Total number of registered feeds
   *
   * @example
   * ```ts
   * const client = new FeedRegistryClient({ chainId: 8453 });
   * const count = await client.getRegisteredFeedCount();
   * ```
   */
  async getRegisteredFeedCount(): Promise<number> {
    return this.netClient.getMessageCount({
      filter: {
        appAddress: FEED_REGISTRY_CONTRACT.address,
      },
    });
  }

  /**
   * Prepares a transaction configuration for registering a new feed.
   * Does not submit the transaction - you must submit it using your wallet library.
   *
   * @param params - Registration options
   * @param params.feedName - The feed name to register (max 64 characters)
   * @param params.description - Optional description of the feed
   * @returns Transaction configuration ready to be submitted
   * @throws Error if feed name fails validation
   *
   * @example
   * ```ts
   * const client = new FeedRegistryClient({ chainId: 8453 });
   * const config = client.prepareRegisterFeed({
   *   feedName: "crypto",
   *   description: "Discussion about cryptocurrency",
   * });
   * // Then submit using your wallet library
   * ```
   */
  prepareRegisterFeed(params: PrepareRegisterFeedOptions): WriteTransactionConfig {
    // Validate feed name
    const { isValid, error } = this.validateFeedName(params.feedName);
    if (!isValid) {
      throw new Error(error);
    }

    return {
      abi: FEED_REGISTRY_CONTRACT.abi,
      to: FEED_REGISTRY_CONTRACT.address,
      functionName: "registerFeed",
      args: [params.feedName, params.description ?? ""],
    };
  }

  /**
   * Gets the contract address for the FeedRegistry.
   *
   * @returns The contract address
   */
  getContractAddress(): `0x${string}` {
    return FEED_REGISTRY_CONTRACT.address;
  }

  /**
   * Gets the maximum allowed feed name length.
   *
   * @returns The maximum feed name length (64)
   */
  getMaxFeedNameLength(): number {
    return MAX_FEED_NAME_LENGTH;
  }
}
