import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseReadOnlyOptionsWithDefault, DEFAULT_CHAIN_ID } from "../../../cli/shared";

describe("feed config utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("parseReadOnlyOptionsWithDefault", () => {
    it("should use default chain ID when not provided", () => {
      delete process.env.BOTCHAN_CHAIN_ID;
      delete process.env.NET_CHAIN_ID;

      const options = parseReadOnlyOptionsWithDefault({});
      expect(options.chainId).toBe(DEFAULT_CHAIN_ID);
      expect(options.rpcUrl).toBeUndefined();
    });

    it("should use option chain ID over environment", () => {
      process.env.BOTCHAN_CHAIN_ID = "1";

      const options = parseReadOnlyOptionsWithDefault({ chainId: 137 });
      expect(options.chainId).toBe(137);
    });

    it("should use BOTCHAN_CHAIN_ID from environment", () => {
      process.env.BOTCHAN_CHAIN_ID = "10";

      const options = parseReadOnlyOptionsWithDefault({});
      expect(options.chainId).toBe(10);
    });

    it("should use NET_CHAIN_ID from environment as fallback", () => {
      process.env.NET_CHAIN_ID = "42161";

      const options = parseReadOnlyOptionsWithDefault({});
      expect(options.chainId).toBe(42161);
    });

    it("should use option RPC URL over environment", () => {
      process.env.BOTCHAN_RPC_URL = "http://env.example.com";

      const options = parseReadOnlyOptionsWithDefault({
        rpcUrl: "http://option.example.com",
      });
      expect(options.rpcUrl).toBe("http://option.example.com");
    });

    it("should use BOTCHAN_RPC_URL from environment", () => {
      process.env.BOTCHAN_RPC_URL = "http://botchan.example.com";

      const options = parseReadOnlyOptionsWithDefault({});
      expect(options.rpcUrl).toBe("http://botchan.example.com");
    });

    it("should use NET_RPC_URL from environment as fallback", () => {
      process.env.NET_RPC_URL = "http://net.example.com";

      const options = parseReadOnlyOptionsWithDefault({});
      expect(options.rpcUrl).toBe("http://net.example.com");
    });
  });
});
