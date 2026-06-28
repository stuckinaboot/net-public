import { describe, it, expect } from "vitest";
import { BazaarClient } from "../client/BazaarClient";
import {
  ItemType,
  OrderType,
  SeaportOrderStatus,
  type Erc20Offer,
  type Erc20Listing,
} from "../types";
import { getSeaportAddress } from "../chainConfig";

const CHAIN_ID = 8453; // Base
const OFFERER = "0x1234567890123456789012345678901234567890" as `0x${string}`;
const TOKEN_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`;
const WETH = "0x4200000000000000000000000000000000000006" as `0x${string}`;

function makeBaseOrderComponents() {
  return {
    offerer: OFFERER,
    zone: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    offer: [
      {
        itemType: ItemType.ERC20,
        token: WETH,
        identifierOrCriteria: BigInt(0),
        startAmount: BigInt("500000000000000000"),
        endAmount: BigInt("500000000000000000"),
      },
    ],
    consideration: [
      {
        itemType: ItemType.ERC20,
        token: TOKEN_ADDRESS,
        identifierOrCriteria: BigInt(0),
        startAmount: BigInt("1000000000000000000"),
        endAmount: BigInt("1000000000000000000"),
        recipient: OFFERER,
      },
    ],
    orderType: OrderType.FULL_RESTRICTED,
    startTime: BigInt(0),
    endTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
    zoneHash: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    salt: BigInt(42),
    conduitKey: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    totalOriginalConsiderationItems: BigInt(1),
    counter: BigInt(0),
  };
}

describe("BazaarClient.prepareCancelErc20Offer", () => {
  const client = new BazaarClient({
    chainId: CHAIN_ID,
    rpcUrl: "https://example-rpc.invalid",
  });

  it("routes through Seaport cancel with the offer's orderComponents", () => {
    const orderComponents = makeBaseOrderComponents();
    const offer: Erc20Offer = {
      maker: OFFERER,
      tokenAddress: TOKEN_ADDRESS,
      tokenAmount: BigInt("1000000000000000000"),
      priceWei: BigInt("500000000000000000"),
      pricePerTokenWei: BigInt("500000000000000000"),
      price: 0.5,
      pricePerToken: "0.5",
      currency: "eth",
      expirationDate: Number(orderComponents.endTime),
      orderHash: "0xabcd" as `0x${string}`,
      orderStatus: SeaportOrderStatus.OPEN,
      messageData: "0x" as `0x${string}`,
      orderComponents,
    };

    const tx = client.prepareCancelErc20Offer(offer);
    expect(tx.to).toBe(getSeaportAddress(CHAIN_ID));
    expect(tx.functionName).toBe("cancel");
    expect(Array.isArray(tx.args)).toBe(true);
    const [orders] = tx.args as [unknown[]];
    expect(orders).toHaveLength(1);
    expect((orders[0] as any).offerer).toBe(OFFERER);
    expect((orders[0] as any).counter).toBe(BigInt(0));
  });

  it("throws when the offer has no orderComponents", () => {
    const offer = {
      maker: OFFERER,
      tokenAddress: TOKEN_ADDRESS,
      tokenAmount: BigInt(0),
      priceWei: BigInt(0),
      pricePerTokenWei: BigInt(0),
      price: 0,
      pricePerToken: "0",
      currency: "eth",
      expirationDate: 0,
      orderHash: "0xabcd" as `0x${string}`,
      orderStatus: SeaportOrderStatus.OPEN,
      messageData: "0x" as `0x${string}`,
      // orderComponents intentionally omitted
    } as Erc20Offer;

    expect(() => client.prepareCancelErc20Offer(offer)).toThrow(
      /order components/i
    );
  });
});

describe("BazaarClient.prepareCancelErc20Listing", () => {
  const client = new BazaarClient({
    chainId: CHAIN_ID,
    rpcUrl: "https://example-rpc.invalid",
  });

  it("routes through Seaport cancel with the listing's orderComponents", () => {
    const orderComponents = makeBaseOrderComponents();
    const listing: Erc20Listing = {
      maker: OFFERER,
      tokenAddress: TOKEN_ADDRESS,
      tokenAmount: BigInt("1000000000000000000"),
      priceWei: BigInt("500000000000000000"),
      pricePerTokenWei: BigInt("500000000000000000"),
      price: 0.5,
      pricePerToken: "0.5",
      currency: "eth",
      expirationDate: Number(orderComponents.endTime),
      orderHash: "0xabcd" as `0x${string}`,
      orderStatus: SeaportOrderStatus.OPEN,
      messageData: "0x" as `0x${string}`,
      orderComponents,
    };

    const tx = client.prepareCancelErc20Listing(listing);
    expect(tx.to).toBe(getSeaportAddress(CHAIN_ID));
    expect(tx.functionName).toBe("cancel");
  });
});
