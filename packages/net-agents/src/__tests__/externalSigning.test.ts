import { describe, it, expect, vi, beforeEach } from "vitest";
import { keccak256, toBytes } from "viem";
import {
  buildSessionTypedData,
  exchangeSessionSignature,
  buildConversationAuthTypedData,
} from "../externalSigning";
import { RELAY_ACCESS_KEY } from "../constants";

describe("externalSigning", () => {
  describe("buildSessionTypedData", () => {
    const operator = "0x1234567890abcdef1234567890abcdef12345678" as const;

    it("uses the correct EIP-712 domain", () => {
      const data = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      expect(data.domain).toEqual({
        name: "Net Relay Service",
        version: "1",
        chainId: 8453,
      });
      expect(data.primaryType).toBe("RelaySession");
    });

    it("includes the correct types for RelaySession", () => {
      const data = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      expect(data.types.RelaySession).toEqual([
        { name: "operatorAddress", type: "address" },
        { name: "secretKeyHash", type: "bytes32" },
        { name: "expiresAt", type: "uint256" },
      ]);
    });

    it("hashes the secret key matching the SDK's session creation logic", () => {
      const data = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      // Must match the hash formula used in createRelaySession
      const expectedHash = keccak256(toBytes(RELAY_ACCESS_KEY));
      expect(data.message.secretKeyHash).toBe(expectedHash);
    });

    it("uses the provided secret key when given", () => {
      const customKey = "custom-secret";
      const data = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
        secretKey: customKey,
      });
      expect(data.message.secretKeyHash).toBe(keccak256(toBytes(customKey)));
    });

    it("emits expiresAt as a decimal string in message (JSON-safe)", () => {
      const data = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
        expiresIn: 3600,
      });
      expect(typeof data.message.expiresAt).toBe("string");
      // Should be a valid decimal number
      expect(Number.isFinite(parseInt(data.message.expiresAt, 10))).toBe(true);
    });

    it("expiresAt number matches expiresAt string in message", () => {
      const data = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      expect(data.expiresAt.toString()).toBe(data.message.expiresAt);
    });

    it("defaults expiry to 3600 seconds from now", () => {
      const now = Math.floor(Date.now() / 1000);
      const data = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      const delta = data.expiresAt - now;
      // Allow small timing variance (±5s)
      expect(delta).toBeGreaterThanOrEqual(3595);
      expect(delta).toBeLessThanOrEqual(3605);
    });

    it("respects the expiresIn parameter", () => {
      const now = Math.floor(Date.now() / 1000);
      const data = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
        expiresIn: 60,
      });
      const delta = data.expiresAt - now;
      expect(delta).toBeGreaterThanOrEqual(55);
      expect(delta).toBeLessThanOrEqual(65);
    });

    it("is fully JSON-safe (no bigints in output)", () => {
      const data = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      // Should not throw
      expect(() => JSON.stringify(data)).not.toThrow();
    });
  });

  describe("exchangeSessionSignature", () => {
    const mockFetch = vi.fn();
    const operator = "0x1234567890abcdef1234567890abcdef12345678" as const;

    beforeEach(() => {
      vi.stubGlobal("fetch", mockFetch);
      mockFetch.mockReset();
    });

    it("POSTs to /api/relay/session with the signature", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            sessionToken: "test-token",
            expiresAt: 12345,
          }),
      });

      const result = await exchangeSessionSignature({
        apiUrl: "https://netprotocol.app",
        chainId: 8453,
        operatorAddress: operator,
        signature: "0xdeadbeef",
        expiresAt: 12345,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://netprotocol.app/api/relay/session",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.operatorAddress).toBe(operator);
      expect(body.signature).toBe("0xdeadbeef");
      expect(body.expiresAt).toBe(12345);
      expect(body.secretKey).toBe(RELAY_ACCESS_KEY);
      expect(body.chainId).toBe(8453);

      expect(result).toEqual({
        sessionToken: "test-token",
        expiresAt: 12345,
      });
    });

    it("throws when the backend returns an error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
        json: () => Promise.resolve({ success: false, error: "Invalid signature" }),
      });

      await expect(
        exchangeSessionSignature({
          apiUrl: "https://netprotocol.app",
          chainId: 8453,
          operatorAddress: operator,
          signature: "0xdeadbeef",
          expiresAt: 12345,
        }),
      ).rejects.toThrow("Invalid signature");
    });
  });

  describe("buildConversationAuthTypedData", () => {
    it("uses the ConversationAuth domain with the chat contract", () => {
      const data = buildConversationAuthTypedData({
        topic: "agent-chat-0x1234567890abcdef1234567890abcdef12345678-testtest",
        chainId: 8453,
      });
      expect(data.domain.name).toBe("Net AI Chat");
      expect(data.domain.version).toBe("1");
      expect(data.domain.chainId).toBe(8453);
      // Contract deployed on Base (8453) + Base Sepolia
      expect(data.domain.verifyingContract).toBe(
        "0x0000000e8d76d7a8deaa8a32fbed80b5354670e7",
      );
      expect(data.primaryType).toBe("ConversationAuth");
    });

    it("includes the topic in the message", () => {
      const topic = "agent-chat-0x1234567890abcdef1234567890abcdef12345678-testtest";
      const data = buildConversationAuthTypedData({ topic, chainId: 8453 });
      expect(data.message).toEqual({ topic });
    });

    it("throws for unsupported chains", () => {
      expect(() =>
        buildConversationAuthTypedData({
          topic: "agent-chat-0x1234567890abcdef1234567890abcdef12345678-testtest",
          chainId: 9999,
        }),
      ).toThrow(/not deployed on chain 9999/);
    });

    it("is fully JSON-safe", () => {
      const data = buildConversationAuthTypedData({
        topic: "agent-chat-0x1234567890abcdef1234567890abcdef12345678-testtest",
        chainId: 8453,
      });
      expect(() => JSON.stringify(data)).not.toThrow();
    });
  });
});
