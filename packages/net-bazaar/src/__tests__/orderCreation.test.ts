import { describe, it, expect } from "vitest";
import {
  calculateFee,
  generateSalt,
  getDefaultExpiration,
  buildListingOrderComponents,
  buildCollectionOfferOrderComponents,
  buildErc20OfferOrderComponents,
  buildErc20ListingOrderComponents,
  buildEIP712OrderData,
  buildSubmitOrderTx,
} from "../utils/orderCreation";
import { ItemType, OrderType } from "../types";
import { BAZAAR_V2_ABI, BAZAAR_COLLECTION_OFFERS_ABI } from "../abis";
import {
  NET_SEAPORT_ZONE_ADDRESS,
  NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS,
  NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS,
} from "../chainConfig";

const OFFERER = "0x1234567890123456789012345678901234567890" as `0x${string}`;
const NFT_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`;
const TOKEN_ADDRESS = "0xcccccccccccccccccccccccccccccccccccccccc" as `0x${string}`;
const SEAPORT_ADDRESS = "0x0000000000000068F116a894984e2DB1123eB395" as `0x${string}`;

describe("calculateFee", () => {
  it("returns 0 when feeBps is 0", () => {
    expect(calculateFee(BigInt("1000000000000000000"), 0, false)).toBe(BigInt(0));
    expect(calculateFee(BigInt("1000000000000000000"), 0, true)).toBe(BigInt(0));
  });

  it("uses floor division for NFTs", () => {
    // 1 ETH * 500bps = 0.05 ETH
    expect(calculateFee(BigInt("1000000000000000000"), 500, false)).toBe(
      BigInt("50000000000000000")
    );

    // 1 wei * 500bps = 0 (floor)
    expect(calculateFee(BigInt(1), 500, false)).toBe(BigInt(0));
  });

  it("uses ceiling division for ERC20s", () => {
    // 1 ETH * 500bps = 0.05 ETH (same as floor for even division)
    expect(calculateFee(BigInt("1000000000000000000"), 500, true)).toBe(
      BigInt("50000000000000000")
    );

    // 1 wei * 500bps = 1 (ceiling rounds up)
    expect(calculateFee(BigInt(1), 500, true)).toBe(BigInt(1));

    // 3 * 500 / 10000 = 0.15 → ceiling = 1
    expect(calculateFee(BigInt(3), 500, true)).toBe(BigInt(1));
  });
});

describe("generateSalt", () => {
  it("returns a bigint", () => {
    const salt = generateSalt();
    expect(typeof salt).toBe("bigint");
    expect(salt > BigInt(0)).toBe(true);
  });

  it("generates unique salts", () => {
    const salts = new Set<bigint>();
    for (let i = 0; i < 10; i++) {
      salts.add(generateSalt());
    }
    expect(salts.size).toBe(10);
  });
});

describe("getDefaultExpiration", () => {
  it("returns a timestamp ~24h from now", () => {
    const now = Math.floor(Date.now() / 1000);
    const exp = getDefaultExpiration();
    // Should be within 2 seconds of 24h from now
    expect(exp).toBeGreaterThanOrEqual(now + 86398);
    expect(exp).toBeLessThanOrEqual(now + 86402);
  });
});

describe("buildListingOrderComponents", () => {
  it("builds a public NFT listing with fee (chain 84532, 5%)", () => {
    const { orderParameters, counter } = buildListingOrderComponents(
      {
        nftAddress: NFT_ADDRESS,
        tokenId: "42",
        priceWei: BigInt("1000000000000000000"),
        offerer: OFFERER,
      },
      84532, // Base Sepolia, 5% fee
      BigInt(0)
    );

    expect(orderParameters.offerer).toBe(OFFERER);
    expect(orderParameters.zone.toLowerCase()).toBe(NET_SEAPORT_ZONE_ADDRESS.toLowerCase());
    expect(orderParameters.orderType).toBe(OrderType.FULL_RESTRICTED);

    // Offer: 1 ERC721
    expect(orderParameters.offer).toHaveLength(1);
    expect(orderParameters.offer[0].itemType).toBe(ItemType.ERC721);
    expect(orderParameters.offer[0].token).toBe(NFT_ADDRESS);
    expect(orderParameters.offer[0].identifierOrCriteria).toBe(BigInt(42));

    // Consideration: seller payment + fee
    expect(orderParameters.consideration).toHaveLength(2);
    expect(orderParameters.consideration[0].itemType).toBe(ItemType.NATIVE);
    expect(orderParameters.consideration[0].recipient).toBe(OFFERER);
    expect(orderParameters.consideration[0].startAmount).toBe(BigInt("950000000000000000")); // 0.95 ETH
    expect(orderParameters.consideration[1].startAmount).toBe(BigInt("50000000000000000")); // 0.05 ETH fee

    expect(orderParameters.totalOriginalConsiderationItems).toBe(BigInt(2));
    expect(counter).toBe(BigInt(0));
  });

  it("builds a public NFT listing without fee (chain 8453, 0%)", () => {
    const { orderParameters } = buildListingOrderComponents(
      {
        nftAddress: NFT_ADDRESS,
        tokenId: "1",
        priceWei: BigInt("1000000000000000000"),
        offerer: OFFERER,
      },
      8453, // Base Mainnet, 0% fee
      BigInt(0)
    );

    // Only one consideration item (no fee)
    expect(orderParameters.consideration).toHaveLength(1);
    expect(orderParameters.consideration[0].startAmount).toBe(BigInt("1000000000000000000"));
    expect(orderParameters.totalOriginalConsiderationItems).toBe(BigInt(1));
  });

  it("builds a private order with targetFulfiller", () => {
    const target = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;
    const { orderParameters } = buildListingOrderComponents(
      {
        nftAddress: NFT_ADDRESS,
        tokenId: "42",
        priceWei: BigInt("1000000000000000000"),
        offerer: OFFERER,
        targetFulfiller: target,
      },
      8453,
      BigInt(0)
    );

    expect(orderParameters.zone.toLowerCase()).toBe(NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS.toLowerCase());
    expect(orderParameters.zoneHash).toBe(
      "0x5ab9a75647463db7d9263bfdf0f9b455fd5a2ff89f446d3dfa3dfe67cae5649d"
    );
  });
});

describe("buildCollectionOfferOrderComponents", () => {
  it("builds a collection offer with WETH and criteria type", () => {
    const { orderParameters } = buildCollectionOfferOrderComponents(
      {
        nftAddress: NFT_ADDRESS,
        priceWei: BigInt("500000000000000000"),
        offerer: OFFERER,
      },
      8453, // Base, 0% fee
      BigInt(5)
    );

    expect(orderParameters.zone.toLowerCase()).toBe(
      NET_SEAPORT_COLLECTION_OFFER_ZONE_ADDRESS.toLowerCase()
    );

    // Offer: WETH
    expect(orderParameters.offer).toHaveLength(1);
    expect(orderParameters.offer[0].itemType).toBe(ItemType.ERC20);
    expect(orderParameters.offer[0].startAmount).toBe(BigInt("500000000000000000"));

    // Consideration: ERC721_WITH_CRITERIA (any token)
    expect(orderParameters.consideration).toHaveLength(1);
    expect(orderParameters.consideration[0].itemType).toBe(ItemType.ERC721_WITH_CRITERIA);
    expect(orderParameters.consideration[0].identifierOrCriteria).toBe(BigInt(0));
    expect(orderParameters.consideration[0].recipient).toBe(OFFERER);
  });
});

describe("buildErc20OfferOrderComponents", () => {
  it("builds an ERC20 offer", () => {
    const { orderParameters } = buildErc20OfferOrderComponents(
      {
        tokenAddress: TOKEN_ADDRESS,
        tokenAmount: BigInt("1000000"),
        priceWei: BigInt("500000000000000000"),
        offerer: OFFERER,
      },
      8453,
      BigInt(0)
    );

    // Offer: WETH
    expect(orderParameters.offer[0].itemType).toBe(ItemType.ERC20);

    // Consideration: ERC20 tokens
    expect(orderParameters.consideration[0].itemType).toBe(ItemType.ERC20);
    expect(orderParameters.consideration[0].token).toBe(TOKEN_ADDRESS);
    expect(orderParameters.consideration[0].startAmount).toBe(BigInt("1000000"));
  });
});

describe("buildErc20ListingOrderComponents", () => {
  it("builds an ERC20 listing with fee (chain 84532, 5%)", () => {
    const { orderParameters } = buildErc20ListingOrderComponents(
      {
        tokenAddress: TOKEN_ADDRESS,
        tokenAmount: BigInt("1000000"),
        priceWei: BigInt("1000000000000000000"),
        offerer: OFFERER,
      },
      84532,
      BigInt(0)
    );

    // Offer: ERC20 tokens
    expect(orderParameters.offer[0].itemType).toBe(ItemType.ERC20);
    expect(orderParameters.offer[0].token).toBe(TOKEN_ADDRESS);

    // Consideration: native payment + fee (ceiling division for ERC20s)
    expect(orderParameters.consideration).toHaveLength(2);
    expect(orderParameters.consideration[0].itemType).toBe(ItemType.NATIVE);

    const sellerAmount = orderParameters.consideration[0].startAmount;
    const feeAmount = orderParameters.consideration[1].startAmount;
    // Fee = ceiling(1e18 * 500 / 10000) = 50000000000000000
    expect(feeAmount).toBe(BigInt("50000000000000000"));
    expect(sellerAmount + feeAmount).toBe(BigInt("1000000000000000000"));
  });

  it("supports private orders", () => {
    const target = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;
    const { orderParameters } = buildErc20ListingOrderComponents(
      {
        tokenAddress: TOKEN_ADDRESS,
        tokenAmount: BigInt("1000000"),
        priceWei: BigInt("1000000000000000000"),
        offerer: OFFERER,
        targetFulfiller: target,
      },
      8453,
      BigInt(0)
    );

    expect(orderParameters.zone.toLowerCase()).toBe(NET_SEAPORT_PRIVATE_ORDER_ZONE_ADDRESS.toLowerCase());
  });
});

describe("buildEIP712OrderData", () => {
  it("builds correct EIP-712 domain and message structure", () => {
    const { orderParameters } = buildListingOrderComponents(
      {
        nftAddress: NFT_ADDRESS,
        tokenId: "42",
        priceWei: BigInt("1000000000000000000"),
        offerer: OFFERER,
      },
      8453,
      BigInt(7)
    );

    const eip712 = buildEIP712OrderData(orderParameters, BigInt(7), 8453, SEAPORT_ADDRESS);

    // Domain
    expect(eip712.domain.name).toBe("Seaport");
    expect(eip712.domain.version).toBe("1.6");
    expect(eip712.domain.chainId).toBe(8453);
    expect(eip712.domain.verifyingContract).toBe(SEAPORT_ADDRESS);

    // Types
    expect(eip712.types).toHaveProperty("OrderComponents");
    expect(eip712.types).toHaveProperty("OfferItem");
    expect(eip712.types).toHaveProperty("ConsiderationItem");

    // Message has counter, NOT totalOriginalConsiderationItems
    expect(eip712.message).toHaveProperty("counter");
    expect(eip712.message.counter).toBe(BigInt(7));
    expect(eip712.message).not.toHaveProperty("totalOriginalConsiderationItems");

    // OrderParameters preserved for submission
    expect(eip712.orderParameters).toBe(orderParameters);
    expect(eip712.counter).toBe(BigInt(7));
    expect(eip712.primaryType).toBe("OrderComponents");
  });
});

describe("buildSubmitOrderTx", () => {
  it("builds a submit tx for NFT listing", () => {
    const { orderParameters } = buildListingOrderComponents(
      {
        nftAddress: NFT_ADDRESS,
        tokenId: "42",
        priceWei: BigInt("1000000000000000000"),
        offerer: OFFERER,
      },
      8453,
      BigInt(0)
    );

    const bazaarAddress = "0x000000058f3ade587388daf827174d0e6fc97595" as `0x${string}`;
    const signature = "0xdeadbeef" as `0x${string}`;
    const tx = buildSubmitOrderTx(bazaarAddress, BAZAAR_V2_ABI, orderParameters, BigInt(0), signature);

    expect(tx.to).toBe(bazaarAddress);
    expect(tx.functionName).toBe("submit");
    expect(tx.abi).toBe(BAZAAR_V2_ABI);

    // Verify submission structure
    const submission = tx.args[0] as any;
    expect(submission.parameters.offerer).toBe(OFFERER);
    expect(submission.counter).toBe(BigInt(0));
    expect(submission.signature).toBe(signature);
  });
});
