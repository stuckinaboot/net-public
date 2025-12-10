import { describe, it, expect } from "vitest";
import {
  parseNetReferences,
  containsXmlReferences,
  detectStorageType,
  resolveOperator,
  getReferenceKey,
  type XmlReference,
} from "../utils/xmlUtils";

describe("xmlUtils", () => {
  describe("parseNetReferences", () => {
    it("should parse single reference correctly", () => {
      const metadata = '<net k="0x1234" v="0.0.1" />';
      const refs = parseNetReferences(metadata);

      expect(refs.length).toBe(1);
      expect(refs[0].hash).toBe("0x1234");
      expect(refs[0].version).toBe("0.0.1");
    });

    it("should parse multiple references", () => {
      const metadata =
        '<net k="0x1234" v="0.0.1" /><net k="0x5678" v="0.0.1" />';
      const refs = parseNetReferences(metadata);

      expect(refs.length).toBe(2);
      expect(refs[0].hash).toBe("0x1234");
      expect(refs[1].hash).toBe("0x5678");
    });

    it("should handle optional index attribute", () => {
      const metadata = '<net k="0x1234" v="0.0.1" i="5" />';
      const refs = parseNetReferences(metadata);

      expect(refs[0].index).toBe(5);
    });

    it("should handle optional operator attribute", () => {
      const metadata = '<net k="0x1234" v="0.0.1" o="0xabcd" />';
      const refs = parseNetReferences(metadata);

      expect(refs[0].operator).toBe("0xabcd");
    });

    it("should handle optional source attribute", () => {
      const metadata = '<net k="0x1234" v="0.0.1" s="d" />';
      const refs = parseNetReferences(metadata);

      expect(refs[0].source).toBe("d");
    });

    it("should handle all optional attributes together", () => {
      const metadata = '<net k="0x1234" v="0.0.1" i="3" o="0xabcd" s="d" />';
      const refs = parseNetReferences(metadata);

      expect(refs[0].hash).toBe("0x1234");
      expect(refs[0].version).toBe("0.0.1");
      expect(refs[0].index).toBe(3);
      expect(refs[0].operator).toBe("0xabcd");
      expect(refs[0].source).toBe("d");
    });

    it("should handle malformed XML (returns empty array)", () => {
      const metadata = "not xml at all";
      const refs = parseNetReferences(metadata);
      expect(refs.length).toBe(0);
    });

    it("should handle empty string", () => {
      const refs = parseNetReferences("");
      expect(refs.length).toBe(0);
    });

    it("should lowercase operator addresses", () => {
      const metadata = '<net k="0x1234" v="0.0.1" o="0xABCD" />';
      const refs = parseNetReferences(metadata);
      expect(refs[0].operator).toBe("0xabcd");
    });
  });

  describe("containsXmlReferences", () => {
    it("should return true for valid XML references", () => {
      const data = '<net k="0x1234" v="0.0.1" />';
      expect(containsXmlReferences(data)).toBe(true);
    });

    it("should return false for regular text", () => {
      const data = "regular text without xml";
      expect(containsXmlReferences(data)).toBe(false);
    });

    it("should return true for XML with optional attributes", () => {
      const data = '<net k="0x1234" v="0.0.1" i="5" o="0xabcd" s="d" />';
      expect(containsXmlReferences(data)).toBe(true);
    });

    it("should return false for similar but invalid XML", () => {
      const data = "<net>invalid</net>";
      expect(containsXmlReferences(data)).toBe(false);
    });

    it("should handle empty string", () => {
      expect(containsXmlReferences("")).toBe(false);
    });
  });

  describe("detectStorageType", () => {
    it("should return 'xml' for XML references", () => {
      const metadata = '<net k="0x1234" v="0.0.1" />';
      expect(detectStorageType(metadata)).toBe("xml");
    });

    it("should return 'regular' for non-XML", () => {
      const metadata = "regular text";
      expect(detectStorageType(metadata)).toBe("regular");
    });

    it("should return 'xml' for metadata with XML", () => {
      const metadata = 'Some text <net k="0x1234" v="0.0.1" /> more text';
      expect(detectStorageType(metadata)).toBe("xml");
    });
  });

  describe("resolveOperator", () => {
    it("should use reference operator if provided", () => {
      const ref: XmlReference = {
        hash: "0x1234",
        version: "0.0.1",
        operator: "0xabcd",
      };
      const result = resolveOperator(ref, "0xdefault");
      expect(result).toBe("0xabcd");
    });

    it("should fall back to default operator", () => {
      const ref: XmlReference = {
        hash: "0x1234",
        version: "0.0.1",
      };
      const result = resolveOperator(ref, "0xdefault");
      expect(result).toBe("0xdefault");
    });

    it("should handle lowercase conversion", () => {
      const ref: XmlReference = {
        hash: "0x1234",
        version: "0.0.1",
        operator: "0xABCD",
      };
      const result = resolveOperator(ref, "0xDEF");
      expect(result).toBe("0xabcd");
    });
  });

  describe("getReferenceKey", () => {
    it("should generate unique keys", () => {
      const ref1: XmlReference = {
        hash: "0x1234",
        version: "0.0.1",
      };
      const ref2: XmlReference = {
        hash: "0x5678",
        version: "0.0.1",
      };

      const key1 = getReferenceKey(ref1, "0xdefault");
      const key2 = getReferenceKey(ref2, "0xdefault");

      expect(key1).not.toBe(key2);
    });

    it("should include index in key", () => {
      const ref1: XmlReference = {
        hash: "0x1234",
        version: "0.0.1",
        index: 0,
      };
      const ref2: XmlReference = {
        hash: "0x1234",
        version: "0.0.1",
        index: 1,
      };

      const key1 = getReferenceKey(ref1, "0xdefault");
      const key2 = getReferenceKey(ref2, "0xdefault");

      expect(key1).not.toBe(key2);
    });

    it("should handle operator resolution", () => {
      const ref: XmlReference = {
        hash: "0x1234",
        version: "0.0.1",
        operator: "0xabcd",
      };

      const key1 = getReferenceKey(ref, "0xdefault");
      const key2 = getReferenceKey(ref, "0xother");

      // Should use ref.operator, so keys should be same
      expect(key1).toBe(key2);
    });

    it("should generate consistent keys for same reference", () => {
      const ref: XmlReference = {
        hash: "0x1234",
        version: "0.0.1",
        index: 5,
      };

      const key1 = getReferenceKey(ref, "0xdefault");
      const key2 = getReferenceKey(ref, "0xdefault");

      expect(key1).toBe(key2);
    });
  });
});
