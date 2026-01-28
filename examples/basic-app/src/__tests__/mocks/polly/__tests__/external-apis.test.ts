/**
 * Polly.js VCR tests for external APIs.
 * Run with POLLY_RECORD=true to create new recordings.
 *
 * These tests demonstrate recording and replaying external API calls:
 * - Ethereum JSON-RPC calls for blockchain data (Base and Ethereum mainnet)
 * - Public API endpoints for gas prices
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Polly } from "@pollyjs/core";
import NodeHttpAdapter from "@pollyjs/adapter-node-http";
import FetchAdapter from "@pollyjs/adapter-fetch";
import FSPersister from "@pollyjs/persister-fs";
import path from "path";
import { server } from "../../msw/server";

Polly.register(FetchAdapter);
Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);

const RECORDINGS_DIR = path.join(__dirname, "../recordings");
const shouldRecord = process.env.POLLY_RECORD === "true";

function createPolly(recordingName: string): Polly {
  return new Polly(recordingName, {
    adapters: ["fetch", "node-http"],
    persister: "fs",
    persisterOptions: { fs: { recordingsDir: RECORDINGS_DIR } },
    mode: shouldRecord ? "record" : "replay",
    recordIfMissing: shouldRecord,
    flushRequestsOnStop: true,
    recordFailedRequests: true,
    matchRequestsBy: {
      headers: {
        exclude: ["user-agent", "accept-encoding", "connection", "host"],
      },
      body: true,
      order: false,
    },
    logging: false,
  });
}

describe("Polly.js External API Recording", () => {
  // Close MSW server so Polly can intercept external requests
  beforeAll(() => server.close());
  afterAll(() => server.listen({ onUnhandledRequest: "warn" }));

  describe("Blockchain RPC (Base Mainnet)", () => {
    const BASE_RPC_URL = "https://mainnet.base.org";

    it("should fetch current block number", async () => {
      const polly = createPolly("base-rpc-block-number");

      try {
        const response = await fetch(BASE_RPC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1,
          }),
        });
        const data = await response.json();

        expect(response.ok).toBe(true);
        expect(data).toHaveProperty("jsonrpc", "2.0");
        expect(data).toHaveProperty("result");
        // Block number is returned as hex string
        expect(data.result).toMatch(/^0x[0-9a-fA-F]+$/);

        // Convert to number and verify it's a valid block number
        const blockNumber = parseInt(data.result, 16);
        expect(blockNumber).toBeGreaterThan(0);
      } finally {
        await polly.stop();
      }
    });

    it("should fetch chain ID", async () => {
      const polly = createPolly("base-rpc-chain-id");

      try {
        const response = await fetch(BASE_RPC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_chainId",
            params: [],
            id: 1,
          }),
        });
        const data = await response.json();

        expect(response.ok).toBe(true);
        expect(data).toHaveProperty("result");

        // Base mainnet chain ID is 8453 (0x2105 in hex)
        const chainId = parseInt(data.result, 16);
        expect(chainId).toBe(8453);
      } finally {
        await polly.stop();
      }
    });

    it("should fetch ETH balance for a known address", async () => {
      const polly = createPolly("base-rpc-eth-balance");

      // Use a known address (Base bridge contract)
      const basePortalAddress = "0x49048044D57e1C92A77f79988d21Fa8fAF74E97e";

      try {
        const response = await fetch(BASE_RPC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [basePortalAddress, "latest"],
            id: 1,
          }),
        });
        const data = await response.json();

        expect(response.ok).toBe(true);
        expect(data).toHaveProperty("result");
        // Balance is returned as hex string
        expect(data.result).toMatch(/^0x[0-9a-fA-F]*$/);
      } finally {
        await polly.stop();
      }
    });

    it("should fetch gas price", async () => {
      const polly = createPolly("base-rpc-gas-price");

      try {
        const response = await fetch(BASE_RPC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_gasPrice",
            params: [],
            id: 1,
          }),
        });
        const data = await response.json();

        expect(response.ok).toBe(true);
        expect(data).toHaveProperty("result");
        // Gas price is returned as hex string
        expect(data.result).toMatch(/^0x[0-9a-fA-F]+$/);

        // Convert to number and verify it's a valid gas price
        const gasPrice = parseInt(data.result, 16);
        expect(gasPrice).toBeGreaterThan(0);
      } finally {
        await polly.stop();
      }
    });
  });

  describe("Consistent replay", () => {
    it("should return consistent data across multiple RPC requests", async () => {
      const polly = createPolly("consistent-replay-rpc");
      const BASE_RPC_URL = "https://mainnet.base.org";

      try {
        // Make the same RPC request twice
        const makeRequest = () =>
          fetch(BASE_RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_chainId",
              params: [],
              id: 1,
            }),
          });

        const response1 = await makeRequest();
        const data1 = await response1.json();

        const response2 = await makeRequest();
        const data2 = await response2.json();

        // In replay mode, both requests should return identical data
        expect(data1.result).toBe(data2.result);
        expect(parseInt(data1.result, 16)).toBe(8453);
      } finally {
        await polly.stop();
      }
    });
  });
});
