import { describe, it, expect, vi, beforeEach } from "vitest";
import { keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  buildSessionTypedData,
  exchangeSessionSignature,
  buildConversationAuthTypedData,
} from "../externalSigning";
import { RELAY_ACCESS_KEY } from "../constants";

describe("externalSigning", () => {
  describe("buildSessionTypedData", () => {
    const operator = "0x1234567890abcdef1234567890abcdef12345678" as const;

    it("returns { typedData, expiresAt } shape", () => {
      const result = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      expect(result).toHaveProperty("typedData");
      expect(result).toHaveProperty("expiresAt");
      // typedData only has the four EIP-712 fields — no convenience extras
      expect(Object.keys(result.typedData).sort()).toEqual([
        "domain",
        "message",
        "primaryType",
        "types",
      ]);
    });

    it("uses the correct EIP-712 domain", () => {
      const { typedData } = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      expect(typedData.domain).toEqual({
        name: "Net Relay Service",
        version: "1",
        chainId: 8453,
      });
      expect(typedData.primaryType).toBe("RelaySession");
    });

    it("includes the correct types for RelaySession", () => {
      const { typedData } = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      expect(typedData.types.RelaySession).toEqual([
        { name: "operatorAddress", type: "address" },
        { name: "secretKeyHash", type: "bytes32" },
        { name: "expiresAt", type: "uint256" },
      ]);
    });

    it("hashes the secret key matching the SDK's session creation logic", () => {
      const { typedData } = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      const expectedHash = keccak256(toBytes(RELAY_ACCESS_KEY));
      expect(typedData.message.secretKeyHash).toBe(expectedHash);
    });

    it("uses the provided secret key when given", () => {
      const customKey = "custom-secret";
      const { typedData } = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
        secretKey: customKey,
      });
      expect(typedData.message.secretKeyHash).toBe(keccak256(toBytes(customKey)));
    });

    it("emits expiresAt as a decimal string in the message (JSON-safe)", () => {
      const { typedData } = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
        expiresIn: 3600,
      });
      expect(typeof typedData.message.expiresAt).toBe("string");
      expect(Number.isFinite(parseInt(typedData.message.expiresAt, 10))).toBe(true);
    });

    it("top-level expiresAt matches message.expiresAt", () => {
      const { typedData, expiresAt } = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      expect(expiresAt.toString()).toBe(typedData.message.expiresAt);
    });

    it("defaults expiry to 3600 seconds from now", () => {
      const now = Math.floor(Date.now() / 1000);
      const { expiresAt } = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      const delta = expiresAt - now;
      expect(delta).toBeGreaterThanOrEqual(3595);
      expect(delta).toBeLessThanOrEqual(3605);
    });

    it("respects the expiresIn parameter", () => {
      const now = Math.floor(Date.now() / 1000);
      const { expiresAt } = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
        expiresIn: 60,
      });
      const delta = expiresAt - now;
      expect(delta).toBeGreaterThanOrEqual(55);
      expect(delta).toBeLessThanOrEqual(65);
    });

    it("is fully JSON-safe (no bigints anywhere in output)", () => {
      const result = buildSessionTypedData({
        operatorAddress: operator,
        chainId: 8453,
      });
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    /**
     * CRITICAL: The private-key path (`createRelaySession`) builds the
     * message with `expiresAt: BigInt(...)`, while buildSessionTypedData
     * emits it as a decimal string. Both paths MUST produce the same
     * signature — if viem doesn't treat them as equivalent when hashing
     * uint256, the external-signer flow silently produces signatures that
     * fail backend verification.
     */
    it("string and bigint forms of expiresAt produce identical signatures", async () => {
      // Deterministic test private key (well-known Anvil account)
      const testKey =
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
      const account = privateKeyToAccount(testKey);

      // Build typed data with both forms of expiresAt
      const expiresAt = 1776317022;
      const operatorAddress = account.address;
      const secretKeyHash = keccak256(toBytes(RELAY_ACCESS_KEY));

      const domain = {
        name: "Net Relay Service",
        version: "1",
        chainId: 8453,
      } as const;

      const types = {
        RelaySession: [
          { name: "operatorAddress", type: "address" },
          { name: "secretKeyHash", type: "bytes32" },
          { name: "expiresAt", type: "uint256" },
        ],
      } as const;

      // Path 1: bigint (matches createRelaySession)
      const sigBigInt = await account.signTypedData({
        domain,
        types,
        primaryType: "RelaySession",
        message: {
          operatorAddress,
          secretKeyHash,
          expiresAt: BigInt(expiresAt),
        },
      });

      // Path 2: decimal string (matches buildSessionTypedData output)
      const sigString = await account.signTypedData({
        domain,
        types,
        primaryType: "RelaySession",
        message: {
          operatorAddress,
          secretKeyHash,
          expiresAt: expiresAt.toString(),
        },
      });

      // If these differ, the external-signer path would fail backend verification
      expect(sigString).toBe(sigBigInt);
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
    const topic = "agent-chat-0x1234567890abcdef1234567890abcdef12345678-testtest";

    it("returns { typedData, topic } shape", () => {
      const result = buildConversationAuthTypedData({ topic, chainId: 8453 });
      expect(result).toHaveProperty("typedData");
      expect(result.topic).toBe(topic);
      // typedData only has the four EIP-712 fields
      expect(Object.keys(result.typedData).sort()).toEqual([
        "domain",
        "message",
        "primaryType",
        "types",
      ]);
    });

    it("uses the ConversationAuth domain with the chat contract", () => {
      const { typedData } = buildConversationAuthTypedData({ topic, chainId: 8453 });
      expect(typedData.domain.name).toBe("Net AI Chat");
      expect(typedData.domain.version).toBe("1");
      expect(typedData.domain.chainId).toBe(8453);
      expect(typedData.domain.verifyingContract).toBe(
        "0x0000000e8d76d7a8deaa8a32fbed80b5354670e7",
      );
      expect(typedData.primaryType).toBe("ConversationAuth");
    });

    it("includes the topic in the message", () => {
      const { typedData } = buildConversationAuthTypedData({ topic, chainId: 8453 });
      expect(typedData.message).toEqual({ topic });
    });

    it("throws for unsupported chains", () => {
      expect(() =>
        buildConversationAuthTypedData({ topic, chainId: 9999 }),
      ).toThrow(/not deployed on chain 9999/);
    });

    it("is fully JSON-safe", () => {
      const result = buildConversationAuthTypedData({ topic, chainId: 8453 });
      expect(() => JSON.stringify(result)).not.toThrow();
    });
  });
});
