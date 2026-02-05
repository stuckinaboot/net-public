import { describe, it, expect } from "vitest";
import type { Listing, GetListingsOptions, GetErc20ListingsOptions } from "../types";
import { NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS } from "../chainConfig";

describe("types", () => {
  describe("Listing type", () => {
    it("supports targetFulfiller field", () => {
      const listing: Partial<Listing> = {
        targetFulfiller: "0xdeadbeef" as `0x${string}`,
      };
      expect(listing.targetFulfiller).toBe("0xdeadbeef");
    });

    it("targetFulfiller is optional (undefined for public orders)", () => {
      const listing: Partial<Listing> = {};
      expect(listing.targetFulfiller).toBeUndefined();
    });
  });

  describe("GetListingsOptions type", () => {
    it("supports maker field", () => {
      const options: GetListingsOptions = {
        nftAddress: "0x1234567890123456789012345678901234567890",
        maker: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      };
      expect(options.maker).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    });

    it("supports startIndex and endIndex fields", () => {
      const options: GetListingsOptions = {
        nftAddress: "0x1234567890123456789012345678901234567890",
        startIndex: 10,
        endIndex: 50,
      };
      expect(options.startIndex).toBe(10);
      expect(options.endIndex).toBe(50);
    });
  });

  describe("GetErc20ListingsOptions type", () => {
    it("supports maker field", () => {
      const options: GetErc20ListingsOptions = {
        tokenAddress: "0x1234567890123456789012345678901234567890",
        maker: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      };
      expect(options.maker).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    });

    it("supports startIndex and endIndex fields", () => {
      const options: GetErc20ListingsOptions = {
        tokenAddress: "0x1234567890123456789012345678901234567890",
        startIndex: 0,
        endIndex: 100,
      };
      expect(options.startIndex).toBe(0);
      expect(options.endIndex).toBe(100);
    });
  });

  describe("NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS", () => {
    it("is exported and has expected format", () => {
      expect(NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS).toBe(
        "0x000000bC63761cbb05305632212e2f3AE2BE7a9B"
      );
      expect(NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });
});
