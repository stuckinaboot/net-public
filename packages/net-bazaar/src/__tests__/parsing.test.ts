import { describe, it, expect } from "vitest";
import { encodeAbiParameters } from "viem";
import { parseListingFromMessage, parseErc20ListingFromMessage, parseErc20OfferFromMessage } from "../utils/parsing";
import { BAZAAR_SUBMISSION_ABI } from "../abis";
import {
  NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS,
  NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS,
  NET_SEAPORT_ZONE_ADDRESS,
} from "../chainConfig";
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
    expect(listing!.price).toBe(1);
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

// Helper to create a mock ERC20 listing message (seller offers ERC20, receives native)
function createMockErc20ListingMessage({
  offerer = "0x1234567890123456789012345678901234567890" as `0x${string}`,
  zone = NET_SEAPORT_ZONE_ADDRESS as `0x${string}`,
  zoneHash = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
  tokenAddress = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
  tokenAmount = BigInt("1000000000000000000"), // 1 token (18 decimals)
  price = BigInt("500000000000000000"), // 0.5 ETH
}: {
  offerer?: `0x${string}`;
  zone?: `0x${string}`;
  zoneHash?: `0x${string}`;
  tokenAddress?: `0x${string}`;
  tokenAmount?: bigint;
  price?: bigint;
} = {}) {
  const submission = {
    parameters: {
      offerer,
      zone,
      offer: [
        {
          itemType: ItemType.ERC20,
          token: tokenAddress,
          identifierOrCriteria: BigInt(0),
          startAmount: tokenAmount,
          endAmount: tokenAmount,
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
      endTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
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

describe("parseErc20ListingFromMessage", () => {
  it("parses a basic public ERC20 listing", () => {
    const message = createMockErc20ListingMessage();
    const listing = parseErc20ListingFromMessage(message as any, 84532, 18);

    expect(listing).not.toBeNull();
    expect(listing!.maker).toBe("0x1234567890123456789012345678901234567890");
    expect(listing!.tokenAddress.toLowerCase()).toBe("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(listing!.tokenAmount).toBe(BigInt("1000000000000000000"));
    expect(listing!.priceWei).toBe(BigInt("500000000000000000"));
    expect(listing!.currency).toBe("eth");
    expect(listing!.targetFulfiller).toBeUndefined();
  });

  it("sets targetFulfiller for private ERC20 listings using the private order zone", () => {
    const privateZoneHash = "0x00000000000000000000000000000000000000000000000000000000deadbeef" as `0x${string}`;
    const message = createMockErc20ListingMessage({
      zone: NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS,
      zoneHash: privateZoneHash,
    });

    const listing = parseErc20ListingFromMessage(message as any, 84532, 18);

    expect(listing).not.toBeNull();
    expect(listing!.targetFulfiller).toBe(privateZoneHash);
  });

  it("does not set targetFulfiller when zone is private but zoneHash is zero", () => {
    const message = createMockErc20ListingMessage({
      zone: NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS,
      zoneHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    });

    const listing = parseErc20ListingFromMessage(message as any, 84532, 18);

    expect(listing).not.toBeNull();
    expect(listing!.targetFulfiller).toBeUndefined();
  });

  it("does not set targetFulfiller for non-private zone even with non-zero zoneHash", () => {
    const message = createMockErc20ListingMessage({
      zone: NET_SEAPORT_ZONE_ADDRESS,
      zoneHash: "0x00000000000000000000000000000000000000000000000000000000deadbeef",
    });

    const listing = parseErc20ListingFromMessage(message as any, 84532, 18);

    expect(listing).not.toBeNull();
    expect(listing!.targetFulfiller).toBeUndefined();
  });

  it("rejects legacy native-payment listings on chains with a configured USDC quote token", () => {
    // Base (8453) is configured with USDC as quote token, so a native-payment
    // listing must be filtered out — legacy WETH/ETH orders no longer appear.
    const message = createMockErc20ListingMessage();
    const listing = parseErc20ListingFromMessage(message as any, 8453, 18);
    expect(listing).toBeNull();
  });
});

// Helper to create a mock USDC-denominated ERC20 listing (consideration = ERC20 USDC)
const BASE_USDC_ADDRESS =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`;

function createMockErc20UsdcListingMessage({
  offerer = "0x1234567890123456789012345678901234567890" as `0x${string}`,
  tokenAddress = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
  tokenAmount = BigInt("1000000000000000000"),
  price = BigInt("5000000"), // 5 USDC (6 decimals)
  quoteToken = BASE_USDC_ADDRESS,
}: {
  offerer?: `0x${string}`;
  tokenAddress?: `0x${string}`;
  tokenAmount?: bigint;
  price?: bigint;
  quoteToken?: `0x${string}`;
} = {}) {
  const submission = {
    parameters: {
      offerer,
      zone: NET_SEAPORT_ZONE_ADDRESS,
      offer: [
        {
          itemType: ItemType.ERC20,
          token: tokenAddress,
          identifierOrCriteria: BigInt(0),
          startAmount: tokenAmount,
          endAmount: tokenAmount,
        },
      ],
      consideration: [
        {
          itemType: ItemType.ERC20,
          token: quoteToken,
          identifierOrCriteria: BigInt(0),
          startAmount: price,
          endAmount: price,
          recipient: offerer,
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
  return {
    sender: offerer,
    text: "",
    data,
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
  };
}

describe("parseErc20ListingFromMessage with USDC quote token (Base)", () => {
  it("parses a USDC-denominated ERC20 listing on Base", () => {
    const message = createMockErc20UsdcListingMessage();
    const listing = parseErc20ListingFromMessage(message as any, 8453, 18);

    expect(listing).not.toBeNull();
    expect(listing!.tokenAddress.toLowerCase()).toBe("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(listing!.tokenAmount).toBe(BigInt("1000000000000000000"));
    expect(listing!.priceWei).toBe(BigInt("5000000"));
  });

  it("rejects a USDC listing whose consideration is a different ERC20 token", () => {
    const wrongToken = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" as `0x${string}`;
    const message = createMockErc20UsdcListingMessage({ quoteToken: wrongToken });
    const listing = parseErc20ListingFromMessage(message as any, 8453, 18);
    expect(listing).toBeNull();
  });
});

// Helper to create a mock ERC20 offer message (buyer offers `quoteToken` for `tokenAddress`)
function createMockErc20OfferMessage({
  offerer = "0x1234567890123456789012345678901234567890" as `0x${string}`,
  tokenAddress = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
  tokenAmount = BigInt("1000000000000000000"),
  price = BigInt("5000000"),
  quoteToken = BASE_USDC_ADDRESS,
}: {
  offerer?: `0x${string}`;
  tokenAddress?: `0x${string}`;
  tokenAmount?: bigint;
  price?: bigint;
  quoteToken?: `0x${string}`;
} = {}) {
  const submission = {
    parameters: {
      offerer,
      zone: NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS,
      offer: [
        {
          itemType: ItemType.ERC20,
          token: quoteToken,
          identifierOrCriteria: BigInt(0),
          startAmount: price,
          endAmount: price,
        },
      ],
      consideration: [
        {
          itemType: ItemType.ERC20,
          token: tokenAddress,
          identifierOrCriteria: BigInt(0),
          startAmount: tokenAmount,
          endAmount: tokenAmount,
          recipient: offerer,
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
  return {
    sender: offerer,
    text: "",
    data,
    timestamp: BigInt(Math.floor(Date.now() / 1000)),
  };
}

describe("parseErc20OfferFromMessage with USDC quote token (Base)", () => {
  it("parses a USDC-denominated ERC20 offer on Base", () => {
    const message = createMockErc20OfferMessage();
    const offer = parseErc20OfferFromMessage(message as any, 8453, 18);

    expect(offer).not.toBeNull();
    expect(offer!.tokenAddress.toLowerCase()).toBe("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(offer!.priceWei).toBe(BigInt("5000000"));
  });

  it("rejects a legacy WETH-denominated offer on Base", () => {
    const wethAddress = "0x4200000000000000000000000000000000000006" as `0x${string}`;
    const message = createMockErc20OfferMessage({ quoteToken: wethAddress });
    const offer = parseErc20OfferFromMessage(message as any, 8453, 18);
    expect(offer).toBeNull();
  });

  it("accepts WETH-denominated offers on chains without a USDC quote token", () => {
    const wethAddress = "0x4200000000000000000000000000000000000006" as `0x${string}`;
    const message = createMockErc20OfferMessage({ quoteToken: wethAddress });
    const offer = parseErc20OfferFromMessage(message as any, 84532, 18);
    expect(offer).not.toBeNull();
  });
});
