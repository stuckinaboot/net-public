import { describe, it, expect } from "vitest";
import { encodeTransaction } from "../../../shared/encode";
import type { WriteTransactionConfig } from "@net-protocol/core";

describe("encode utilities", () => {
  describe("encodeTransaction", () => {
    it("should encode a transaction config", () => {
      const config: WriteTransactionConfig = {
        to: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
        functionName: "transfer",
        args: [
          "0xabcdef1234567890abcdef1234567890abcdef12",
          BigInt(1000),
        ],
        abi: [
          {
            name: "transfer",
            type: "function",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
          },
        ],
      };

      const encoded = encodeTransaction(config, 8453);

      expect(encoded.to).toBe(
        "0x1234567890abcdef1234567890abcdef12345678"
      );
      expect(encoded.chainId).toBe(8453);
      expect(encoded.value).toBe("0");
      expect(encoded.data).toMatch(/^0x/);
      // The encoded data should start with the function selector for transfer
      expect(encoded.data.slice(0, 10)).toBe("0xa9059cbb");
    });

    it("should include value when provided", () => {
      const config: WriteTransactionConfig = {
        to: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
        functionName: "deposit",
        args: [],
        value: BigInt(1000000000000000000),
        abi: [
          {
            name: "deposit",
            type: "function",
            inputs: [],
            outputs: [],
            stateMutability: "payable",
          },
        ],
      };

      const encoded = encodeTransaction(config, 8453);

      expect(encoded.value).toBe("1000000000000000000");
    });
  });
});
