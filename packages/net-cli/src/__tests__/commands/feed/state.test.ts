import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock fs module
vi.mock("fs");
vi.mock("os");

const mockFs = vi.mocked(fs);
const mockOs = vi.mocked(os);

describe("state utilities", () => {
  let stateModule: typeof import("../../../shared/state");
  let mockState: Record<string, unknown>;

  beforeEach(async () => {
    vi.resetModules();
    mockState = { feeds: {} };

    // Mock os.homedir
    mockOs.homedir.mockReturnValue("/mock/home");

    // Mock fs functions
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.renameSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.unlinkSync.mockImplementation(() => {});

    // Import fresh module
    stateModule = await import("../../../shared/state");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("history functions", () => {
    describe("addHistoryEntry", () => {
      it("should add a history entry with timestamp", () => {
        const writeCall = vi.fn();
        mockFs.writeFileSync.mockImplementation(writeCall);

        stateModule.addHistoryEntry({
          type: "post",
          txHash: "0xabc123",
          chainId: 8453,
          feed: "general",
          text: "Hello world",
        });

        expect(writeCall).toHaveBeenCalled();
        const savedData = JSON.parse(writeCall.mock.calls[0][1] as string);
        expect(savedData.history).toHaveLength(1);
        expect(savedData.history[0].type).toBe("post");
        expect(savedData.history[0].txHash).toBe("0xabc123");
        expect(savedData.history[0].feed).toBe("general");
        expect(savedData.history[0].timestamp).toBeGreaterThan(0);
      });

      it("should prepend new entries (most recent first)", () => {
        mockState = {
          feeds: {},
          history: [
            { type: "post", timestamp: 1000, txHash: "0xold", chainId: 8453, feed: "old" },
          ],
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

        const writeCall = vi.fn();
        mockFs.writeFileSync.mockImplementation(writeCall);

        stateModule.addHistoryEntry({
          type: "comment",
          txHash: "0xnew",
          chainId: 8453,
          feed: "new",
        });

        const savedData = JSON.parse(writeCall.mock.calls[0][1] as string);
        expect(savedData.history).toHaveLength(2);
        expect(savedData.history[0].txHash).toBe("0xnew");
        expect(savedData.history[1].txHash).toBe("0xold");
      });
    });

    describe("getHistory", () => {
      it("should return empty array when no history exists", () => {
        mockState = { feeds: {} };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

        const history = stateModule.getHistory();
        expect(history).toEqual([]);
      });

      it("should return all history entries", () => {
        mockState = {
          feeds: {},
          history: [
            { type: "post", timestamp: 2000, txHash: "0x2", chainId: 8453, feed: "a" },
            { type: "comment", timestamp: 1000, txHash: "0x1", chainId: 8453, feed: "b" },
          ],
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

        const history = stateModule.getHistory();
        expect(history).toHaveLength(2);
      });

      it("should limit results when limit is specified", () => {
        mockState = {
          feeds: {},
          history: [
            { type: "post", timestamp: 3000, txHash: "0x3", chainId: 8453, feed: "a" },
            { type: "post", timestamp: 2000, txHash: "0x2", chainId: 8453, feed: "b" },
            { type: "post", timestamp: 1000, txHash: "0x1", chainId: 8453, feed: "c" },
          ],
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

        const history = stateModule.getHistory(2);
        expect(history).toHaveLength(2);
        expect(history[0].txHash).toBe("0x3");
        expect(history[1].txHash).toBe("0x2");
      });
    });

    describe("getHistoryByType", () => {
      it("should filter by type", () => {
        mockState = {
          feeds: {},
          history: [
            { type: "post", timestamp: 3000, txHash: "0x3", chainId: 8453, feed: "a" },
            { type: "comment", timestamp: 2000, txHash: "0x2", chainId: 8453, feed: "b" },
            { type: "post", timestamp: 1000, txHash: "0x1", chainId: 8453, feed: "c" },
          ],
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

        const posts = stateModule.getHistoryByType("post");
        expect(posts).toHaveLength(2);
        expect(posts.every((p) => p.type === "post")).toBe(true);

        const comments = stateModule.getHistoryByType("comment");
        expect(comments).toHaveLength(1);
        expect(comments[0].type).toBe("comment");
      });
    });

    describe("clearHistory", () => {
      it("should clear all history entries", () => {
        mockState = {
          feeds: {},
          history: [
            { type: "post", timestamp: 1000, txHash: "0x1", chainId: 8453, feed: "a" },
          ],
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

        const writeCall = vi.fn();
        mockFs.writeFileSync.mockImplementation(writeCall);

        stateModule.clearHistory();

        const savedData = JSON.parse(writeCall.mock.calls[0][1] as string);
        expect(savedData.history).toEqual([]);
      });
    });

    describe("getHistoryCount", () => {
      it("should return 0 when no history", () => {
        mockState = { feeds: {} };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

        expect(stateModule.getHistoryCount()).toBe(0);
      });

      it("should return correct count", () => {
        mockState = {
          feeds: {},
          history: [
            { type: "post", timestamp: 2000, txHash: "0x2", chainId: 8453, feed: "a" },
            { type: "comment", timestamp: 1000, txHash: "0x1", chainId: 8453, feed: "b" },
          ],
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

        expect(stateModule.getHistoryCount()).toBe(2);
      });
    });
  });

  describe("isWalletAddress", () => {
    it("should return true for valid wallet addresses", () => {
      expect(stateModule.isWalletAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(true);
      expect(stateModule.isWalletAddress("0xABCDEF1234567890abcdef1234567890ABCDEF12")).toBe(true);
    });

    it("should return false for non-wallet strings", () => {
      expect(stateModule.isWalletAddress("general")).toBe(false);
      expect(stateModule.isWalletAddress("my-feed")).toBe(false);
      expect(stateModule.isWalletAddress("0x123")).toBe(false); // Too short
      expect(stateModule.isWalletAddress("1234567890abcdef1234567890abcdef12345678")).toBe(false); // Missing 0x
    });
  });

  describe("getContacts", () => {
    it("should return empty array when no DM history", () => {
      mockState = { feeds: {} };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

      const contacts = stateModule.getContacts();
      expect(contacts).toEqual([]);
    });

    it("should extract contacts from posts to wallet addresses", () => {
      mockState = {
        feeds: {},
        history: [
          { type: "post", timestamp: 2000, txHash: "0x2", chainId: 8453, feed: "0x1234567890abcdef1234567890abcdef12345678" },
          { type: "post", timestamp: 1000, txHash: "0x1", chainId: 8453, feed: "general" }, // Not a DM
        ],
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

      const contacts = stateModule.getContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].address).toBe("0x1234567890abcdef1234567890abcdef12345678");
      expect(contacts[0].interactionCount).toBe(1);
    });

    it("should aggregate multiple messages to same contact", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678";
      mockState = {
        feeds: {},
        history: [
          { type: "post", timestamp: 3000, txHash: "0x3", chainId: 8453, feed: address },
          { type: "post", timestamp: 2000, txHash: "0x2", chainId: 8453, feed: address },
          { type: "post", timestamp: 1000, txHash: "0x1", chainId: 8453, feed: address },
        ],
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

      const contacts = stateModule.getContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].interactionCount).toBe(3);
      expect(contacts[0].lastInteraction).toBe(3000);
      expect(contacts[0].firstInteraction).toBe(1000);
    });

    it("should sort contacts by last interaction (most recent first)", () => {
      mockState = {
        feeds: {},
        history: [
          { type: "post", timestamp: 1000, txHash: "0x1", chainId: 8453, feed: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
          { type: "post", timestamp: 3000, txHash: "0x3", chainId: 8453, feed: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
          { type: "post", timestamp: 2000, txHash: "0x2", chainId: 8453, feed: "0xcccccccccccccccccccccccccccccccccccccccc" },
        ],
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

      const contacts = stateModule.getContacts();
      expect(contacts).toHaveLength(3);
      expect(contacts[0].address).toBe("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
      expect(contacts[1].address).toBe("0xcccccccccccccccccccccccccccccccccccccccc");
      expect(contacts[2].address).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    });
  });

  describe("getActiveFeeds", () => {
    it("should return empty array when no feed history", () => {
      mockState = { feeds: {} };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

      const feeds = stateModule.getActiveFeeds();
      expect(feeds).toEqual([]);
    });

    it("should extract feeds from posts and comments", () => {
      mockState = {
        feeds: {},
        history: [
          { type: "post", timestamp: 2000, txHash: "0x2", chainId: 8453, feed: "general" },
          { type: "comment", timestamp: 1000, txHash: "0x1", chainId: 8453, feed: "general" },
        ],
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

      const feeds = stateModule.getActiveFeeds();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].feed).toBe("general");
      expect(feeds[0].postCount).toBe(1);
      expect(feeds[0].commentCount).toBe(1);
    });

    it("should exclude wallet addresses (those are contacts)", () => {
      mockState = {
        feeds: {},
        history: [
          { type: "post", timestamp: 2000, txHash: "0x2", chainId: 8453, feed: "general" },
          { type: "post", timestamp: 1000, txHash: "0x1", chainId: 8453, feed: "0x1234567890abcdef1234567890abcdef12345678" },
        ],
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

      const feeds = stateModule.getActiveFeeds();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].feed).toBe("general");
    });

    it("should exclude register entries", () => {
      mockState = {
        feeds: {},
        history: [
          { type: "post", timestamp: 2000, txHash: "0x2", chainId: 8453, feed: "general" },
          { type: "register", timestamp: 1000, txHash: "0x1", chainId: 8453, feed: "my-feed" },
        ],
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

      const feeds = stateModule.getActiveFeeds();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].feed).toBe("general");
    });

    it("should sort feeds by last activity (most recent first)", () => {
      mockState = {
        feeds: {},
        history: [
          { type: "post", timestamp: 1000, txHash: "0x1", chainId: 8453, feed: "alpha" },
          { type: "post", timestamp: 3000, txHash: "0x3", chainId: 8453, feed: "beta" },
          { type: "post", timestamp: 2000, txHash: "0x2", chainId: 8453, feed: "gamma" },
        ],
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockState));

      const feeds = stateModule.getActiveFeeds();
      expect(feeds).toHaveLength(3);
      expect(feeds[0].feed).toBe("beta");
      expect(feeds[1].feed).toBe("gamma");
      expect(feeds[2].feed).toBe("alpha");
    });
  });
});
