import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeedRegistryClient } from "../client/FeedRegistryClient";
import { NetClient } from "@net-protocol/core";
import { BASE_CHAIN_ID, BASE_TEST_RPC_URL } from "./test-utils";
import { FEED_REGISTRY_CONTRACT, MAX_FEED_NAME_LENGTH } from "../constants";

// Mock NetClient
vi.mock("@net-protocol/core", async () => {
  const actual = await vi.importActual("@net-protocol/core");
  return {
    ...actual,
    NetClient: vi.fn(),
  };
});

describe("FeedRegistryClient", () => {
  let mockNetClient: {
    getMessageCount: ReturnType<typeof vi.fn>;
    getMessages: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockNetClient = {
      getMessageCount: vi.fn(),
      getMessages: vi.fn(),
    };

    (NetClient as any).mockImplementation(() => mockNetClient);
  });

  describe("Constructor", () => {
    it("should create FeedRegistryClient with chainId", () => {
      const client = new FeedRegistryClient({
        chainId: BASE_CHAIN_ID,
      });

      expect(client).toBeInstanceOf(FeedRegistryClient);
      expect(NetClient).toHaveBeenCalledWith({
        chainId: BASE_CHAIN_ID,
        overrides: undefined,
      });
    });

    it("should create FeedRegistryClient with RPC overrides", () => {
      const client = new FeedRegistryClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      expect(client).toBeInstanceOf(FeedRegistryClient);
      expect(NetClient).toHaveBeenCalledWith({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });
    });
  });

  describe("validateFeedName", () => {
    it("should return valid for a normal feed name", () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });
      const result = client.validateFeedName("crypto");

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for empty feed name", () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });
      const result = client.validateFeedName("");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Feed name cannot be empty");
    });

    it("should return invalid for feed name exceeding max length", () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });
      const longName = "a".repeat(MAX_FEED_NAME_LENGTH + 1);
      const result = client.validateFeedName(longName);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        `Feed name cannot exceed ${MAX_FEED_NAME_LENGTH} characters`
      );
    });

    it("should return valid for feed name at max length", () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });
      const maxLengthName = "a".repeat(MAX_FEED_NAME_LENGTH);
      const result = client.validateFeedName(maxLengthName);

      expect(result.isValid).toBe(true);
    });

    it("should return valid for single character feed name", () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });
      const result = client.validateFeedName("a");

      expect(result.isValid).toBe(true);
    });
  });

  describe("isFeedRegistered", () => {
    it("should return true when feed has messages", async () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });
      mockNetClient.getMessageCount.mockResolvedValue(1);

      const isRegistered = await client.isFeedRegistered("crypto");

      expect(isRegistered).toBe(true);
      expect(mockNetClient.getMessageCount).toHaveBeenCalledWith({
        filter: {
          appAddress: FEED_REGISTRY_CONTRACT.address,
          topic: "feed-crypto", // Contract uses "feed-" prefix
        },
      });
    });

    it("should return false when feed has no messages", async () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });
      mockNetClient.getMessageCount.mockResolvedValue(0);

      const isRegistered = await client.isFeedRegistered("unregistered-feed");

      expect(isRegistered).toBe(false);
    });
  });

  describe("getRegisteredFeeds", () => {
    it("should return empty array when no feeds registered", async () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });
      mockNetClient.getMessageCount.mockResolvedValue(0);

      const feeds = await client.getRegisteredFeeds();

      expect(feeds).toEqual([]);
      expect(mockNetClient.getMessages).not.toHaveBeenCalled();
    });

    it("should fetch and parse registered feeds", async () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });

      const mockMessages = [
        {
          app: FEED_REGISTRY_CONTRACT.address,
          sender: "0x1234567890123456789012345678901234567890",
          timestamp: BigInt(1234567890),
          topic: "feed-crypto", // Topic has "feed-" prefix
          text: "crypto", // Feed name is in text field
          data: "0x",
        },
        {
          app: FEED_REGISTRY_CONTRACT.address,
          sender: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          timestamp: BigInt(1234567900),
          topic: "feed-gaming",
          text: "gaming",
          data: null,
        },
      ];

      mockNetClient.getMessageCount.mockResolvedValue(2);
      mockNetClient.getMessages.mockResolvedValue(mockMessages);

      const feeds = await client.getRegisteredFeeds();

      expect(feeds).toHaveLength(2);
      expect(feeds[0]).toEqual({
        feedName: "crypto",
        registrant: "0x1234567890123456789012345678901234567890",
        timestamp: 1234567890,
      });
      expect(feeds[1]).toEqual({
        feedName: "gaming",
        registrant: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        timestamp: 1234567900,
      });
    });

    it("should respect maxFeeds option", async () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });
      mockNetClient.getMessageCount.mockResolvedValue(100);
      mockNetClient.getMessages.mockResolvedValue([]);

      await client.getRegisteredFeeds({ maxFeeds: 10 });

      expect(mockNetClient.getMessages).toHaveBeenCalledWith({
        filter: {
          appAddress: FEED_REGISTRY_CONTRACT.address,
        },
        startIndex: 90, // 100 - 10
        endIndex: 100,
      });
    });

    it("should use default maxFeeds of 100", async () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });
      mockNetClient.getMessageCount.mockResolvedValue(50);
      mockNetClient.getMessages.mockResolvedValue([]);

      await client.getRegisteredFeeds();

      expect(mockNetClient.getMessages).toHaveBeenCalledWith({
        filter: {
          appAddress: FEED_REGISTRY_CONTRACT.address,
        },
        startIndex: 0,
        endIndex: 50,
      });
    });
  });

  describe("getRegisteredFeedCount", () => {
    it("should return the count of registered feeds", async () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });
      mockNetClient.getMessageCount.mockResolvedValue(42);

      const count = await client.getRegisteredFeedCount();

      expect(count).toBe(42);
      expect(mockNetClient.getMessageCount).toHaveBeenCalledWith({
        filter: {
          appAddress: FEED_REGISTRY_CONTRACT.address,
        },
      });
    });
  });

  describe("prepareRegisterFeed", () => {
    it("should prepare registration transaction config", () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });

      const config = client.prepareRegisterFeed({
        feedName: "crypto",
      });

      expect(config.to).toBe(FEED_REGISTRY_CONTRACT.address);
      expect(config.functionName).toBe("registerFeed");
      expect(config.args).toEqual(["crypto"]);
      expect(config.abi).toBe(FEED_REGISTRY_CONTRACT.abi);
    });

    it("should throw error for empty feed name", () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });

      expect(() => client.prepareRegisterFeed({ feedName: "" })).toThrow(
        "Feed name cannot be empty"
      );
    });

    it("should throw error for feed name exceeding max length", () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });
      const longName = "a".repeat(MAX_FEED_NAME_LENGTH + 1);

      expect(() => client.prepareRegisterFeed({ feedName: longName })).toThrow(
        `Feed name cannot exceed ${MAX_FEED_NAME_LENGTH} characters`
      );
    });
  });

  describe("getContractAddress", () => {
    it("should return the contract address", () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });

      expect(client.getContractAddress()).toBe(FEED_REGISTRY_CONTRACT.address);
    });
  });

  describe("getMaxFeedNameLength", () => {
    it("should return the max feed name length", () => {
      const client = new FeedRegistryClient({ chainId: BASE_CHAIN_ID });

      expect(client.getMaxFeedNameLength()).toBe(MAX_FEED_NAME_LENGTH);
    });
  });
});
