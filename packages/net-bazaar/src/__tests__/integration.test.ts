import { describe, it, expect } from "vitest";
import { BazaarClient } from "../client/BazaarClient";
import { SeaportOrderStatus } from "../types";

// Integration tests that hit real RPC endpoints
// These test against actual on-chain data

describe("BazaarClient Integration", () => {
  // Use Base mainnet for testing
  const chainId = 8453;

  describe("getListings", () => {
    it("fetches listings for a collection on Base", async () => {
      const client = new BazaarClient({ chainId });

      // Use a collection that likely has listings - we'll use a known Base NFT
      // If no listings exist, that's also a valid result
      const listings = await client.getListings({
        nftAddress: "0x000000000000000000000000000000000000dead" as `0x${string}`,
        maxMessages: 10,
      });

      // Should return an array (possibly empty)
      expect(Array.isArray(listings)).toBe(true);

      // If there are listings, verify structure
      if (listings.length > 0) {
        const listing = listings[0];
        expect(listing.maker).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(listing.nftAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(typeof listing.tokenId).toBe("string");
        expect(typeof listing.priceWei).toBe("bigint");
        expect(typeof listing.price).toBe("string");
        expect(listing.orderStatus).toBe(SeaportOrderStatus.OPEN);
        expect(listing.expirationDate).toBeGreaterThan(Math.floor(Date.now() / 1000));
      }
    }, 30000);

    it("returns empty array for collection with no listings", async () => {
      const client = new BazaarClient({ chainId });

      // Use a random address that definitely has no listings
      const listings = await client.getListings({
        nftAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        maxMessages: 10,
      });

      expect(listings).toEqual([]);
    }, 30000);
  });

  describe("getCollectionOffers", () => {
    it("fetches collection offers on Base", async () => {
      const client = new BazaarClient({ chainId });

      const offers = await client.getCollectionOffers({
        nftAddress: "0x000000000000000000000000000000000000dead" as `0x${string}`,
        maxMessages: 10,
      });

      // Should return an array (possibly empty)
      expect(Array.isArray(offers)).toBe(true);

      // If there are offers, verify structure
      if (offers.length > 0) {
        const offer = offers[0];
        expect(offer.maker).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(offer.nftAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(typeof offer.priceWei).toBe("bigint");
        expect(typeof offer.price).toBe("string");
        expect(offer.orderStatus).toBe(SeaportOrderStatus.OPEN);
      }
    }, 30000);
  });

  describe("contract addresses", () => {
    it("returns correct addresses for Base", () => {
      const client = new BazaarClient({ chainId });

      expect(client.getBazaarAddress()).toBe("0x000000058f3ade587388daf827174d0e6fc97595");
      expect(client.getCollectionOffersAddress()).toBe("0x0000000f9c45efcff0f78d8b54aa6a40092d66dc");
      expect(client.getSeaportAddress()).toBe("0x0000000000000068F116a894984e2DB1123eB395");
    });
  });

  describe("chain support", () => {
    it("throws for unsupported chain", () => {
      expect(() => new BazaarClient({ chainId: 99999 })).toThrow(
        "Bazaar is not supported on chain 99999"
      );
    });

    it("works for all supported chains", () => {
      const supportedChains = [8453, 84532, 666666666, 5112, 57073, 130, 999, 9745, 143];

      for (const chain of supportedChains) {
        expect(() => new BazaarClient({ chainId: chain })).not.toThrow();
      }
    });
  });
});
