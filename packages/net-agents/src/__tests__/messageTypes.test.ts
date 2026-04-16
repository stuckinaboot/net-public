import { describe, it, expect } from "vitest";
import { isMessageEncrypted, getMessageType } from "../dm/messageTypes";

describe("messageTypes", () => {
  describe("getMessageType", () => {
    it("should detect human messages", () => {
      // Version 0x01, type 0x00 (HUMAN)
      expect(getMessageType("0x0100")).toBe("human");
    });

    it("should detect AI messages", () => {
      // Version 0x01, type 0x01 (AI)
      expect(getMessageType("0x0101")).toBe("ai");
    });

    it("should detect encrypted human messages", () => {
      // Version 0x01, type 0x02 (ENCRYPTED_HUMAN)
      expect(getMessageType("0x0102")).toBe("encrypted_human");
    });

    it("should detect encrypted AI messages", () => {
      // Version 0x01, type 0x03 (ENCRYPTED_AI)
      expect(getMessageType("0x0103")).toBe("encrypted_ai");
    });

    it("should return unknown for empty or short data", () => {
      expect(getMessageType("0x")).toBe("unknown");
      expect(getMessageType("")).toBe("unknown");
      expect(getMessageType("0x01")).toBe("unknown");
    });

    it("should return unknown for unrecognized markers", () => {
      expect(getMessageType("0x01ff")).toBe("unknown");
    });
  });

  describe("isMessageEncrypted", () => {
    it("should return true for encrypted messages", () => {
      expect(isMessageEncrypted("0x0102")).toBe(true); // encrypted human
      expect(isMessageEncrypted("0x0103")).toBe(true); // encrypted AI
    });

    it("should return false for unencrypted messages", () => {
      expect(isMessageEncrypted("0x0100")).toBe(false); // human
      expect(isMessageEncrypted("0x0101")).toBe(false); // AI
    });

    it("should return false for empty/short data", () => {
      expect(isMessageEncrypted("0x")).toBe(false);
      expect(isMessageEncrypted("")).toBe(false);
    });
  });
});
