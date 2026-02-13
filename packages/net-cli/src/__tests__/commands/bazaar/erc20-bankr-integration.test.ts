/**
 * Real integration tests for ERC20 bazaar commands + Bankr API.
 *
 * These tests hit the actual Bankr API and Base chain — no mocks.
 * Skipped automatically when BANKR_API_KEY env var is not set or the
 * Bankr API is unreachable.
 *
 * Required env:
 *   BANKR_API_KEY  – Bankr agent API key (starts with bk_)
 *
 * Optional env:
 *   TEST_ERC20_TOKEN  – ERC20 token address on Base to use (default: USDC)
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
        tokenAmount: BigInt(1), // smallest possible amount
        priceWei: BigInt("100000000000000"), // 0.0001 ETH
        offerer: walletAddress,
      });

      // EIP-712 data comes back with BigInt values — Bankr needs JSON-safe strings
      const signResult = await bankrSign({
        signatureType: "eth_signTypedData_v4",
        typedData: toJsonSafe({
          domain: prepared.eip712.domain,
          types: prepared.eip712.types,
          primaryType: prepared.eip712.primaryType,
          message: prepared.eip712.message,
        }),
      });

      expect(signResult.success).toBe(true);
      expect(signResult.signature).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(signResult.signer.toLowerCase()).toBe(
        walletAddress.toLowerCase()
      );
    }, 60_000);

    // ── 3. Full on-chain listing flow ────────────────────────────────

    it("should create, sign, and submit an ERC20 listing on-chain", async ({
      skip,
    }) => {
      if (!canReachBankr) skip();

      const bazaarClient = new BazaarClient({ chainId: CHAIN_ID });

      // Step 1 — prepare the listing (reads allowance from chain)
      const prepared = await bazaarClient.prepareCreateErc20Listing({
        tokenAddress: TOKEN_ADDRESS,
        tokenAmount: BigInt(1),
        priceWei: BigInt("100000000000000"), // 0.0001 ETH
        offerer: walletAddress,
      });

      // Step 2 — submit approval txs if needed
      for (const approval of prepared.approvals) {
        const calldata = encodeFunctionData({
          abi: approval.abi,
          functionName: approval.functionName,
          args: approval.args,
        });

        const approvalResult = await bankrSubmit({
          transaction: {
            to: approval.to,
            chainId: CHAIN_ID,
            value: (approval.value ?? 0n).toString(),
            data: calldata,
          },
          description: `Approve ${approval.functionName} for Seaport`,
          waitForConfirmation: true,
        });

        expect(approvalResult.success).toBe(true);
        expect(approvalResult.transactionHash).toMatch(/^0x/);
      }

      // Step 3 — sign the order via Bankr
      const signResult = await bankrSign({
        signatureType: "eth_signTypedData_v4",
        typedData: toJsonSafe({
          domain: prepared.eip712.domain,
          types: prepared.eip712.types,
          primaryType: prepared.eip712.primaryType,
          message: prepared.eip712.message,
        }),
      });

      expect(signResult.success).toBe(true);
      const signature = signResult.signature as `0x${string}`;

      // Step 4 — build the on-chain submit tx (Seaport validate)
      const submitTx = bazaarClient.prepareSubmitErc20Listing(
        prepared.eip712.orderParameters,
        prepared.eip712.counter,
        signature
      );

      const submitCalldata = encodeFunctionData({
        abi: submitTx.abi,
        functionName: submitTx.functionName,
        args: submitTx.args,
      });

      // Step 5 — submit on-chain via Bankr
      const txResult = await bankrSubmit({
        transaction: {
          to: submitTx.to,
          chainId: CHAIN_ID,
          value: (submitTx.value ?? 0n).toString(),
          data: submitCalldata,
        },
        description: "Submit ERC-20 listing to Seaport",
        waitForConfirmation: true,
      });

      expect(txResult.success).toBe(true);
      expect(txResult.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(txResult.status).toBe("success");
    }, 120_000);

    // ── 4. Full on-chain offer flow ──────────────────────────────────

    it("should create, sign, and submit an ERC20 offer on-chain", async ({
      skip,
    }) => {
      if (!canReachBankr) skip();

      const bazaarClient = new BazaarClient({ chainId: CHAIN_ID });

      // Step 1 — prepare the offer (WETH offer for ERC20 tokens)
      const prepared = await bazaarClient.prepareCreateErc20Offer({
        tokenAddress: TOKEN_ADDRESS,
        tokenAmount: BigInt(1),
        priceWei: BigInt("100000000000000"), // 0.0001 ETH in WETH
        offerer: walletAddress,
      });

      // Step 2 — submit approval txs if needed (WETH approval)
      for (const approval of prepared.approvals) {
        const calldata = encodeFunctionData({
          abi: approval.abi,
          functionName: approval.functionName,
          args: approval.args,
        });

        const approvalResult = await bankrSubmit({
          transaction: {
            to: approval.to,
            chainId: CHAIN_ID,
            value: (approval.value ?? 0n).toString(),
            data: calldata,
          },
          description: `Approve ${approval.functionName} for Seaport`,
          waitForConfirmation: true,
        });

        expect(approvalResult.success).toBe(true);
      }

      // Step 3 — sign the order via Bankr
      const signResult = await bankrSign({
        signatureType: "eth_signTypedData_v4",
        typedData: toJsonSafe({
          domain: prepared.eip712.domain,
          types: prepared.eip712.types,
          primaryType: prepared.eip712.primaryType,
          message: prepared.eip712.message,
        }),
      });

      expect(signResult.success).toBe(true);
      const signature = signResult.signature as `0x${string}`;

      // Step 4 — build submit tx
      const submitTx = bazaarClient.prepareSubmitErc20Offer(
        prepared.eip712.orderParameters,
        prepared.eip712.counter,
        signature
      );

      const submitCalldata = encodeFunctionData({
        abi: submitTx.abi,
        functionName: submitTx.functionName,
        args: submitTx.args,
      });

      // Step 5 — submit on-chain via Bankr
      const txResult = await bankrSubmit({
        transaction: {
          to: submitTx.to,
          chainId: CHAIN_ID,
          value: (submitTx.value ?? 0n).toString(),
          data: submitCalldata,
        },
        description: "Submit ERC-20 offer to Seaport",
        waitForConfirmation: true,
      });

      expect(txResult.success).toBe(true);
      expect(txResult.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(txResult.status).toBe("success");
    }, 120_000);

    // ── 5. Verify BazaarClient can query listings ──────────────────────

    it("should query ERC20 listings via BazaarClient without error", async ({
      skip,
    }) => {
      if (!canReachBankr) skip();

      const bazaarClient = new BazaarClient({ chainId: CHAIN_ID });

      // Verify the query itself works (no throw).
      // Note: our listing may be filtered out by BazaarClient's balance
      // check if the Bankr wallet doesn't hold enough of the token.
      // That's expected — Seaport validate succeeds regardless, but the
      // client hides unfulfillable orders.
      const listings = await bazaarClient.getErc20Listings({
        tokenAddress: TOKEN_ADDRESS,
      });

      expect(Array.isArray(listings)).toBe(true);

      // Every returned listing should have the expected shape
      for (const listing of listings) {
        expect(listing.tokenAddress.toLowerCase()).toBe(
          TOKEN_ADDRESS.toLowerCase()
        );
        expect(listing.orderHash).toMatch(/^0x/);
        expect(listing.maker).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(typeof listing.price).toBe("number");
      }
    }, 60_000);

    // ── 6. Full round-trip: create listing → query → fulfill ────────

    it("should create an ERC20 listing, query it back, and fulfill it on-chain", async ({
      skip,
    }) => {
      if (!canReachBankr) skip();

      const bazaarClient = new BazaarClient({ chainId: CHAIN_ID });

      // Use $1 USDC (6 decimals → 1_000_000) with a tiny ETH price.
      // Self-fulfillment means the wallet pays itself — net cost is just gas.
      const tokenAmount = BigInt(1_000_000); // 1 USDC
      const priceWei = BigInt("100000000000000"); // 0.0001 ETH

      // ── Step 1: Create the listing ──────────────────────────────────

      const prepared = await bazaarClient.prepareCreateErc20Listing({
        tokenAddress: TOKEN_ADDRESS,
        tokenAmount,
        priceWei,
        offerer: walletAddress,
      });

      // Submit approval txs if needed
      for (const approval of prepared.approvals) {
        const calldata = encodeFunctionData({
          abi: approval.abi,
          functionName: approval.functionName,
          args: approval.args,
        });

        const approvalResult = await bankrSubmit({
          transaction: {
            to: approval.to,
            chainId: CHAIN_ID,
            value: (approval.value ?? 0n).toString(),
            data: calldata,
          },
          description: `Approve ${approval.functionName} for Seaport`,
          waitForConfirmation: true,
        });

        expect(approvalResult.success).toBe(true);
      }

      // Sign the order
      const signResult = await bankrSign({
        signatureType: "eth_signTypedData_v4",
        typedData: toJsonSafe({
          domain: prepared.eip712.domain,
          types: prepared.eip712.types,
          primaryType: prepared.eip712.primaryType,
          message: prepared.eip712.message,
        }),
      });

      expect(signResult.success).toBe(true);
      const signature = signResult.signature as `0x${string}`;

      // Submit listing on-chain (Bazaar contract stores Net message + validates on Seaport)
      const submitTx = bazaarClient.prepareSubmitErc20Listing(
        prepared.eip712.orderParameters,
        prepared.eip712.counter,
        signature
      );

      const submitCalldata = encodeFunctionData({
        abi: submitTx.abi,
        functionName: submitTx.functionName,
        args: submitTx.args,
      });

      const listingResult = await bankrSubmit({
        transaction: {
          to: submitTx.to,
          chainId: CHAIN_ID,
          value: (submitTx.value ?? 0n).toString(),
          data: submitCalldata,
        },
        description: "Submit ERC-20 listing to Bazaar",
        waitForConfirmation: true,
      });

      expect(listingResult.success).toBe(true);
      expect(listingResult.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // ── Step 2: Query the listing back ──────────────────────────────

      const listings = await bazaarClient.getErc20Listings({
        tokenAddress: TOKEN_ADDRESS,
      });

      // Find our listing by maker address
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

      // ── Step 3: Fulfill the listing (self-fulfill) ──────────────────

      const fulfillment = await bazaarClient.prepareFulfillErc20Listing(
        ourListing,
        walletAddress
      );

      // No approvals needed — buyer pays native ETH
      expect(fulfillment.approvals).toHaveLength(0);

      const fulfillCalldata = encodeFunctionData({
        abi: fulfillment.fulfillment.abi,
        functionName: fulfillment.fulfillment.functionName,
        args: fulfillment.fulfillment.args,
      });

      const fulfillResult = await bankrSubmit({
        transaction: {
          to: fulfillment.fulfillment.to,
          chainId: CHAIN_ID,
          value: (fulfillment.fulfillment.value ?? 0n).toString(),
          data: fulfillCalldata,
        },
        description: "Fulfill ERC-20 listing (buy)",
        waitForConfirmation: true,
      });

      expect(fulfillResult.success).toBe(true);
      expect(fulfillResult.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(fulfillResult.status).toBe("success");
    }, 180_000);

    // ── 7. Full round-trip: create offer → query → accept ───────────

    it("should create an ERC20 offer, query it back, and accept it on-chain", async ({
      skip,
    }) => {
      if (!canReachBankr) skip();

      const bazaarClient = new BazaarClient({ chainId: CHAIN_ID });

      // Offer WETH for $1 USDC. Self-acceptance means the wallet sells
      // USDC to itself for WETH — net cost is just gas + approvals.
      const tokenAmount = BigInt(1_000_000); // 1 USDC
      const priceWei = BigInt("100000000000000"); // 0.0001 ETH in WETH

      // ── Step 1: Create the offer ────────────────────────────────────

      const prepared = await bazaarClient.prepareCreateErc20Offer({
        tokenAddress: TOKEN_ADDRESS,
        tokenAmount,
        priceWei,
        offerer: walletAddress,
      });

      // Submit approval txs if needed (WETH approval for Seaport)
      for (const approval of prepared.approvals) {
        const calldata = encodeFunctionData({
          abi: approval.abi,
          functionName: approval.functionName,
          args: approval.args,
        });

        const approvalResult = await bankrSubmit({
          transaction: {
            to: approval.to,
            chainId: CHAIN_ID,
            value: (approval.value ?? 0n).toString(),
            data: calldata,
          },
          description: `Approve ${approval.functionName} for Seaport`,
          waitForConfirmation: true,
        });

        expect(approvalResult.success).toBe(true);
      }

      // Sign the order
      const signResult = await bankrSign({
        signatureType: "eth_signTypedData_v4",
        typedData: toJsonSafe({
          domain: prepared.eip712.domain,
          types: prepared.eip712.types,
          primaryType: prepared.eip712.primaryType,
          message: prepared.eip712.message,
        }),
      });

      expect(signResult.success).toBe(true);
      const signature = signResult.signature as `0x${string}`;

      // Submit offer on-chain
      const submitTx = bazaarClient.prepareSubmitErc20Offer(
        prepared.eip712.orderParameters,
        prepared.eip712.counter,
        signature
      );

      const submitCalldata = encodeFunctionData({
        abi: submitTx.abi,
        functionName: submitTx.functionName,
        args: submitTx.args,
      });

      const offerResult = await bankrSubmit({
        transaction: {
          to: submitTx.to,
          chainId: CHAIN_ID,
          value: (submitTx.value ?? 0n).toString(),
          data: submitCalldata,
        },
        description: "Submit ERC-20 offer to Bazaar",
        waitForConfirmation: true,
      });

      expect(offerResult.success).toBe(true);
      expect(offerResult.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // ── Step 2: Query the offer back ────────────────────────────────

      const offers = await bazaarClient.getErc20Offers({
        tokenAddress: TOKEN_ADDRESS,
      });

      // Find our offer by maker address
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

      // ── Step 3: Accept the offer (self-fulfill) ─────────────────────

      const fulfillment = await bazaarClient.prepareFulfillErc20Offer(
        ourOffer,
        walletAddress
      );

      // Submit ERC20 approval if needed (fulfiller approves Seaport for USDC)
      for (const approval of fulfillment.approvals) {
        const calldata = encodeFunctionData({
          abi: approval.abi,
          functionName: approval.functionName,
          args: approval.args,
        });

        const approvalResult = await bankrSubmit({
          transaction: {
            to: approval.to,
            chainId: CHAIN_ID,
            value: (approval.value ?? 0n).toString(),
            data: calldata,
          },
          description: `Approve ${approval.functionName} for Seaport (fulfiller)`,
          waitForConfirmation: true,
        });

        expect(approvalResult.success).toBe(true);
      }

      const fulfillCalldata = encodeFunctionData({
        abi: fulfillment.fulfillment.abi,
        functionName: fulfillment.fulfillment.functionName,
        args: fulfillment.fulfillment.args,
      });

      const fulfillResult = await bankrSubmit({
        transaction: {
          to: fulfillment.fulfillment.to,
          chainId: CHAIN_ID,
          value: (fulfillment.fulfillment.value ?? 0n).toString(),
          data: fulfillCalldata,
        },
        description: "Accept ERC-20 offer (sell tokens)",
        waitForConfirmation: true,
      });

      expect(fulfillResult.success).toBe(true);
      expect(fulfillResult.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(fulfillResult.status).toBe("success");
    }, 180_000);
  }
);
