import { describe, it, expect } from "vitest";
import { encodeAbiParameters } from "viem";
import { BAZAAR_SUBMISSION_ABI } from "../abis";
import { ItemType, OrderType, SeaportSubmission } from "../types";
import {
  buildFulfillListingTx,
  buildFulfillCollectionOfferTx,
  buildFulfillErc20OfferTx,
  buildFulfillErc20ListingTx,
} from "../utils/fulfillment";
import { decodeSeaportSubmission } from "../utils/seaport";

const SEAPORT_ADDRESS = "0x0000000000000068F116a894984e2DB1123eB395" as `0x${string}`;
const OFFERER = "0x1234567890123456789012345678901234567890" as `0x${string}`;
const FULFILLER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;
const NFT_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`;
const TOKEN_ADDRESS = "0xcccccccccccccccccccccccccccccccccccccccc" as `0x${string}`;
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006" as `0x${string}`;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
const FEE_COLLECTOR = "0x32D16C15410248bef498D7aF50D10Db1a546b9E5" as `0x${string}`;

function createSubmission(overrides: Partial<{
  offer: any[];
  consideration: any[];
  zone: `0x${string}`;
}>): SeaportSubmission {
  return {
    parameters: {
      offerer: OFFERER,
      zone: overrides.zone ?? ("0x000000007F8c58fbf215bF91Bda7421A806cf3ae" as `0x${string}`),
      offer: overrides.offer ?? [
        {
          itemType: ItemType.ERC721,
          token: NFT_ADDRESS,
          identifierOrCriteria: BigInt(42),
          startAmount: BigInt(1),
          endAmount: BigInt(1),
        },
      ],
      consideration: overrides.consideration ?? [
        {
          itemType: ItemType.NATIVE,
          token: ZERO_ADDRESS,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt("1000000000000000000"),
          endAmount: BigInt("1000000000000000000"),
          recipient: OFFERER,
        },
      ],
      orderType: OrderType.FULL_RESTRICTED,
      startTime: BigInt(0),
      endTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
      zoneHash: ZERO_BYTES32,
      salt: BigInt(12345),
      conduitKey: ZERO_BYTES32,
      totalOriginalConsiderationItems: BigInt(overrides.consideration?.length ?? 1),
    },
    counter: BigInt(0),
    signature: "0xabcdef" as `0x${string}`,
  };
}

describe("buildFulfillListingTx", () => {
  it("builds a fulfillOrder tx with native value for NFT listing", () => {
    const submission = createSubmission({});
    const tx = buildFulfillListingTx(submission, SEAPORT_ADDRESS);

    expect(tx.to).toBe(SEAPORT_ADDRESS);
    expect(tx.functionName).toBe("fulfillOrder");
    expect(tx.value).toBe(BigInt("1000000000000000000"));
    expect(tx.args).toHaveLength(2);
  });

  it("sums multiple native consideration items", () => {
    const submission = createSubmission({
      consideration: [
        {
          itemType: ItemType.NATIVE,
          token: ZERO_ADDRESS,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt("950000000000000000"),
          endAmount: BigInt("950000000000000000"),
          recipient: OFFERER,
        },
        {
          itemType: ItemType.NATIVE,
          token: ZERO_ADDRESS,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt("50000000000000000"),
          endAmount: BigInt("50000000000000000"),
          recipient: FEE_COLLECTOR,
        },
      ],
    });

    const tx = buildFulfillListingTx(submission, SEAPORT_ADDRESS);
    expect(tx.value).toBe(BigInt("1000000000000000000"));
  });
});

describe("buildFulfillCollectionOfferTx", () => {
  it("builds a fulfillAdvancedOrder tx with criteria resolver", () => {
    const submission = createSubmission({
      zone: "0x000000B799ec6D7aCC1B578f62bFc324c25DFC5A" as `0x${string}`,
      offer: [
        {
          itemType: ItemType.ERC20,
          token: WETH_ADDRESS,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt("1000000000000000000"),
          endAmount: BigInt("1000000000000000000"),
        },
      ],
      consideration: [
        {
          itemType: ItemType.ERC721_WITH_CRITERIA,
          token: NFT_ADDRESS,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt(1),
          endAmount: BigInt(1),
          recipient: OFFERER,
        },
      ],
    });

    const tx = buildFulfillCollectionOfferTx(
      submission,
      BigInt(42),
      FULFILLER,
      SEAPORT_ADDRESS
    );

    expect(tx.to).toBe(SEAPORT_ADDRESS);
    expect(tx.functionName).toBe("fulfillAdvancedOrder");
    expect(tx.value).toBe(BigInt(0));

    // Check criteria resolver is present
    const criteriaResolvers = tx.args[1] as any[];
    expect(criteriaResolvers).toHaveLength(1);
    expect(criteriaResolvers[0].side).toBe(1); // Consideration side
    expect(criteriaResolvers[0].identifier).toBe(BigInt(42));

    // Check recipient
    expect(tx.args[3]).toBe(FULFILLER);
  });
});

describe("buildFulfillErc20OfferTx", () => {
  it("builds a fulfillOrder tx with value=0 for ERC20 offer", () => {
    const submission = createSubmission({
      zone: "0x000000B799ec6D7aCC1B578f62bFc324c25DFC5A" as `0x${string}`,
      offer: [
        {
          itemType: ItemType.ERC20,
          token: WETH_ADDRESS,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt("1000000000000000000"),
          endAmount: BigInt("1000000000000000000"),
        },
      ],
      consideration: [
        {
          itemType: ItemType.ERC20,
          token: TOKEN_ADDRESS,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt("1000000"),
          endAmount: BigInt("1000000"),
          recipient: OFFERER,
        },
      ],
    });

    const tx = buildFulfillErc20OfferTx(submission, SEAPORT_ADDRESS);

    expect(tx.to).toBe(SEAPORT_ADDRESS);
    expect(tx.functionName).toBe("fulfillOrder");
    expect(tx.value).toBe(BigInt(0));
  });
});

describe("buildFulfillErc20ListingTx", () => {
  it("builds a fulfillOrder tx with native value for ERC20 listing", () => {
    const submission = createSubmission({
      offer: [
        {
          itemType: ItemType.ERC20,
          token: TOKEN_ADDRESS,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt("1000000"),
          endAmount: BigInt("1000000"),
        },
      ],
      consideration: [
        {
          itemType: ItemType.NATIVE,
          token: ZERO_ADDRESS,
          identifierOrCriteria: BigInt(0),
          startAmount: BigInt("500000000000000000"),
          endAmount: BigInt("500000000000000000"),
          recipient: OFFERER,
        },
      ],
    });

    const tx = buildFulfillErc20ListingTx(submission, SEAPORT_ADDRESS);

    expect(tx.to).toBe(SEAPORT_ADDRESS);
    expect(tx.functionName).toBe("fulfillOrder");
    expect(tx.value).toBe(BigInt("500000000000000000"));
  });
});

describe("fulfillment roundtrip with encoded data", () => {
  it("decodes encoded submission and builds fulfillment tx", () => {
    const rawSubmission = {
      parameters: {
        offerer: OFFERER,
        zone: "0x000000007F8c58fbf215bF91Bda7421A806cf3ae" as `0x${string}`,
        offer: [
          {
            itemType: ItemType.ERC721,
            token: NFT_ADDRESS,
            identifierOrCriteria: BigInt(42),
            startAmount: BigInt(1),
            endAmount: BigInt(1),
          },
        ],
        consideration: [
          {
            itemType: ItemType.NATIVE,
            token: ZERO_ADDRESS,
            identifierOrCriteria: BigInt(0),
            startAmount: BigInt("1000000000000000000"),
            endAmount: BigInt("1000000000000000000"),
            recipient: OFFERER,
          },
        ],
        orderType: OrderType.FULL_RESTRICTED,
        startTime: BigInt(0),
        endTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
        zoneHash: ZERO_BYTES32,
        salt: BigInt(12345),
        conduitKey: ZERO_BYTES32,
        totalOriginalConsiderationItems: BigInt(1),
      },
      counter: BigInt(0),
      signature: "0x1234" as `0x${string}`,
    };

    // Encode and decode
    const encoded = encodeAbiParameters(BAZAAR_SUBMISSION_ABI, [rawSubmission]);
    const decoded = decodeSeaportSubmission(encoded);

    // Build fulfillment from decoded data
    const tx = buildFulfillListingTx(decoded, SEAPORT_ADDRESS);

    expect(tx.functionName).toBe("fulfillOrder");
    expect(tx.value).toBe(BigInt("1000000000000000000"));
    expect(tx.to).toBe(SEAPORT_ADDRESS);
  });
});
