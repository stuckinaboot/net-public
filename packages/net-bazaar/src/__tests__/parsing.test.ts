import { describe, it, expect } from "vitest";
import { encodeAbiParameters } from "viem";
import { parseListingFromMessage } from "../utils/parsing";
import { BAZAAR_SUBMISSION_ABI } from "../abis";
import { NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS, NET_SEAPORT_ZONE_ADDRESS } from "../chainConfig";
import { ItemType, OrderType } from "../types";

// Helper to create a mock NetMessage with encoded Seaport submission data
function createMockListingMessage({
  offerer = "0x1234567890123456789012345678901234567890" as `0x${string}`,
  zone = NET_SEAPORT_ZONE_ADDRESS as `0x${string}`,
  zoneHash = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
  nftAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
  tokenId = BigInt(42),
  price = BigInt("1000000000000000000"), // 1 ETH
}: {
  offerer?: `0x${string}`;
  zone?: `0x${string}`;
  zoneHash?: `0x${string}`;
  nftAddress?: `0x${string}`;
  tokenId?: bigint;
  price?: bigint;
} = {}) {
  const submission = {
    parameters: {
      offerer,
      zone,
      offer: [
        {
          itemType: ItemType.ERC721,
          token: nftAddress,
          identifierOrCriteria: tokenId,
          startAmount: BigInt(1),
          endAmount: BigInt(1),
        },
      ],
      consideration: [
        {
          itemType: ItemType.NATIVE,
          token: "0x0000000000000000000000000000000000000000" as `0x${string}`,
          identifierOrCriteria: BigInt(0),
          startAmount: price,
          endAmount: price,
          recipient: offerer,
        },
      ],
      orderType: OrderType.FULL_RESTRICTED,
      startTime: BigInt(0),
      endTime: BigInt(Math.floor(Date.now() / 1000) + 86400), // 24h from now
      zoneHash,
      salt: BigInt(12345),
      conduitKey: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      totalOriginalConsiderationItems: BigInt(1),
    },
    counter: BigInt(0),
    signature: "0x1234" as `0x${string}`,
  };

  const data = encodeAbiParameters(BAZAAR_SUBMISSION_ABI, [submission]);

  return {
    sender: offerer,
    text: "",
    data,
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
  };
}

describe("parseListingFromMessage", () => {
  it("parses a basic public NFT listing", () => {
    const message = createMockListingMessage();
    const listing = parseListingFromMessage(message as any, 8453);

    expect(listing).not.toBeNull();
    expect(listing!.maker).toBe("0x1234567890123456789012345678901234567890");
    expect(listing!.nftAddress).toBe("0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa");
    expect(listing!.tokenId).toBe("42");
    expect(listing!.priceWei).toBe(BigInt("1000000000000000000"));
    expect(listing!.price).toBe("1");
    expect(listing!.currency).toBe("eth");
    expect(listing!.targetFulfiller).toBeUndefined();
  });

  it("sets targetFulfiller for private orders using the private order zone", () => {
    const privateZoneHash = "0x00000000000000000000000000000000000000000000000000000000deadbeef" as `0x${string}`;
    const message = createMockListingMessage({
      zone: NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS,
      zoneHash: privateZoneHash,
    });

    const listing = parseListingFromMessage(message as any, 8453);

    expect(listing).not.toBeNull();
    expect(listing!.targetFulfiller).toBe(privateZoneHash);
  });

  it("does not set targetFulfiller when zone is private but zoneHash is zero", () => {
    const message = createMockListingMessage({
      zone: NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS,
      zoneHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    });

    const listing = parseListingFromMessage(message as any, 8453);

    expect(listing).not.toBeNull();
    expect(listing!.targetFulfiller).toBeUndefined();
  });

  it("does not set targetFulfiller for non-private zone even with non-zero zoneHash", () => {
    const message = createMockListingMessage({
      zone: NET_SEAPORT_ZONE_ADDRESS,
      zoneHash: "0x00000000000000000000000000000000000000000000000000000000deadbeef",
    });

    const listing = parseListingFromMessage(message as any, 8453);

    expect(listing).not.toBeNull();
    expect(listing!.targetFulfiller).toBeUndefined();
  });

  it("returns null for ERC20 offer items (not NFT listings)", () => {
    const submission = {
      parameters: {
        offerer: "0x1234567890123456789012345678901234567890" as `0x${string}`,
        zone: NET_SEAPORT_ZONE_ADDRESS as `0x${string}`,
        offer: [
          {
            itemType: ItemType.ERC20,
            token: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
            identifierOrCriteria: BigInt(0),
            startAmount: BigInt("1000000000000000000"),
            endAmount: BigInt("1000000000000000000"),
          },
        ],
        consideration: [
          {
            itemType: ItemType.NATIVE,
            token: "0x0000000000000000000000000000000000000000" as `0x${string}`,
            identifierOrCriteria: BigInt(0),
            startAmount: BigInt("1000000000000000000"),
            endAmount: BigInt("1000000000000000000"),
            recipient: "0x1234567890123456789012345678901234567890" as `0x${string}`,
          },
        ],
        orderType: OrderType.FULL_RESTRICTED,
        startTime: BigInt(0),
        endTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
        zoneHash: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        salt: BigInt(12345),
        conduitKey: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        totalOriginalConsiderationItems: BigInt(1),
      },
      counter: BigInt(0),
      signature: "0x1234" as `0x${string}`,
    };

    const data = encodeAbiParameters(BAZAAR_SUBMISSION_ABI, [submission]);
    const message = {
      sender: "0x1234567890123456789012345678901234567890",
      text: "",
      data,
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
    };

    const listing = parseListingFromMessage(message as any, 8453);
    expect(listing).toBeNull();
  });
});
