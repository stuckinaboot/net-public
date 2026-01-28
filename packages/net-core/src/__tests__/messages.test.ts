import { describe, it, expect } from "vitest";
import {
  getNetMessagesReadConfig,
  getNetMessageCountReadConfig,
} from "../client/messages";

const TEST_CHAIN_ID = 8453;
const TEST_APP_ADDRESS = "0x1234567890123456789012345678901234567890" as const;
const TEST_MAKER_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as const;
const TEST_TOPIC = "test-topic";

describe("getNetMessagesReadConfig", () => {
  describe("filter selection", () => {
    it("should use getMessagesInRange when no filter is provided", () => {
      const config = getNetMessagesReadConfig({
        chainId: TEST_CHAIN_ID,
        startIndex: 0,
        endIndex: 10,
      });

      expect(config.functionName).toBe("getMessagesInRange");
      expect(config.args).toEqual([0, 10]);
    });

    it("should use getMessagesInRangeForApp when filter has only appAddress", () => {
      const config = getNetMessagesReadConfig({
        chainId: TEST_CHAIN_ID,
        filter: { appAddress: TEST_APP_ADDRESS },
        startIndex: 0,
        endIndex: 10,
      });

      expect(config.functionName).toBe("getMessagesInRangeForApp");
      expect(config.args).toEqual([0, 10, TEST_APP_ADDRESS]);
    });

    it("should use getMessagesInRangeForAppTopic when filter has appAddress and topic", () => {
      const config = getNetMessagesReadConfig({
        chainId: TEST_CHAIN_ID,
        filter: { appAddress: TEST_APP_ADDRESS, topic: TEST_TOPIC },
        startIndex: 0,
        endIndex: 10,
      });

      expect(config.functionName).toBe("getMessagesInRangeForAppTopic");
      expect(config.args).toEqual([0, 10, TEST_APP_ADDRESS, TEST_TOPIC]);
    });

    it("should use getMessagesInRangeForAppUser when filter has appAddress and maker (no topic)", () => {
      const config = getNetMessagesReadConfig({
        chainId: TEST_CHAIN_ID,
        filter: { appAddress: TEST_APP_ADDRESS, maker: TEST_MAKER_ADDRESS },
        startIndex: 0,
        endIndex: 10,
      });

      expect(config.functionName).toBe("getMessagesInRangeForAppUser");
      expect(config.args).toEqual([0, 10, TEST_APP_ADDRESS, TEST_MAKER_ADDRESS]);
    });

    it("should use getMessagesInRangeForAppUserTopic when filter has appAddress, maker, and topic", () => {
      const config = getNetMessagesReadConfig({
        chainId: TEST_CHAIN_ID,
        filter: {
          appAddress: TEST_APP_ADDRESS,
          maker: TEST_MAKER_ADDRESS,
          topic: TEST_TOPIC,
        },
        startIndex: 0,
        endIndex: 10,
      });

      expect(config.functionName).toBe("getMessagesInRangeForAppUserTopic");
      expect(config.args).toEqual([
        0,
        10,
        TEST_APP_ADDRESS,
        TEST_MAKER_ADDRESS,
        TEST_TOPIC,
      ]);
    });
  });

  describe("default values", () => {
    it("should default startIndex to 0", () => {
      const config = getNetMessagesReadConfig({
        chainId: TEST_CHAIN_ID,
        endIndex: 10,
      });

      expect(config.args[0]).toBe(0);
    });
  });
});

describe("getNetMessageCountReadConfig", () => {
  describe("filter selection", () => {
    it("should use getTotalMessagesCount when no filter is provided", () => {
      const config = getNetMessageCountReadConfig({
        chainId: TEST_CHAIN_ID,
      });

      expect(config.functionName).toBe("getTotalMessagesCount");
      expect(config.args).toEqual([]);
    });

    it("should use getTotalMessagesForAppCount when filter has only appAddress", () => {
      const config = getNetMessageCountReadConfig({
        chainId: TEST_CHAIN_ID,
        filter: { appAddress: TEST_APP_ADDRESS },
      });

      expect(config.functionName).toBe("getTotalMessagesForAppCount");
      expect(config.args).toEqual([TEST_APP_ADDRESS]);
    });

    it("should use getTotalMessagesForAppTopicCount when filter has appAddress and topic", () => {
      const config = getNetMessageCountReadConfig({
        chainId: TEST_CHAIN_ID,
        filter: { appAddress: TEST_APP_ADDRESS, topic: TEST_TOPIC },
      });

      expect(config.functionName).toBe("getTotalMessagesForAppTopicCount");
      expect(config.args).toEqual([TEST_APP_ADDRESS, TEST_TOPIC]);
    });

    it("should use getTotalMessagesForAppUserCount when filter has appAddress and maker (no topic)", () => {
      const config = getNetMessageCountReadConfig({
        chainId: TEST_CHAIN_ID,
        filter: { appAddress: TEST_APP_ADDRESS, maker: TEST_MAKER_ADDRESS },
      });

      expect(config.functionName).toBe("getTotalMessagesForAppUserCount");
      expect(config.args).toEqual([TEST_APP_ADDRESS, TEST_MAKER_ADDRESS]);
    });

    it("should use getTotalMessagesForAppUserTopicCount when filter has appAddress, maker, and topic", () => {
      const config = getNetMessageCountReadConfig({
        chainId: TEST_CHAIN_ID,
        filter: {
          appAddress: TEST_APP_ADDRESS,
          maker: TEST_MAKER_ADDRESS,
          topic: TEST_TOPIC,
        },
      });

      expect(config.functionName).toBe("getTotalMessagesForAppUserTopicCount");
      expect(config.args).toEqual([
        TEST_APP_ADDRESS,
        TEST_MAKER_ADDRESS,
        TEST_TOPIC,
      ]);
    });
  });
});
