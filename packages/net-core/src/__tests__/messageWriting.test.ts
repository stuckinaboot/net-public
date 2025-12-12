import { describe, it, expect } from "vitest";
import { prepareSendMessage, prepareSendMessageViaApp } from "../client/messageWriting";
import { BASE_CHAIN_ID } from "./test-utils";
import { NET_CONTRACT_ADDRESS } from "../constants";

describe("messageWriting", () => {
  describe("prepareSendMessage", () => {
    it("should return correct transaction config structure", () => {
      const config = prepareSendMessage({
        text: "Hello Net!",
        topic: "greeting",
        chainId: BASE_CHAIN_ID,
      });

      // Verify structure
      expect(config).toHaveProperty("to");
      expect(config).toHaveProperty("functionName");
      expect(config).toHaveProperty("args");
      expect(config).toHaveProperty("abi");

      // Verify types
      expect(config.to).toMatch(/^0x[a-fA-F0-9]{40}$/); // Valid address
      expect(config.functionName).toBe("sendMessage");
      expect(Array.isArray(config.args)).toBe(true);
      expect(Array.isArray(config.abi)).toBe(true); // ABI is array

      // Verify contract address matches Net contract
      expect(config.to).toBe(NET_CONTRACT_ADDRESS);
    });

    it("should format args correctly", () => {
      const config = prepareSendMessage({
        text: "Test",
        topic: "test",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.args).toEqual(["Test", "test", "0x"]);
    });

    it("should convert plain string data to hex", () => {
      const config = prepareSendMessage({
        text: "Hello",
        topic: "",
        data: "test",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.args[2]).toBe("0x74657374"); // "test" as hex
    });

    it("should use hex string data as-is", () => {
      const config = prepareSendMessage({
        text: "Hello",
        topic: "",
        data: "0x1234",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.args[2]).toBe("0x1234");
    });

    it("should use empty bytes when data not provided", () => {
      const config = prepareSendMessage({
        text: "Hello",
        topic: "",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.args[2]).toBe("0x");
    });

    it("should reject empty message (no text or data)", () => {
      expect(() => {
        prepareSendMessage({
          text: "",
          topic: "",
          chainId: BASE_CHAIN_ID,
        });
      }).toThrow("Message must have non-empty text or data");
    });

    it("should accept message with only text", () => {
      const config = prepareSendMessage({
        text: "Hello",
        topic: "",
        chainId: BASE_CHAIN_ID,
      });
      expect(config).toBeDefined();
    });

    it("should accept message with only data", () => {
      const config = prepareSendMessage({
        text: "",
        topic: "",
        data: "0x1234",
        chainId: BASE_CHAIN_ID,
      });
      expect(config).toBeDefined();
    });

    it("should handle unicode characters", () => {
      const config = prepareSendMessage({
        text: "Hello 世界",
        topic: "test",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.args[0]).toBe("Hello 世界");
    });

    it("should use correct function name", () => {
      const config = prepareSendMessage({
        text: "test",
        topic: "test",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.functionName).toBe("sendMessage");

      // Verify function exists in ABI
      const sendMessageFunction = config.abi.find(
        (item: any) => item.type === "function" && item.name === "sendMessage"
      );
      expect(sendMessageFunction).toBeDefined();
      expect(sendMessageFunction.inputs.length).toBe(3); // text, topic, data
    });
  });

  describe("prepareSendMessageViaApp", () => {
    it("should return correct transaction config structure", () => {
      const config = prepareSendMessageViaApp({
        sender: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        text: "User action",
        topic: "action",
        appAddress: "0x1234567890123456789012345678901234567890",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.to).toBe(NET_CONTRACT_ADDRESS);
      expect(config.functionName).toBe("sendMessageViaApp");
      expect(Array.isArray(config.args)).toBe(true);
      expect(config.args.length).toBe(4); // sender, text, topic, data
    });

    it("should format args correctly", () => {
      const config = prepareSendMessageViaApp({
        sender: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        text: "Test",
        topic: "test",
        appAddress: "0x1234567890123456789012345678901234567890",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.args[0]).toBe("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb");
      expect(config.args[1]).toBe("Test");
      expect(config.args[2]).toBe("test");
      expect(config.args[3]).toBe("0x");
    });

    it("should reject empty message", () => {
      expect(() => {
        prepareSendMessageViaApp({
          sender: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          text: "",
          topic: "",
          appAddress: "0x1234567890123456789012345678901234567890",
          chainId: BASE_CHAIN_ID,
        });
      }).toThrow("Message must have non-empty text or data");
    });

    it("should use correct function name", () => {
      const config = prepareSendMessageViaApp({
        sender: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        text: "test",
        topic: "test",
        appAddress: "0x1234567890123456789012345678901234567890",
        chainId: BASE_CHAIN_ID,
      });

      expect(config.functionName).toBe("sendMessageViaApp");

      // Verify function exists in ABI
      const functionDef = config.abi.find(
        (item: any) => item.type === "function" && item.name === "sendMessageViaApp"
      );
      expect(functionDef).toBeDefined();
      expect(functionDef.inputs.length).toBe(4); // sender, text, topic, data
    });
  });
});

