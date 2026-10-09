import { describe, it, expect } from "vitest";
import {
  concat,
  createPublicClient,
  custom,
  encodeAbiParameters,
  keccak256,
  parseSignature,
  serializeCompactSignature,
  signatureToCompactSignature,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { BAZAAR_SUBMISSION_ABI } from "../abis";
import {
  filterOrdersWithValidSignatures,
  getSeaportOrderDigest,
  isOrderSignatureValid,
} from "../utils/signature";

const ROBINHOOD = 4663;
const ORDER_HASH =
  "0x1111111111111111111111111111111111111111111111111111111111111111";

function encodeSubmission(signature: `0x${string}`): `0x${string}` {
  return encodeAbiParameters(BAZAAR_SUBMISSION_ABI, [
    {
      parameters: {
        offerer: "0x0000000000000000000000000000000000000001",
        zone: "0x0000000000000000000000000000000000000000",
        offer: [],
        consideration: [],
        orderType: 0,
        startTime: BigInt(0),
        endTime: BigInt(0),
        zoneHash: `0x${"00".repeat(32)}`,
        salt: BigInt(0),
        conduitKey: `0x${"00".repeat(32)}`,
        totalOriginalConsiderationItems: BigInt(0),
      },
      counter: BigInt(0),
      signature,
    },
  ]);
}

async function signedOrder(
  signerKey: `0x${string}`,
  maker?: `0x${string}`,
  compact = false
) {
  const signer = privateKeyToAccount(signerKey);
  const signature = await signer.sign({
    hash: getSeaportOrderDigest(ROBINHOOD, ORDER_HASH),
  });
  return {
    maker: maker ?? signer.address,
    orderHash: ORDER_HASH,
    messageData: encodeSubmission(
      compact
        ? serializeCompactSignature(
            signatureToCompactSignature(parseSignature(signature))
          )
        : signature
    ),
  };
}

/** A client whose eth_call either returns `result` or reverts. */
function clientForEthCall(result: `0x${string}` | "revert") {
  let calls = 0;
  const client = createPublicClient({
    transport: custom({
      async request({ method }) {
        if (method !== "eth_call") throw new Error(`unexpected ${method}`);
        calls++;
        if (result === "revert") throw new Error("execution reverted");
        return result;
      },
    }),
  });
  return { client, calls: () => calls };
}

const MAGIC_VALUE_RESULT = `0x1626ba7e${"00".repeat(28)}` as const;

describe("isOrderSignatureValid", () => {
  it("accepts a signature from the maker without an RPC call", async () => {
    const { client, calls } = clientForEthCall("revert");
    const order = await signedOrder(generatePrivateKey());

    expect(await isOrderSignatureValid(client, ROBINHOOD, order)).toBe(true);
    expect(calls()).toBe(0);
  });

  it("accepts a compact (EIP-2098) signature from the maker", async () => {
    const { client, calls } = clientForEthCall("revert");
    const order = await signedOrder(generatePrivateKey(), undefined, true);

    expect(await isOrderSignatureValid(client, ROBINHOOD, order)).toBe(true);
    expect(calls()).toBe(0);
  });

  it("rejects a signature from another key when the maker has no ERC-1271", async () => {
    const maker = privateKeyToAccount(generatePrivateKey()).address;
    const order = await signedOrder(generatePrivateKey(), maker);
    const { client } = clientForEthCall("revert");

    expect(await isOrderSignatureValid(client, ROBINHOOD, order)).toBe(false);
  });

  it("accepts a signature the maker's contract approves through ERC-1271", async () => {
    const order = await signedOrder(
      generatePrivateKey(),
      "0x00000000000000000000000000000000000000aa"
    );
    const { client } = clientForEthCall(MAGIC_VALUE_RESULT);

    expect(await isOrderSignatureValid(client, ROBINHOOD, order)).toBe(true);
  });
});

describe("filterOrdersWithValidSignatures", () => {
  it("keeps a genuine order when a junk-signed copy shares its hash", async () => {
    const genuine = await signedOrder(generatePrivateKey());
    const junk = await signedOrder(generatePrivateKey(), genuine.maker);
    const { client } = clientForEthCall("revert");

    const kept = await filterOrdersWithValidSignatures(client, ROBINHOOD, [
      junk,
      genuine,
    ]);
    expect(kept).toEqual([genuine]);
  });
});

describe("getSeaportOrderDigest", () => {
  it("uses Seaport 1.6's domain on Robinhood Chain", () => {
    // Domain separator read from Seaport's information() on chain 4663.
    const domainSeparator =
      "0xa6b20d2b6f71c703cd333de0c921d303988fb481ff2982df74a21e19af3730b0";
    expect(getSeaportOrderDigest(ROBINHOOD, ORDER_HASH)).toBe(
      keccak256(concat(["0x1901", domainSeparator, ORDER_HASH]))
    );
  });
});
