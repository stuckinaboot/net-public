import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TEST_CHAIN_ID,
  TEST_PRIVATE_KEY,
  TEST_TOKEN_ADDRESS,
  TEST_ACCOUNT_ADDRESS,
  TEST_SEAPORT_ADDRESS,
  MOCK_TX_HASH,
  MOCK_SIGNATURE,
  MOCK_ORDER_HASH,
  createMockPreparedOrder,
  createMockPreparedFulfillment,
  createMockSubmitTxConfig,
  createMockErc20Listing,
  createMockErc20Offer,
} from "./test-utils";
import type { BankrSignRequest, BankrSubmitRequest } from "./test-utils";

// Mock viem
vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    encodeFunctionData: vi.fn().mockReturnValue("0xabcdef1234567890"),
    createWalletClient: vi.fn().mockReturnValue({
      sendTransaction: vi.fn().mockResolvedValue(MOCK_TX_HASH),
      signTypedData: vi.fn().mockResolvedValue(MOCK_SIGNATURE),
    }),
    http: vi.fn().mockReturnValue({}),
    parseEther: (actual as any).parseEther,
  };
});

// Mock viem/accounts
vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn().mockReturnValue({
    address: TEST_ACCOUNT_ADDRESS,
  }),
}));

// Mock @net-protocol/bazaar
const mockPrepareCreateErc20Listing = vi.fn();
const mockPrepareCreateErc20Offer = vi.fn();
const mockPrepareSubmitErc20Listing = vi.fn();
const mockPrepareSubmitErc20Offer = vi.fn();
const mockPrepareFulfillErc20Listing = vi.fn();
const mockPrepareFulfillErc20Offer = vi.fn();
const mockGetErc20Listings = vi.fn();
const mockGetErc20Offers = vi.fn();

vi.mock("@net-protocol/bazaar", () => ({
  BazaarClient: vi.fn().mockImplementation(() => ({
    prepareCreateErc20Listing: mockPrepareCreateErc20Listing,
    prepareCreateErc20Offer: mockPrepareCreateErc20Offer,
    prepareSubmitErc20Listing: mockPrepareSubmitErc20Listing,
    prepareSubmitErc20Offer: mockPrepareSubmitErc20Offer,
    prepareFulfillErc20Listing: mockPrepareFulfillErc20Listing,
    prepareFulfillErc20Offer: mockPrepareFulfillErc20Offer,
    getErc20Listings: mockGetErc20Listings,
    getErc20Offers: mockGetErc20Offers,
  })),
}));

// Mock @net-protocol/core
vi.mock("@net-protocol/core", () => ({
  getChainRpcUrls: vi
    .fn()
    .mockReturnValue(["https://base-mainnet.public.blastapi.io"]),
}));

// Mock cli/shared
vi.mock("../../../cli/shared", () => ({
  parseCommonOptions: vi.fn().mockImplementation((opts) => ({
    privateKey: opts.privateKey || TEST_PRIVATE_KEY,
    chainId: opts.chainId || TEST_CHAIN_ID,
    rpcUrl: opts.rpcUrl,
  })),
  parseReadOnlyOptions: vi.fn().mockImplementation((opts) => ({
    chainId: opts.chainId || TEST_CHAIN_ID,
    rpcUrl: opts.rpcUrl,
  })),
}));

// Mock fs for submit commands
vi.mock("fs", () => ({
  readFileSync: vi.fn().mockReturnValue(
    JSON.stringify({
      orderParameters: {
        offerer: TEST_ACCOUNT_ADDRESS,
        zone: TEST_SEAPORT_ADDRESS,
      },
      counter: "5",
    })
  ),
}));

// Capture console.log output
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});

// Import commands after mocks
import { executeCreateErc20Listing } from "../../../commands/bazaar/create-erc20-listing";
import { executeCreateErc20Offer } from "../../../commands/bazaar/create-erc20-offer";
import { executeBuyErc20Listing } from "../../../commands/bazaar/buy-erc20-listing";
import { executeAcceptErc20Offer } from "../../../commands/bazaar/accept-erc20-offer";
import { executeSubmitErc20Listing } from "../../../commands/bazaar/submit-erc20-listing";
import { executeSubmitErc20Offer } from "../../../commands/bazaar/submit-erc20-offer";

/**
 * Validate that an object conforms to the Bankr /agent/sign request format
 * for eth_signTypedData_v4.
 */
function validateBankrSignRequest(
  eip712Output: Record<string, unknown>
): BankrSignRequest {
  const eip712 = eip712Output as {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  };

  return {
    signatureType: "eth_signTypedData_v4",
    typedData: {
      domain: eip712.domain,
      types: eip712.types,
      primaryType: eip712.primaryType,
      message: eip712.message,
    },
  };
}

/**
 * Validate that an encoded transaction object conforms to the Bankr /agent/submit
 * request format.
 */
function validateBankrSubmitRequest(
  encodedTx: { to: string; data: string; chainId: number; value: string },
  description: string
): BankrSubmitRequest {
  return {
    transaction: {
      to: encodedTx.to,
      chainId: encodedTx.chainId,
      value: encodedTx.value,
      data: encodedTx.data,
    },
    description,
    waitForConfirmation: true,
  };
}

describe("ERC20 Bazaar commands + Bankr API compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear env vars that affect keyless mode detection
    delete process.env.NET_PRIVATE_KEY;
    delete process.env.PRIVATE_KEY;
  });

  afterEach(() => {
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  describe("create-erc20-listing keyless mode → Bankr /agent/sign", () => {
    it("should output EIP-712 data compatible with Bankr sign API", async () => {
      const mockPrepared = createMockPreparedOrder();
      mockPrepareCreateErc20Listing.mockResolvedValue(mockPrepared);

      await executeCreateErc20Listing({
        tokenAddress: TEST_TOKEN_ADDRESS,
        tokenAmount: "1000000000000000000",
        price: "0.5",
        offerer: TEST_ACCOUNT_ADDRESS,
        chainId: TEST_CHAIN_ID,
      });

      // Find the JSON output call
      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonCall).toBeDefined();
      const output = JSON.parse(jsonCall![0]);

      // Verify the output has the expected EIP-712 structure
      expect(output.eip712).toBeDefined();
      expect(output.eip712.domain).toBeDefined();
      expect(output.eip712.types).toBeDefined();
      expect(output.eip712.primaryType).toBeDefined();
      expect(output.eip712.message).toBeDefined();

      // Verify EIP-712 domain matches Seaport
      expect(output.eip712.domain.name).toBe("Seaport");
      expect(output.eip712.domain.version).toBe("1.6");
      expect(output.eip712.domain.chainId).toBe(TEST_CHAIN_ID);
      expect(output.eip712.domain.verifyingContract).toBe(
        TEST_SEAPORT_ADDRESS
      );

      // Verify the typed data can be formatted for Bankr sign request
      const bankrRequest = validateBankrSignRequest(output.eip712);
      expect(bankrRequest.signatureType).toBe("eth_signTypedData_v4");
      expect(bankrRequest.typedData).toBeDefined();
      expect(bankrRequest.typedData!.domain).toEqual(output.eip712.domain);
      expect(bankrRequest.typedData!.types).toEqual(output.eip712.types);
      expect(bankrRequest.typedData!.primaryType).toBe(
        output.eip712.primaryType
      );
      expect(bankrRequest.typedData!.message).toEqual(output.eip712.message);
    });

    it("should include orderParameters and counter for subsequent submission", async () => {
      const mockPrepared = createMockPreparedOrder();
      mockPrepareCreateErc20Listing.mockResolvedValue(mockPrepared);

      await executeCreateErc20Listing({
        tokenAddress: TEST_TOKEN_ADDRESS,
        tokenAmount: "1000000000000000000",
        price: "0.5",
        offerer: TEST_ACCOUNT_ADDRESS,
        chainId: TEST_CHAIN_ID,
      });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      const output = JSON.parse(jsonCall![0]);

      // These are needed to call submit-erc20-listing after signing via Bankr
      expect(output.orderParameters).toBeDefined();
      expect(output.counter).toBeDefined();
      expect(output.orderParameters.offerer).toBeDefined();
      expect(output.orderParameters.offer).toBeInstanceOf(Array);
      expect(output.orderParameters.consideration).toBeInstanceOf(Array);
    });

    it("should include approval transactions formatted for Bankr submit", async () => {
      const mockPrepared = createMockPreparedOrder();
      mockPrepareCreateErc20Listing.mockResolvedValue(mockPrepared);

      await executeCreateErc20Listing({
        tokenAddress: TEST_TOKEN_ADDRESS,
        tokenAmount: "1000000000000000000",
        price: "0.5",
        offerer: TEST_ACCOUNT_ADDRESS,
        chainId: TEST_CHAIN_ID,
      });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      const output = JSON.parse(jsonCall![0]);

      // Approvals are pre-encoded as {to, data, description} — ready for Bankr submit
      expect(output.approvals).toBeInstanceOf(Array);
      for (const approval of output.approvals) {
        expect(approval.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(approval.data).toMatch(/^0x[a-fA-F0-9]+$/);
        expect(approval.description).toBeDefined();

        // Can be formatted as a Bankr submit request
        const bankrSubmit: BankrSubmitRequest = {
          transaction: {
            to: approval.to,
            chainId: TEST_CHAIN_ID,
            value: "0",
            data: approval.data,
          },
          description: approval.description,
          waitForConfirmation: true,
        };
        expect(bankrSubmit.transaction.to).toMatch(/^0x/);
        expect(bankrSubmit.transaction.chainId).toBe(TEST_CHAIN_ID);
      }
    });
  });

  describe("create-erc20-offer keyless mode → Bankr /agent/sign", () => {
    it("should output EIP-712 data compatible with Bankr sign API", async () => {
      const mockPrepared = createMockPreparedOrder();
      mockPrepareCreateErc20Offer.mockResolvedValue(mockPrepared);

      await executeCreateErc20Offer({
        tokenAddress: TEST_TOKEN_ADDRESS,
        tokenAmount: "1000000000000000000",
        price: "0.5",
        offerer: TEST_ACCOUNT_ADDRESS,
        chainId: TEST_CHAIN_ID,
      });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonCall).toBeDefined();
      const output = JSON.parse(jsonCall![0]);

      // Verify EIP-712 structure
      expect(output.eip712).toBeDefined();
      expect(output.eip712.domain.name).toBe("Seaport");
      expect(output.eip712.primaryType).toBe("OrderComponents");

      // Verify Bankr compatibility
      const bankrRequest = validateBankrSignRequest(output.eip712);
      expect(bankrRequest.signatureType).toBe("eth_signTypedData_v4");
      expect(bankrRequest.typedData!.primaryType).toBe("OrderComponents");

      // Verify submission data is present
      expect(output.orderParameters).toBeDefined();
      expect(output.counter).toBeDefined();
    });
  });

  describe("buy-erc20-listing encode-only mode → Bankr /agent/submit", () => {
    it("should output encoded transaction compatible with Bankr submit API", async () => {
      const mockListing = createMockErc20Listing();
      mockGetErc20Listings.mockResolvedValue([mockListing]);
      mockPrepareFulfillErc20Listing.mockResolvedValue(
        createMockPreparedFulfillment()
      );

      await executeBuyErc20Listing({
        orderHash: MOCK_ORDER_HASH,
        tokenAddress: TEST_TOKEN_ADDRESS,
        buyer: TEST_ACCOUNT_ADDRESS,
        chainId: TEST_CHAIN_ID,
        encodeOnly: true,
      });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonCall).toBeDefined();
      const output = JSON.parse(jsonCall![0]);

      // Verify fulfillment transaction structure
      expect(output.fulfillment).toBeDefined();
      expect(output.fulfillment.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(output.fulfillment.data).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(output.fulfillment.chainId).toBe(TEST_CHAIN_ID);
      expect(output.fulfillment.value).toBeDefined();

      // Format for Bankr submit and validate
      const bankrRequest = validateBankrSubmitRequest(
        output.fulfillment,
        "Buy ERC-20 listing"
      );
      expect(bankrRequest.transaction.to).toBe(output.fulfillment.to);
      expect(bankrRequest.transaction.chainId).toBe(TEST_CHAIN_ID);
      expect(bankrRequest.transaction.data).toBe(output.fulfillment.data);
    });

    it("should include approval transactions if needed", async () => {
      const mockFulfillment = createMockPreparedFulfillment();
      mockFulfillment.approvals = [
        {
          to: TEST_TOKEN_ADDRESS,
          functionName: "approve",
          args: [TEST_SEAPORT_ADDRESS, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")],
          abi: [
            {
              type: "function",
              name: "approve",
              inputs: [
                { name: "spender", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              outputs: [{ name: "", type: "bool" }],
              stateMutability: "nonpayable",
            },
          ],
          value: undefined,
        },
      ];

      const mockListing = createMockErc20Listing();
      mockGetErc20Listings.mockResolvedValue([mockListing]);
      mockPrepareFulfillErc20Listing.mockResolvedValue(mockFulfillment);

      await executeBuyErc20Listing({
        orderHash: MOCK_ORDER_HASH,
        tokenAddress: TEST_TOKEN_ADDRESS,
        buyer: TEST_ACCOUNT_ADDRESS,
        chainId: TEST_CHAIN_ID,
        encodeOnly: true,
      });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      const output = JSON.parse(jsonCall![0]);

      expect(output.approvals).toBeInstanceOf(Array);
      expect(output.approvals.length).toBeGreaterThan(0);

      // Each approval should be a valid Bankr submit transaction
      for (const approval of output.approvals) {
        expect(approval.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(approval.data).toMatch(/^0x[a-fA-F0-9]+$/);
        expect(approval.chainId).toBe(TEST_CHAIN_ID);
      }
    });
  });

  describe("accept-erc20-offer encode-only mode → Bankr /agent/submit", () => {
    it("should output encoded transaction compatible with Bankr submit API", async () => {
      const mockOffer = createMockErc20Offer();
      mockGetErc20Offers.mockResolvedValue([mockOffer]);
      mockPrepareFulfillErc20Offer.mockResolvedValue(
        createMockPreparedFulfillment()
      );

      await executeAcceptErc20Offer({
        orderHash: MOCK_ORDER_HASH,
        tokenAddress: TEST_TOKEN_ADDRESS,
        seller: TEST_ACCOUNT_ADDRESS,
        chainId: TEST_CHAIN_ID,
        encodeOnly: true,
      });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonCall).toBeDefined();
      const output = JSON.parse(jsonCall![0]);

      // Verify fulfillment transaction structure
      expect(output.fulfillment).toBeDefined();
      expect(output.fulfillment.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(output.fulfillment.data).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(output.fulfillment.chainId).toBe(TEST_CHAIN_ID);

      // Format for Bankr
      const bankrRequest = validateBankrSubmitRequest(
        output.fulfillment,
        "Accept ERC-20 offer"
      );
      expect(bankrRequest.transaction.to).toBe(output.fulfillment.to);
      expect(bankrRequest.transaction.data).toMatch(/^0x/);
    });
  });

  describe("submit-erc20-listing encode-only mode → Bankr /agent/submit", () => {
    it("should output encoded transaction compatible with Bankr submit API", async () => {
      mockPrepareSubmitErc20Listing.mockReturnValue(
        createMockSubmitTxConfig()
      );

      await executeSubmitErc20Listing({
        orderData: "/tmp/order.json",
        signature: MOCK_SIGNATURE,
        chainId: TEST_CHAIN_ID,
        encodeOnly: true,
      });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonCall).toBeDefined();
      const output = JSON.parse(jsonCall![0]);

      // Submit encode-only outputs a flat encoded transaction
      expect(output.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(output.data).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(output.chainId).toBe(TEST_CHAIN_ID);

      // Format for Bankr submit
      const bankrRequest = validateBankrSubmitRequest(
        output,
        "Submit ERC-20 listing"
      );
      expect(bankrRequest.transaction.to).toBe(output.to);
      expect(bankrRequest.transaction.chainId).toBe(TEST_CHAIN_ID);
    });
  });

  describe("submit-erc20-offer encode-only mode → Bankr /agent/submit", () => {
    it("should output encoded transaction compatible with Bankr submit API", async () => {
      mockPrepareSubmitErc20Offer.mockReturnValue(createMockSubmitTxConfig());

      await executeSubmitErc20Offer({
        orderData: "/tmp/order.json",
        signature: MOCK_SIGNATURE,
        chainId: TEST_CHAIN_ID,
        encodeOnly: true,
      });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(jsonCall).toBeDefined();
      const output = JSON.parse(jsonCall![0]);

      expect(output.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(output.data).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(output.chainId).toBe(TEST_CHAIN_ID);

      const bankrRequest = validateBankrSubmitRequest(
        output,
        "Submit ERC-20 offer"
      );
      expect(bankrRequest.transaction.to).toBe(output.to);
    });
  });

  describe("full ERC20 listing flow with Bankr API", () => {
    it("should produce data for a complete create → sign → submit flow", async () => {
      // Step 1: Create listing in keyless mode (get EIP-712 data + order params)
      const mockPrepared = createMockPreparedOrder();
      mockPrepareCreateErc20Listing.mockResolvedValue(mockPrepared);

      await executeCreateErc20Listing({
        tokenAddress: TEST_TOKEN_ADDRESS,
        tokenAmount: "1000000000000000000",
        price: "0.5",
        offerer: TEST_ACCOUNT_ADDRESS,
        chainId: TEST_CHAIN_ID,
      });

      const createCall = consoleSpy.mock.calls.find((call) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.eip712 !== undefined;
        } catch {
          return false;
        }
      });

      expect(createCall).toBeDefined();
      const createOutput = JSON.parse(createCall![0]);

      // Step 2: Format for Bankr /agent/sign
      const signRequest = validateBankrSignRequest(createOutput.eip712);
      expect(signRequest.signatureType).toBe("eth_signTypedData_v4");
      expect(signRequest.typedData).toBeDefined();

      // Simulate getting a signature back from Bankr
      const bankrSignResponse = {
        success: true,
        signature: MOCK_SIGNATURE,
        signer: TEST_ACCOUNT_ADDRESS,
        signatureType: "eth_signTypedData_v4",
      };

      // Step 3: Submit using the signature from Bankr
      // The order data (orderParameters + counter) from step 1 plus
      // the signature from step 2 are used for submit-erc20-listing
      consoleSpy.mockClear();

      mockPrepareSubmitErc20Listing.mockReturnValue(
        createMockSubmitTxConfig()
      );

      await executeSubmitErc20Listing({
        orderData: "/tmp/order.json", // Would contain createOutput.orderParameters + createOutput.counter
        signature: bankrSignResponse.signature,
        chainId: TEST_CHAIN_ID,
        encodeOnly: true,
      });

      const submitCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      expect(submitCall).toBeDefined();
      const submitOutput = JSON.parse(submitCall![0]);

      // Step 4: Format for Bankr /agent/submit
      const submitRequest = validateBankrSubmitRequest(
        submitOutput,
        "Submit ERC-20 listing on-chain"
      );

      // Verify the complete request is valid for Bankr
      expect(submitRequest.transaction.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(submitRequest.transaction.data).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(submitRequest.transaction.chainId).toBe(TEST_CHAIN_ID);
      expect(submitRequest.waitForConfirmation).toBe(true);
    });

    it("should produce data for a complete buy listing flow via Bankr", async () => {
      // Step 1: Get encoded buy transaction
      const mockListing = createMockErc20Listing();
      mockGetErc20Listings.mockResolvedValue([mockListing]);
      mockPrepareFulfillErc20Listing.mockResolvedValue(
        createMockPreparedFulfillment()
      );

      await executeBuyErc20Listing({
        orderHash: MOCK_ORDER_HASH,
        tokenAddress: TEST_TOKEN_ADDRESS,
        buyer: TEST_ACCOUNT_ADDRESS,
        chainId: TEST_CHAIN_ID,
        encodeOnly: true,
      });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      const output = JSON.parse(jsonCall![0]);

      // Step 2: Submit each approval via Bankr /agent/submit
      for (const approval of output.approvals) {
        const approvalRequest: BankrSubmitRequest = {
          transaction: {
            to: approval.to,
            chainId: approval.chainId,
            value: approval.value || "0",
            data: approval.data,
          },
          description: "ERC-20 approval for Seaport",
          waitForConfirmation: true,
        };
        expect(approvalRequest.transaction.to).toMatch(/^0x/);
      }

      // Step 3: Submit the fulfillment via Bankr /agent/submit
      const fulfillRequest: BankrSubmitRequest = {
        transaction: {
          to: output.fulfillment.to,
          chainId: output.fulfillment.chainId,
          value: output.fulfillment.value,
          data: output.fulfillment.data,
        },
        description: "Buy ERC-20 listing via Seaport",
        waitForConfirmation: true,
      };

      expect(fulfillRequest.transaction.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(fulfillRequest.transaction.chainId).toBe(TEST_CHAIN_ID);
      expect(fulfillRequest.transaction.data).toMatch(/^0x/);
    });
  });

  describe("direct execution mode with private key", () => {
    it("create-erc20-listing should execute transactions directly", async () => {
      const mockPrepared = createMockPreparedOrder();
      mockPrepareCreateErc20Listing.mockResolvedValue(mockPrepared);
      mockPrepareSubmitErc20Listing.mockReturnValue(
        createMockSubmitTxConfig()
      );

      await executeCreateErc20Listing({
        tokenAddress: TEST_TOKEN_ADDRESS,
        tokenAmount: "1000000000000000000",
        price: "0.5",
        privateKey: TEST_PRIVATE_KEY,
        chainId: TEST_CHAIN_ID,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ERC-20 listing created successfully")
      );
    });

    it("buy-erc20-listing should execute transactions directly", async () => {
      const mockListing = createMockErc20Listing();
      mockGetErc20Listings.mockResolvedValue([mockListing]);
      mockPrepareFulfillErc20Listing.mockResolvedValue(
        createMockPreparedFulfillment()
      );

      await executeBuyErc20Listing({
        orderHash: MOCK_ORDER_HASH,
        tokenAddress: TEST_TOKEN_ADDRESS,
        privateKey: TEST_PRIVATE_KEY,
        chainId: TEST_CHAIN_ID,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ERC-20 listing fulfilled successfully")
      );
    });

    it("accept-erc20-offer should execute transactions directly", async () => {
      const mockOffer = createMockErc20Offer();
      mockGetErc20Offers.mockResolvedValue([mockOffer]);
      mockPrepareFulfillErc20Offer.mockResolvedValue(
        createMockPreparedFulfillment()
      );

      await executeAcceptErc20Offer({
        orderHash: MOCK_ORDER_HASH,
        tokenAddress: TEST_TOKEN_ADDRESS,
        privateKey: TEST_PRIVATE_KEY,
        chainId: TEST_CHAIN_ID,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ERC-20 offer accepted successfully")
      );
    });
  });

  describe("Bankr API field format validation", () => {
    it("encode-only transaction 'to' field should be a valid Ethereum address", async () => {
      const mockListing = createMockErc20Listing();
      mockGetErc20Listings.mockResolvedValue([mockListing]);
      mockPrepareFulfillErc20Listing.mockResolvedValue(
        createMockPreparedFulfillment()
      );

      await executeBuyErc20Listing({
        orderHash: MOCK_ORDER_HASH,
        tokenAddress: TEST_TOKEN_ADDRESS,
        buyer: TEST_ACCOUNT_ADDRESS,
        chainId: TEST_CHAIN_ID,
        encodeOnly: true,
      });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      const output = JSON.parse(jsonCall![0]);

      // Bankr requires 'to' to be a valid Ethereum address (0x + 40 hex chars)
      expect(output.fulfillment.to).toMatch(/^0x[a-fA-F0-9]{40}$/);

      // Bankr requires 'data' to be hex-encoded calldata
      expect(output.fulfillment.data).toMatch(/^0x[a-fA-F0-9]+$/);

      // Bankr requires 'chainId' to be a number (8453 for Base)
      expect(typeof output.fulfillment.chainId).toBe("number");
      expect(output.fulfillment.chainId).toBe(TEST_CHAIN_ID);

      // Bankr requires 'value' to be a string representation of wei
      expect(typeof output.fulfillment.value).toBe("string");
    });

    it("keyless mode EIP-712 domain should have required Bankr sign fields", async () => {
      const mockPrepared = createMockPreparedOrder();
      mockPrepareCreateErc20Listing.mockResolvedValue(mockPrepared);

      await executeCreateErc20Listing({
        tokenAddress: TEST_TOKEN_ADDRESS,
        tokenAmount: "1000000000000000000",
        price: "0.5",
        offerer: TEST_ACCOUNT_ADDRESS,
        chainId: TEST_CHAIN_ID,
      });

      const jsonCall = consoleSpy.mock.calls.find((call) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });

      const output = JSON.parse(jsonCall![0]);

      // Bankr eth_signTypedData_v4 requires domain, types, primaryType, message
      const { domain, types, primaryType, message } = output.eip712;

      expect(domain).toBeDefined();
      expect(domain.name).toBeTruthy();
      expect(domain.version).toBeTruthy();
      expect(domain.chainId).toBeTruthy();
      expect(domain.verifyingContract).toMatch(/^0x[a-fA-F0-9]{40}$/);

      expect(types).toBeDefined();
      expect(Object.keys(types).length).toBeGreaterThan(0);

      expect(primaryType).toBeTruthy();
      expect(typeof primaryType).toBe("string");

      expect(message).toBeDefined();
      expect(typeof message).toBe("object");
    });
  });

  describe("error handling", () => {
    it("buy-erc20-listing should error when listing not found", async () => {
      mockGetErc20Listings.mockResolvedValue([]);

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation((() => {
          throw new Error("process.exit called");
        }) as never);

      await expect(
        executeBuyErc20Listing({
          orderHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
          tokenAddress: TEST_TOKEN_ADDRESS,
          buyer: TEST_ACCOUNT_ADDRESS,
          chainId: TEST_CHAIN_ID,
          encodeOnly: true,
        })
      ).rejects.toThrow("process.exit called");

      mockExit.mockRestore();
    });

    it("accept-erc20-offer should error when offer not found", async () => {
      mockGetErc20Offers.mockResolvedValue([]);

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation((() => {
          throw new Error("process.exit called");
        }) as never);

      await expect(
        executeAcceptErc20Offer({
          orderHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
          tokenAddress: TEST_TOKEN_ADDRESS,
          seller: TEST_ACCOUNT_ADDRESS,
          chainId: TEST_CHAIN_ID,
          encodeOnly: true,
        })
      ).rejects.toThrow("process.exit called");

      mockExit.mockRestore();
    });

    it("create-erc20-listing keyless mode should error without offerer", async () => {
      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation((() => {
          throw new Error("process.exit called");
        }) as never);

      await expect(
        executeCreateErc20Listing({
          tokenAddress: TEST_TOKEN_ADDRESS,
          tokenAmount: "1000000000000000000",
          price: "0.5",
          chainId: TEST_CHAIN_ID,
          // No offerer and no private key
        })
      ).rejects.toThrow("process.exit called");

      mockExit.mockRestore();
    });

    it("buy-erc20-listing encode-only should error without buyer", async () => {
      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation((() => {
          throw new Error("process.exit called");
        }) as never);

      await expect(
        executeBuyErc20Listing({
          orderHash: MOCK_ORDER_HASH,
          tokenAddress: TEST_TOKEN_ADDRESS,
          chainId: TEST_CHAIN_ID,
          encodeOnly: true,
          // No buyer
        })
      ).rejects.toThrow("process.exit called");

      mockExit.mockRestore();
    });
  });
});
