/**
 * Real integration tests for ERC20 bazaar commands + Bankr API.
 *
 * These tests hit the actual Bankr API and Base chain — no mocks.
 * Skipped automatically when BANKR_API_KEY env var is not set or the
 * Bankr API is unreachable.
 *
 * Tests that submit on-chain transactions (3–7) are additionally gated
 * behind TEST_ONCHAIN=true so they don't run in normal CI.
 *
 * Required env:
 *   BANKR_API_KEY   – Bankr agent API key (starts with bk_)
 *
 * Optional env:
 *   TEST_ONCHAIN    – set to "true" to enable on-chain transaction tests
 *   TEST_ERC20_TOKEN – ERC20 token address on Base to use (default: USDC)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { BazaarClient } from "@net-protocol/bazaar";
import { encodeFunctionData } from "viem";

// Configure proxy support (same pattern as CLI entry point in cli/index.ts)
const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

const BANKR_API_KEY = process.env.BANKR_API_KEY;
const BANKR_BASE_URL = "https://api.bankr.bot";
const CHAIN_ID = 8453; // Base
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const TOKEN_ADDRESS = (process.env.TEST_ERC20_TOKEN ??
  USDC_BASE) as `0x${string}`;
const TEST_ONCHAIN = process.env.TEST_ONCHAIN === "true";

// ── helpers ────────────────────────────────────────────────────────────

/** Convert BigInt values to strings so JSON.stringify works. */
function toJsonSafe(obj: unknown): unknown {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

async function bankrSign(body: object) {
  const res = await fetch(`${BANKR_BASE_URL}/agent/sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": BANKR_API_KEY!,
    },
    body: JSON.stringify(body, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    ),
  });
  return res.json();
}

async function bankrSubmit(body: object) {
  const res = await fetch(`${BANKR_BASE_URL}/agent/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": BANKR_API_KEY!,
    },
    body: JSON.stringify(body, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    ),
  });
  return res.json();
}

interface TxConfig {
  to: `0x${string}`;
  abi: unknown[];
  functionName: string;
  args: unknown[];
  value?: bigint;
}

/** Submit all approval transactions and assert each succeeds. */
async function submitApprovals(approvals: TxConfig[]) {
  for (const approval of approvals) {
    const calldata = encodeFunctionData({
      abi: approval.abi,
      functionName: approval.functionName,
      args: approval.args,
    });

    const result = await bankrSubmit({
      transaction: {
        to: approval.to,
        chainId: CHAIN_ID,
        value: (approval.value ?? 0n).toString(),
        data: calldata,
      },
      description: `Approve ${approval.functionName} for Seaport`,
      waitForConfirmation: true,
    });

    expect(result.success).toBe(true);
  }
}

/** Sign EIP-712 typed data via Bankr and return the signature. */
async function signOrder(prepared: {
  eip712: {
    domain: object;
    types: object;
    primaryType: string;
    message: object;
  };
}): Promise<`0x${string}`> {
  const result = await bankrSign({
    signatureType: "eth_signTypedData_v4",
    typedData: toJsonSafe({
      domain: prepared.eip712.domain,
      types: prepared.eip712.types,
      primaryType: prepared.eip712.primaryType,
      message: prepared.eip712.message,
    }),
  });

  expect(result.success).toBe(true);
  return result.signature as `0x${string}`;
}

/** Encode and submit an on-chain transaction via Bankr, returning the result. */
async function submitOnChain(tx: TxConfig, description: string) {
  const calldata = encodeFunctionData({
    abi: tx.abi,
    functionName: tx.functionName,
    args: tx.args,
  });

  const result = await bankrSubmit({
    transaction: {
      to: tx.to,
      chainId: CHAIN_ID,
      value: (tx.value ?? 0n).toString(),
      data: calldata,
    },
    description,
    waitForConfirmation: true,
  });

  expect(result.success).toBe(true);
  expect(result.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  return result;
}

/** Check if Bankr API is reachable. */
async function isBankrReachable(): Promise<boolean> {
  if (!BANKR_API_KEY) return false;
  try {
    const res = await fetch(`${BANKR_BASE_URL}/agent/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": BANKR_API_KEY,
      },
      body: JSON.stringify({
        signatureType: "personal_sign",
        message: "ping",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// ── pre-flight check ───────────────────────────────────────────────────

let canReachBankr = false;

beforeAll(async () => {
  canReachBankr = await isBankrReachable();
}, 15_000);

// ── tests ──────────────────────────────────────────────────────────────

describe.skipIf(!BANKR_API_KEY)(
  "ERC20 + Bankr API integration",
  () => {
    let walletAddress: `0x${string}`;

    beforeAll(async ({ skip }) => {
      if (!canReachBankr) skip();

      const result = await bankrSign({
        signatureType: "personal_sign",
        message: "get wallet address",
      });
      walletAddress = result.signer as `0x${string}`;
    }, 30_000);

    // ── 1. API connectivity ──────────────────────────────────────────

    it("should sign a personal message and return wallet address", async ({
      skip,
    }) => {
      if (!canReachBankr) skip();

      const result = await bankrSign({
        signatureType: "personal_sign",
        message: "ERC20 Bankr integration test",
      });

      expect(result.success).toBe(true);
      expect(result.signature).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(result.signer).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }, 30_000);

    // ── 2. EIP-712 signing via Bankr ─────────────────────────────────

    it("should sign EIP-712 typed data produced by BazaarClient", async ({
      skip,
    }) => {
      if (!canReachBankr) skip();

      const bazaarClient = new BazaarClient({ chainId: CHAIN_ID });

      const prepared = await bazaarClient.prepareCreateErc20Listing({
        tokenAddress: TOKEN_ADDRESS,
        tokenAmount: BigInt(1),
        priceWei: BigInt("100000000000000"), // 0.0001 ETH
        offerer: walletAddress,
      });

      const signature = await signOrder(prepared);
      expect(signature).toMatch(/^0x[a-fA-F0-9]+$/);
    }, 60_000);

    // ── 3. On-chain listing submission ───────────────────────────────

    it("should create, sign, and submit an ERC20 listing on-chain", async ({
      skip,
    }) => {
      if (!canReachBankr || !TEST_ONCHAIN) skip();

      const bazaarClient = new BazaarClient({ chainId: CHAIN_ID });

      const prepared = await bazaarClient.prepareCreateErc20Listing({
        tokenAddress: TOKEN_ADDRESS,
        tokenAmount: BigInt(1),
        priceWei: BigInt("100000000000000"),
        offerer: walletAddress,
      });

      await submitApprovals(prepared.approvals);
      const signature = await signOrder(prepared);

      const submitTx = bazaarClient.prepareSubmitErc20Listing(
        prepared.eip712.orderParameters,
        prepared.eip712.counter,
        signature
      );

      const result = await submitOnChain(submitTx, "Submit ERC-20 listing");
      expect(result.status).toBe("success");
    }, 120_000);

    // ── 4. On-chain offer submission ─────────────────────────────────

    it("should create, sign, and submit an ERC20 offer on-chain", async ({
      skip,
    }) => {
      if (!canReachBankr || !TEST_ONCHAIN) skip();

      const bazaarClient = new BazaarClient({ chainId: CHAIN_ID });

      const prepared = await bazaarClient.prepareCreateErc20Offer({
        tokenAddress: TOKEN_ADDRESS,
        tokenAmount: BigInt(1),
        priceWei: BigInt("100000000000000"),
        offerer: walletAddress,
      });

      await submitApprovals(prepared.approvals);
      const signature = await signOrder(prepared);

      const submitTx = bazaarClient.prepareSubmitErc20Offer(
        prepared.eip712.orderParameters,
        prepared.eip712.counter,
        signature
      );

      const result = await submitOnChain(submitTx, "Submit ERC-20 offer");
      expect(result.status).toBe("success");
    }, 120_000);

    // ── 5. Query listings ────────────────────────────────────────────

    it("should query ERC20 listings via BazaarClient without error", async ({
      skip,
    }) => {
      if (!canReachBankr) skip();

      const bazaarClient = new BazaarClient({ chainId: CHAIN_ID });

      const listings = await bazaarClient.getErc20Listings({
        tokenAddress: TOKEN_ADDRESS,
      });

      expect(Array.isArray(listings)).toBe(true);

      for (const listing of listings) {
        expect(listing.tokenAddress.toLowerCase()).toBe(
          TOKEN_ADDRESS.toLowerCase()
        );
        expect(listing.orderHash).toMatch(/^0x/);
        expect(listing.maker).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(typeof listing.price).toBe("number");
      }
    }, 60_000);

    // ── 6. Round-trip: listing → query → fulfill ─────────────────────

    it("should create an ERC20 listing, query it back, and fulfill it on-chain", async ({
      skip,
    }) => {
      if (!canReachBankr || !TEST_ONCHAIN) skip();

      const bazaarClient = new BazaarClient({ chainId: CHAIN_ID });
      const tokenAmount = BigInt(1_000_000); // 1 USDC
      const priceWei = BigInt("100000000000000"); // 0.0001 ETH

      // Step 1 — create listing
      const prepared = await bazaarClient.prepareCreateErc20Listing({
        tokenAddress: TOKEN_ADDRESS,
        tokenAmount,
        priceWei,
        offerer: walletAddress,
      });

      await submitApprovals(prepared.approvals);
      const signature = await signOrder(prepared);

      const submitTx = bazaarClient.prepareSubmitErc20Listing(
        prepared.eip712.orderParameters,
        prepared.eip712.counter,
        signature
      );

      await submitOnChain(submitTx, "Submit ERC-20 listing to Bazaar");

      // Step 2 — query listing back
      const listings = await bazaarClient.getErc20Listings({
        tokenAddress: TOKEN_ADDRESS,
      });

      const ourListing = listings.find(
        (l) => l.maker.toLowerCase() === walletAddress.toLowerCase()
      );

      if (!ourListing) {
        console.warn(
          "Listing not found in query results — wallet may not hold enough of the token. Skipping fulfillment."
        );
        skip();
      }

      expect(ourListing.orderHash).toMatch(/^0x/);
      expect(ourListing.tokenAddress.toLowerCase()).toBe(
        TOKEN_ADDRESS.toLowerCase()
      );

      // Step 3 — fulfill (self-fulfill)
      const fulfillment = await bazaarClient.prepareFulfillErc20Listing(
        ourListing,
        walletAddress
      );

      expect(fulfillment.approvals).toHaveLength(0);

      const result = await submitOnChain(
        fulfillment.fulfillment,
        "Fulfill ERC-20 listing (buy)"
      );
      expect(result.status).toBe("success");
    }, 180_000);

    // ── 7. Round-trip: offer → query → accept ────────────────────────

    it("should create an ERC20 offer, query it back, and accept it on-chain", async ({
      skip,
    }) => {
      if (!canReachBankr || !TEST_ONCHAIN) skip();

      const bazaarClient = new BazaarClient({ chainId: CHAIN_ID });
      const tokenAmount = BigInt(1_000_000); // 1 USDC
      const priceWei = BigInt("100000000000000"); // 0.0001 ETH in WETH

      // Step 1 — create offer
      const prepared = await bazaarClient.prepareCreateErc20Offer({
        tokenAddress: TOKEN_ADDRESS,
        tokenAmount,
        priceWei,
        offerer: walletAddress,
      });

      await submitApprovals(prepared.approvals);
      const signature = await signOrder(prepared);

      const submitTx = bazaarClient.prepareSubmitErc20Offer(
        prepared.eip712.orderParameters,
        prepared.eip712.counter,
        signature
      );

      await submitOnChain(submitTx, "Submit ERC-20 offer to Bazaar");

      // Step 2 — query offer back
      const offers = await bazaarClient.getErc20Offers({
        tokenAddress: TOKEN_ADDRESS,
      });

      const ourOffer = offers.find(
        (o) => o.maker.toLowerCase() === walletAddress.toLowerCase()
      );

      if (!ourOffer) {
        console.warn(
          "Offer not found in query results — wallet may not hold enough WETH. Skipping acceptance."
        );
        skip();
      }

      expect(ourOffer.orderHash).toMatch(/^0x/);
      expect(ourOffer.tokenAddress.toLowerCase()).toBe(
        TOKEN_ADDRESS.toLowerCase()
      );

      // Step 3 — accept (self-fulfill)
      const fulfillment = await bazaarClient.prepareFulfillErc20Offer(
        ourOffer,
        walletAddress
      );

      await submitApprovals(fulfillment.approvals);

      const result = await submitOnChain(
        fulfillment.fulfillment,
        "Accept ERC-20 offer (sell tokens)"
      );
      expect(result.status).toBe("success");
    }, 180_000);
  }
);
