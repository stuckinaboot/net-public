import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentClient } from "../client/AgentClient";
import { RELAY_ACCESS_KEY } from "../constants";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("AgentClient", () => {
  const apiUrl = "https://netprotocol.app";
  const chainId = 8453;
  let client: AgentClient;

  beforeEach(() => {
    client = new AgentClient({ apiUrl, chainId });
    mockFetch.mockReset();
  });

  describe("constructor", () => {
    it("should create a client with apiUrl and chainId", () => {
      expect(client).toBeDefined();
    });
  });

  describe("relayAccessKey", () => {
    it("should return the hardcoded relay access key", () => {
      expect(AgentClient.relayAccessKey).toBe(RELAY_ACCESS_KEY);
      expect(AgentClient.relayAccessKey).toBe("net-relay-public-access-key-v1");
    });
  });

  describe("createAgent", () => {
    it("should call POST /api/agents/config with correct body", async () => {
      const mockResponse = {
        success: true,
        agentId: "test-uuid",
        agentWalletAddress: "0xabc",
      };
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.createAgent({
        sessionToken: "test-token",
        config: {
          name: "TestBot",
          systemPrompt: "You are a test agent.",
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${apiUrl}/api/agents/config`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.sessionToken).toBe("test-token");
      expect(body.chainId).toBe(chainId);
      expect(body.config.name).toBe("TestBot");
      expect(result.success).toBe(true);
      expect(result.agentId).toBe("test-uuid");
    });

    it("should include profile when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      await client.createAgent({
        sessionToken: "test-token",
        config: {
          name: "TestBot",
          systemPrompt: "You are a test agent.",
        },
        profile: { displayName: "Test Display", bio: "A test bio" },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.profile.displayName).toBe("Test Display");
      expect(body.profile.bio).toBe("A test bio");
    });
  });

  describe("updateAgent", () => {
    it("should call PUT /api/agents/config", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await client.updateAgent({
        sessionToken: "test-token",
        agentId: "agent-123",
        config: { name: "NewName" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${apiUrl}/api/agents/config`,
        expect.objectContaining({ method: "PUT" }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.agentId).toBe("agent-123");
      expect(body.config.name).toBe("NewName");
      expect(result.success).toBe(true);
    });
  });

  describe("listAgents", () => {
    it("should call POST /api/agents/list", async () => {
      const agents = [
        {
          config: { id: "1", name: "Bot1" },
          walletAddress: "0xabc",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, agents }),
      });

      const result = await client.listAgents({ sessionToken: "test-token" });

      expect(mockFetch).toHaveBeenCalledWith(
        `${apiUrl}/api/agents/list`,
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.agents).toHaveLength(1);
      expect(result.agents![0].config.name).toBe("Bot1");
    });
  });

  describe("getAgent", () => {
    it("should find agent by ID from list", async () => {
      const agents = [
        { config: { id: "agent-1", name: "Bot1" }, walletAddress: "0xabc" },
        { config: { id: "agent-2", name: "Bot2" }, walletAddress: "0xdef" },
      ];
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, agents }),
      });

      const agent = await client.getAgent("test-token", "agent-2");
      expect(agent).not.toBeNull();
      expect(agent!.config.name).toBe("Bot2");
    });

    it("should return null for non-existent agent", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({ success: true, agents: [] }),
      });

      const agent = await client.getAgent("test-token", "nonexistent");
      expect(agent).toBeNull();
    });
  });

  describe("hideAgent / unhideAgent", () => {
    it("should call updateAgent with hidden: true", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      await client.hideAgent("test-token", "agent-1");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.config.hidden).toBe(true);
    });

    it("should call updateAgent with hidden: false", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      await client.unhideAgent("test-token", "agent-1");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.config.hidden).toBe(false);
    });
  });

  describe("runAgent", () => {
    it("should call POST /api/agents/run with correct body", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            action: "posted",
            actions: [],
            summary: "Posted to general",
          }),
      });

      const result = await client.runAgent({
        sessionToken: "test-token",
        agentId: "agent-1",
        mode: "feeds",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.agentId).toBe("agent-1");
      expect(body.mode).toBe("feeds");
      expect(result.action).toBe("posted");
    });
  });

  describe("sendMessage", () => {
    it("should throw if no signature and no account provided", async () => {
      await expect(
        client.sendMessage({
          sessionToken: "test-token",
          agentAddress: "0x1234567890abcdef1234567890abcdef12345678",
          message: "hello",
        }),
      ).rejects.toThrow("Either userSignature or account must be provided");
    });

    it("should call POST /api/chat/message with pre-signed signature", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            aiMessage: "Hello back!",
            transactionHash: "0xabc",
            timestamp: 1234567890,
            encrypted: false,
          }),
      });

      const result = await client.sendMessage({
        sessionToken: "test-token",
        agentAddress: "0x1234567890abcdef1234567890abcdef12345678",
        topic: "agent-chat-0x1234567890abcdef1234567890abcdef12345678-testtest",
        message: "hello",
        userSignature: "0xdeadbeef" as `0x${string}`,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${apiUrl}/api/chat/message`,
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.aiMessage).toBe("Hello back!");
      expect(result.topic).toBe(
        "agent-chat-0x1234567890abcdef1234567890abcdef12345678-testtest",
      );
    });

    it("should generate topic when not provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            aiMessage: "Hi!",
            transactionHash: "0xabc",
            timestamp: 123,
            encrypted: false,
          }),
      });

      const result = await client.sendMessage(
        {
          sessionToken: "test-token",
          agentAddress: "0x1234567890abcdef1234567890abcdef12345678",
          message: "hello",
          userSignature: "0xdeadbeef" as `0x${string}`,
        },
      );

      // Should have auto-generated a topic
      expect(result.topic).toMatch(
        /^agent-chat-0x1234567890abcdef1234567890abcdef12345678-/,
      );
    });
  });
});
