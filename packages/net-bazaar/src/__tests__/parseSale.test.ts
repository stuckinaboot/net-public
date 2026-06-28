import { describe, it, expect } from "vitest";
import { encodeAbiParameters, getAddress } from "viem";
import { parseSaleFromStoredData, sortSalesByTimestamp } from "../utils/parsing";
import { ItemType, Sale } from "../types";

// Use checksummed addresses (viem requires valid checksums for encodeAbiParameters)
const OFFERER = getAddress("0x1234567890123456789012345678901234567890");
const FULFILLER = getAddress("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
const NFT_ADDRESS = getAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
const FEE_RECIPIENT = getAddress("0x2222222222222222222222222222222222222222");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

// ABI matching what the zone contract stores
const ZONE_STORED_SALE_ABI = [
  { type: "uint256" }, // timestamp
  { type: "uint256" }, // netTotalMessageLength
  { type: "uint256" }, // netTotalMessageForAppTopicLength
  {
    name: "zoneParameters",
    type: "tuple",
    components: [
      { name: "orderHash", type: "bytes32" },
      { name: "fulfiller", type: "address" },
      { name: "offerer", type: "address" },
      {
        name: "offer",
        type: "tuple[]",
        components: [
          { name: "itemType", type: "uint8" },
          { name: "token", type: "address" },
          { name: "identifier", type: "uint256" },
          { name: "amount", type: "uint256" },
        ],
      },
      {
        name: "consideration",
        type: "tuple[]",
        components: [
          { name: "itemType", type: "uint8" },
          { name: "token", type: "address" },
          { name: "identifier", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "recipient", type: "address" },
        ],
      },
      { name: "extraData", type: "bytes" },
      { name: "orderHashes", type: "bytes32[]" },
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "zoneHash", type: "bytes32" },
    ],
  },
] as const;

const ORDER_HASH = "0x1111111111111111111111111111111111111111111111111111111111111111" as `0x${string}`;
const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

function createMockStoredSaleData({
  timestamp = BigInt(1700000000),
  orderHash = ORDER_HASH,
  fulfiller = FULFILLER,
  offerer = OFFERER,
  nftAddress = NFT_ADDRESS,
  tokenId = BigInt(42),
  amount = BigInt(1),
  itemType = ItemType.ERC721 as number,
  considerationAmount = BigInt("1000000000000000000"), // 1 ETH
  considerationItemType = 0 as number, // NATIVE by default
  considerationToken = ZERO_ADDRESS as `0x${string}`,
}: {
  timestamp?: bigint;
  orderHash?: `0x${string}`;
  fulfiller?: `0x${string}`;
  offerer?: `0x${string}`;
  nftAddress?: `0x${string}`;
  tokenId?: bigint;
  amount?: bigint;
  itemType?: number;
  considerationAmount?: bigint;
  considerationItemType?: number;
  considerationToken?: `0x${string}`;
} = {}): `0x${string}` {
  return encodeAbiParameters(ZONE_STORED_SALE_ABI, [
    timestamp,
    BigInt(100), // netTotalMessageLength
    BigInt(10), // netTotalMessageForAppTopicLength
    {
      orderHash,
      fulfiller,
      offerer,
      offer: [
        {
          itemType,
          token: nftAddress,
          identifier: tokenId,
          amount,
        },
      ],
      consideration: [
        {
          itemType: considerationItemType,
          token: considerationToken,
          identifier: BigInt(0),
          amount: considerationAmount,
          recipient: offerer,
        },
      ],
      extraData: "0x",
      orderHashes: [orderHash],
      startTime: BigInt(0),
      endTime: BigInt(1700086400),
      zoneHash: ZERO_HASH,
    },
  ]);
}

describe("parseSaleFromStoredData", () => {
  it("parses a basic ERC721 sale", () => {
    const data = createMockStoredSaleData();
    const sale = parseSaleFromStoredData(data, 8453);

    expect(sale).not.toBeNull();
    expect(sale!.seller.toLowerCase()).toBe(OFFERER.toLowerCase());
    expect(sale!.buyer.toLowerCase()).toBe(FULFILLER.toLowerCase());
    expect(sale!.tokenAddress.toLowerCase()).toBe(NFT_ADDRESS.toLowerCase());
    expect(sale!.tokenId).toBe("42");
    expect(sale!.amount).toBe(BigInt(1));
    expect(sale!.itemType).toBe(ItemType.ERC721);
    expect(sale!.priceWei).toBe(BigInt("1000000000000000000"));
    expect(sale!.price).toBe(1);
    expect(sale!.currency).toBe("eth");
    expect(sale!.timestamp).toBe(1700000000);
    expect(sale!.orderHash).toBe(ORDER_HASH);
  });

  it("parses an ERC20 sale with custom amount in USDC on Base", () => {
    // Base's ERC20 bazaar pays sellers in USDC, so the on-chain
    // consideration is an ERC20 item pointing at USDC (6 decimals).
    // The parser should pick up the payment token from the consideration
    // side and format price using USDC's decimals + symbol.
    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`;
    const data = createMockStoredSaleData({
      itemType: ItemType.ERC20,
      amount: BigInt("500000000000000000000"), // 500 tokens
      considerationItemType: ItemType.ERC20,
      considerationToken: USDC,
      considerationAmount: BigInt("2000000"), // 2 USDC
    });
    const sale = parseSaleFromStoredData(data, 8453);

    expect(sale).not.toBeNull();
    expect(sale!.itemType).toBe(ItemType.ERC20);
    expect(sale!.amount).toBe(BigInt("500000000000000000000"));
    expect(sale!.priceWei).toBe(BigInt("2000000"));
    expect(sale!.price).toBe(2);
    expect(sale!.currency).toBe("usdc");
  });

  it("does NOT format a non-quote-token ERC20 consideration with the quote token's decimals", () => {
    // Regression for a real bug observed on the live bazaar:
    //
    // Legacy ERC20 listings on Base (created before the USDC migration)
    // had a WETH item in consideration[0]. When parsed by the previous
    // implementation, the parser saw `consideration[0].itemType === ERC20`,
    // assumed the trade was USDC-paying, and formatted the WETH base units
    // (18 decimals) using USDC's 6 decimals — inflating a $0.0035 fair
    // trade into a "$994,764 USDC" display, off by 10^12.
    //
    // Now: an ERC20 payment whose token is NOT the chain's configured
    // quote token (USDC) should fall back to wrapped-native semantics
    // (18 decimals, "WETH" symbol).
    const WETH_BASE = "0x4200000000000000000000000000000000000006" as `0x${string}`;
    const data = createMockStoredSaleData({
      itemType: ItemType.ERC20,
      amount: BigInt("1111000000000000000000"), // 1,111 ALPHA (18 decimals)
      considerationItemType: ItemType.ERC20,
      considerationToken: WETH_BASE,
      // 9.94e11 WETH base units ≈ 9.94e-7 WETH ≈ $0.0035 at $3500/ETH
      considerationAmount: BigInt("994764506934"),
    });
    const sale = parseSaleFromStoredData(data, 8453);

    expect(sale).not.toBeNull();
    expect(sale!.priceWei).toBe(BigInt("994764506934"));
    // Formatted with WETH's 18 decimals, not USDC's 6 decimals.
    expect(sale!.price).toBeCloseTo(9.94764506934e-7, 18);
    expect(sale!.currency).toBe("weth");
  });

  it("uses correct currency symbol for chain", () => {
    const data = createMockStoredSaleData();
    const sale = parseSaleFromStoredData(data, 666666666); // Degen chain

    expect(sale).not.toBeNull();
    expect(sale!.currency).toBe("degen");
  });

  it("sums multiple consideration items", () => {
    const data = encodeAbiParameters(ZONE_STORED_SALE_ABI, [
      BigInt(1700000000),
      BigInt(100),
      BigInt(10),
      {
        orderHash: ORDER_HASH,
        fulfiller: FULFILLER,
        offerer: OFFERER,
        offer: [
          {
            itemType: ItemType.ERC721,
            token: NFT_ADDRESS,
            identifier: BigInt(42),
            amount: BigInt(1),
          },
        ],
        consideration: [
          {
            itemType: 0,
            token: ZERO_ADDRESS,
            identifier: BigInt(0),
            amount: BigInt("750000000000000000"), // 0.75 ETH
            recipient: OFFERER,
          },
          {
            itemType: 0,
            token: ZERO_ADDRESS,
            identifier: BigInt(0),
            amount: BigInt("250000000000000000"), // 0.25 ETH fee
            recipient: FEE_RECIPIENT,
          },
        ],
        extraData: "0x",
        orderHashes: [ORDER_HASH],
        startTime: BigInt(0),
        endTime: BigInt(1700086400),
        zoneHash: ZERO_HASH,
      },
    ]);

    const sale = parseSaleFromStoredData(data, 8453);
    expect(sale).not.toBeNull();
    // 0.75 + 0.25 = 1.0 ETH total
    expect(sale!.priceWei).toBe(BigInt("1000000000000000000"));
    expect(sale!.price).toBe(1);
  });

  it("returns null for invalid data", () => {
    const sale = parseSaleFromStoredData("0xdeadbeef", 8453);
    expect(sale).toBeNull();
  });

  it("returns null for empty data", () => {
    const sale = parseSaleFromStoredData("0x", 8453);
    expect(sale).toBeNull();
  });
});

describe("sortSalesByTimestamp", () => {
  it("sorts by most recent first", () => {
    const sales: Sale[] = [
      {
        seller: OFFERER,
        buyer: FULFILLER,
        tokenAddress: NFT_ADDRESS,
        tokenId: "1",
        amount: BigInt(1),
        itemType: ItemType.ERC721,
        priceWei: BigInt("1000000000000000000"),
        price: 1,
        currency: "eth",
        timestamp: 1000,
        orderHash: "0xaaa",
      },
      {
        seller: OFFERER,
        buyer: FULFILLER,
        tokenAddress: NFT_ADDRESS,
        tokenId: "2",
        amount: BigInt(1),
        itemType: ItemType.ERC721,
        priceWei: BigInt("2000000000000000000"),
        price: 2,
        currency: "eth",
        timestamp: 3000,
        orderHash: "0xbbb",
      },
      {
        seller: OFFERER,
        buyer: FULFILLER,
        tokenAddress: NFT_ADDRESS,
        tokenId: "3",
        amount: BigInt(1),
        itemType: ItemType.ERC721,
        priceWei: BigInt("500000000000000000"),
        price: 0.5,
        currency: "eth",
        timestamp: 2000,
        orderHash: "0xccc",
      },
    ];

    const sorted = sortSalesByTimestamp(sales);
    expect(sorted[0].timestamp).toBe(3000);
    expect(sorted[1].timestamp).toBe(2000);
    expect(sorted[2].timestamp).toBe(1000);
  });

  it("does not mutate the original array", () => {
    const sales: Sale[] = [
      {
        seller: OFFERER,
        buyer: FULFILLER,
        tokenAddress: NFT_ADDRESS,
        tokenId: "1",
        amount: BigInt(1),
        itemType: ItemType.ERC721,
        priceWei: BigInt("1000000000000000000"),
        price: 1,
        currency: "eth",
        timestamp: 1000,
        orderHash: "0xaaa",
      },
      {
        seller: OFFERER,
        buyer: FULFILLER,
        tokenAddress: NFT_ADDRESS,
        tokenId: "2",
        amount: BigInt(1),
        itemType: ItemType.ERC721,
        priceWei: BigInt("2000000000000000000"),
        price: 2,
        currency: "eth",
        timestamp: 3000,
        orderHash: "0xbbb",
      },
    ];

    const sorted = sortSalesByTimestamp(sales);
    expect(sorted).not.toBe(sales);
    expect(sales[0].timestamp).toBe(1000); // Original unchanged
  });
});
