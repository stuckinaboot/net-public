import { describe, it, expect } from "vitest";
import { buildFilter } from "../../../commands/message/types";

const TEST_APP_ADDRESS = "0x1234567890123456789012345678901234567890";
const TEST_SENDER_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const TEST_TOPIC = "test-topic";

describe("buildFilter", () => {
  it("should return undefined when no app is provided", () => {
    const filter = buildFilter({});
    expect(filter).toBeUndefined();
  });

  it("should return undefined when only topic is provided (no app)", () => {
    const filter = buildFilter({ topic: TEST_TOPIC });
    expect(filter).toBeUndefined();
  });

  it("should return undefined when only sender is provided (no app)", () => {
    const filter = buildFilter({ sender: TEST_SENDER_ADDRESS });
    expect(filter).toBeUndefined();
  });

  it("should return filter with appAddress when app is provided", () => {
    const filter = buildFilter({ app: TEST_APP_ADDRESS });

    expect(filter).toBeDefined();
    expect(filter?.appAddress).toBe(TEST_APP_ADDRESS);
    expect(filter?.topic).toBeUndefined();
    expect(filter?.maker).toBeUndefined();
  });

  it("should return filter with appAddress and topic when both are provided", () => {
    const filter = buildFilter({
      app: TEST_APP_ADDRESS,
      topic: TEST_TOPIC,
    });

    expect(filter).toBeDefined();
    expect(filter?.appAddress).toBe(TEST_APP_ADDRESS);
    expect(filter?.topic).toBe(TEST_TOPIC);
    expect(filter?.maker).toBeUndefined();
  });

  it("should map sender to maker in the filter", () => {
    const filter = buildFilter({
      app: TEST_APP_ADDRESS,
      sender: TEST_SENDER_ADDRESS,
    });

    expect(filter).toBeDefined();
    expect(filter?.appAddress).toBe(TEST_APP_ADDRESS);
    expect(filter?.maker).toBe(TEST_SENDER_ADDRESS);
    expect(filter?.topic).toBeUndefined();
  });

  it("should return filter with all fields when app, topic, and sender are provided", () => {
    const filter = buildFilter({
      app: TEST_APP_ADDRESS,
      topic: TEST_TOPIC,
      sender: TEST_SENDER_ADDRESS,
    });

    expect(filter).toBeDefined();
    expect(filter?.appAddress).toBe(TEST_APP_ADDRESS);
    expect(filter?.topic).toBe(TEST_TOPIC);
    expect(filter?.maker).toBe(TEST_SENDER_ADDRESS);
  });
});
