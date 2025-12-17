import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeedClient } from "../client/FeedClient";
import { NetClient } from "@net-protocol/core";
import { BASE_CHAIN_ID, BASE_TEST_RPC_URL } from "./test-utils";
import type { NetMessage } from "../types";

// Mock NetClient
vi.mock("@net-protocol/core", async () => {
  const actual = await vi.importActual("@net-protocol/core");
  return {
    ...actual,
    NetClient: vi.fn(),
  };
});

describe("FeedClient", () => {
  let mockNetClient: {
    getMessageCount: ReturnType<typeof vi.fn>;
    getMessages: ReturnType<typeof vi.fn>;
    prepareSendMessage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockNetClient = {
      getMessageCount: vi.fn(),
      getMessages: vi.fn(),
      prepareSendMessage: vi.fn(),
    };

    (NetClient as any).mockImplementation(() => mockNetClient);
  });

  describe("Constructor", () => {
    it("should create FeedClient with chainId", () => {
      const client = new FeedClient({
        chainId: BASE_CHAIN_ID,
      });

      expect(client).toBeInstanceOf(FeedClient);
      expect(NetClient).toHaveBeenCalledWith({
        chainId: BASE_CHAIN_ID,
        overrides: undefined,
      });
    });

    it("should create FeedClient with RPC overrides", () => {
      const client = new FeedClient({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });

      expect(client).toBeInstanceOf(FeedClient);
      expect(NetClient).toHaveBeenCalledWith({
        chainId: BASE_CHAIN_ID,
        overrides: { rpcUrls: [BASE_TEST_RPC_URL] },
      });
    });
  });

  describe("getFeedPosts", () => {
    it("should normalize topic and get posts", async () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      const mockMessages: NetMessage[] = [
        {
          app: "0x0000000000000000000000000000000000000000",
          sender: "0x1234567890123456789012345678901234567890",
          timestamp: BigInt(1234567890),
          data: "0x",
          text: "Test post",
          topic: "feed-crypto",
        },
      ];

      mockNetClient.getMessageCount.mockResolvedValue(10);
      mockNetClient.getMessages.mockResolvedValue(mockMessages);

      const posts = await client.getFeedPosts({
        topic: "crypto", // Should be normalized to "feed-crypto"
        maxPosts: 5,
      });

      expect(posts).toEqual(mockMessages);
      expect(mockNetClient.getMessageCount).toHaveBeenCalledWith({
        filter: {
          appAddress: "0x0000000000000000000000000000000000000000",
          topic: "feed-crypto",
        },
      });
      expect(mockNetClient.getMessages).toHaveBeenCalledWith({
        filter: {
          appAddress: "0x0000000000000000000000000000000000000000",
          topic: "feed-crypto",
        },
        startIndex: 5, // 10 - 5 = 5
        endIndex: 10,
      });
    });

    it("should handle case-insensitive topic normalization", async () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      mockNetClient.getMessageCount.mockResolvedValue(10);
      mockNetClient.getMessages.mockResolvedValue([]);

      await client.getFeedPosts({
        topic: "CRYPTO", // Should be normalized to "feed-crypto"
        maxPosts: 5,
      });

      expect(mockNetClient.getMessageCount).toHaveBeenCalledWith({
        filter: {
          appAddress: "0x0000000000000000000000000000000000000000",
          topic: "feed-crypto",
        },
      });
    });

    it("should handle already prefixed topics", async () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      mockNetClient.getMessageCount.mockResolvedValue(10);
      mockNetClient.getMessages.mockResolvedValue([]);

      await client.getFeedPosts({
        topic: "feed-crypto", // Already prefixed
        maxPosts: 5,
      });

      expect(mockNetClient.getMessageCount).toHaveBeenCalledWith({
        filter: {
          appAddress: "0x0000000000000000000000000000000000000000",
          topic: "feed-crypto",
        },
      });
    });

    it("should handle count = 0", async () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      mockNetClient.getMessageCount.mockResolvedValue(0);
      mockNetClient.getMessages.mockResolvedValue([]);

      const posts = await client.getFeedPosts({
        topic: "crypto",
        maxPosts: 50,
      });

      expect(posts).toEqual([]);
      expect(mockNetClient.getMessages).toHaveBeenCalledWith({
        filter: {
          appAddress: "0x0000000000000000000000000000000000000000",
          topic: "feed-crypto",
        },
        startIndex: 0,
        endIndex: 0,
      });
    });

    it("should handle maxPosts = 0", async () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      mockNetClient.getMessageCount.mockResolvedValue(10);
      mockNetClient.getMessages.mockResolvedValue([]);

      await client.getFeedPosts({
        topic: "crypto",
        maxPosts: 0,
      });

      expect(mockNetClient.getMessages).toHaveBeenCalledWith({
        filter: {
          appAddress: "0x0000000000000000000000000000000000000000",
          topic: "feed-crypto",
        },
        startIndex: 10, // count - 0 = 10
        endIndex: 10,
      });
    });

    it("should handle maxPosts > count", async () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      mockNetClient.getMessageCount.mockResolvedValue(5);
      mockNetClient.getMessages.mockResolvedValue([]);

      await client.getFeedPosts({
        topic: "crypto",
        maxPosts: 10, // More than count
      });

      expect(mockNetClient.getMessages).toHaveBeenCalledWith({
        filter: {
          appAddress: "0x0000000000000000000000000000000000000000",
          topic: "feed-crypto",
        },
        startIndex: 0, // Should be 0 when maxPosts > count
        endIndex: 5,
      });
    });

    it("should use default maxPosts = 50", async () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      mockNetClient.getMessageCount.mockResolvedValue(100);
      mockNetClient.getMessages.mockResolvedValue([]);

      await client.getFeedPosts({
        topic: "crypto",
        // maxPosts not provided
      });

      expect(mockNetClient.getMessages).toHaveBeenCalledWith({
        filter: {
          appAddress: "0x0000000000000000000000000000000000000000",
          topic: "feed-crypto",
        },
        startIndex: 50, // 100 - 50 = 50
        endIndex: 100,
      });
    });

    it("should propagate errors from NetClient", async () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      const error = new Error("Network error");
      mockNetClient.getMessageCount.mockRejectedValue(error);

      await expect(
        client.getFeedPosts({
          topic: "crypto",
          maxPosts: 10,
        })
      ).rejects.toThrow("Network error");
    });
  });

  describe("getFeedPostCount", () => {
    it("should normalize topic and get count", async () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      mockNetClient.getMessageCount.mockResolvedValue(42);

      const count = await client.getFeedPostCount("crypto");

      expect(count).toBe(42);
      expect(mockNetClient.getMessageCount).toHaveBeenCalledWith({
        filter: {
          appAddress: "0x0000000000000000000000000000000000000000",
          topic: "feed-crypto",
        },
      });
    });

    it("should handle case-insensitive topic normalization", async () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      mockNetClient.getMessageCount.mockResolvedValue(10);

      await client.getFeedPostCount("CRYPTO");

      expect(mockNetClient.getMessageCount).toHaveBeenCalledWith({
        filter: {
          appAddress: "0x0000000000000000000000000000000000000000",
          topic: "feed-crypto",
        },
      });
    });

    it("should propagate errors from NetClient", async () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      const error = new Error("Network error");
      mockNetClient.getMessageCount.mockRejectedValue(error);

      await expect(client.getFeedPostCount("crypto")).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("preparePostToFeed", () => {
    it("should normalize topic and create transaction config", () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      const mockConfig = {
        address: "0x123",
        abi: [],
        functionName: "sendMessage",
        args: [],
      };

      mockNetClient.prepareSendMessage.mockReturnValue(mockConfig);

      const config = client.preparePostToFeed({
        topic: "crypto",
        text: "Hello world!",
      });

      expect(config).toEqual(mockConfig);
      expect(mockNetClient.prepareSendMessage).toHaveBeenCalledWith({
        text: "Hello world!",
        topic: "feed-crypto",
        data: undefined,
      });
    });

    it("should handle data conversion to hex", () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      const mockConfig = {
        address: "0x123",
        abi: [],
        functionName: "sendMessage",
        args: [],
      };

      mockNetClient.prepareSendMessage.mockReturnValue(mockConfig);

      const config = client.preparePostToFeed({
        topic: "crypto",
        text: "Hello world!",
        data: "netid-abc123",
      });

      expect(config).toEqual(mockConfig);
      expect(mockNetClient.prepareSendMessage).toHaveBeenCalledWith({
        text: "Hello world!",
        topic: "feed-crypto",
        data: expect.stringMatching(/^0x/), // Should be hex string
      });
    });

    it("should handle missing data", () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      const mockConfig = {
        address: "0x123",
        abi: [],
        functionName: "sendMessage",
        args: [],
      };

      mockNetClient.prepareSendMessage.mockReturnValue(mockConfig);

      const config = client.preparePostToFeed({
        topic: "crypto",
        text: "Hello world!",
        // data not provided
      });

      expect(config).toEqual(mockConfig);
      expect(mockNetClient.prepareSendMessage).toHaveBeenCalledWith({
        text: "Hello world!",
        topic: "feed-crypto",
        data: undefined,
      });
    });

    it("should handle case-insensitive topic normalization", () => {
      const client = new FeedClient({ chainId: BASE_CHAIN_ID });

      const mockConfig = {
        address: "0x123",
        abi: [],
        functionName: "sendMessage",
        args: [],
      };

      mockNetClient.prepareSendMessage.mockReturnValue(mockConfig);

      client.preparePostToFeed({
        topic: "CRYPTO",
        text: "Hello world!",
      });

      expect(mockNetClient.prepareSendMessage).toHaveBeenCalledWith({
        text: "Hello world!",
        topic: "feed-crypto",
        data: undefined,
      });
    });
  });
});

