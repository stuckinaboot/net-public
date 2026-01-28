import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { truncateAddress, formatRelativeTime, formatTimestamp } from "@/lib/utils";

describe("truncateAddress", () => {
  it("returns empty string for empty input", () => {
    expect(truncateAddress("")).toBe("");
  });

  it("returns full address if shorter than truncation length", () => {
    // Threshold is chars * 2 + 2 = 10 for default chars=4
    // Addresses with length < 10 are returned as-is
    expect(truncateAddress("0x123")).toBe("0x123");
    expect(truncateAddress("0x1234567")).toBe("0x1234567"); // length 9
  });

  it("truncates address with default chars (4)", () => {
    const address = "0x1234567890123456789012345678901234567890";
    expect(truncateAddress(address)).toBe("0x1234...7890");
  });

  it("truncates address with custom chars", () => {
    const address = "0x1234567890123456789012345678901234567890";
    expect(truncateAddress(address, 6)).toBe("0x123456...567890");
    expect(truncateAddress(address, 2)).toBe("0x12...90");
  });

  it("truncates address at exactly the threshold length", () => {
    // Threshold is chars * 2 + 2 = 10 for default chars=4
    // "0x12345678" has length 10, which is NOT < 10, so it gets truncated
    const address = "0x12345678";
    expect(truncateAddress(address)).toBe("0x1234...5678");
  });
});

describe("formatRelativeTime", () => {
  // Date.now() returns milliseconds, but formatRelativeTime expects SECONDS
  const NOW_MS = 1700000000000; // Fixed timestamp for vi.setSystemTime (milliseconds)
  const NOW_SEC = NOW_MS / 1000; // Timestamp in seconds for formatRelativeTime

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for timestamps less than 1 minute ago", () => {
    const thirtySecondsAgo = NOW_SEC - 30;
    expect(formatRelativeTime(thirtySecondsAgo)).toBe("just now");
  });

  it("returns 'just now' for current timestamp", () => {
    expect(formatRelativeTime(NOW_SEC)).toBe("just now");
  });

  it("returns minutes ago for timestamps less than 1 hour ago", () => {
    const fiveMinutesAgo = NOW_SEC - 5 * 60;
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5m ago");

    const oneMinuteAgo = NOW_SEC - 60;
    expect(formatRelativeTime(oneMinuteAgo)).toBe("1m ago");

    const fiftyNineMinutesAgo = NOW_SEC - 59 * 60;
    expect(formatRelativeTime(fiftyNineMinutesAgo)).toBe("59m ago");
  });

  it("returns hours ago for timestamps less than 24 hours ago", () => {
    const twoHoursAgo = NOW_SEC - 2 * 60 * 60;
    expect(formatRelativeTime(twoHoursAgo)).toBe("2h ago");

    const oneHourAgo = NOW_SEC - 60 * 60;
    expect(formatRelativeTime(oneHourAgo)).toBe("1h ago");

    const twentyThreeHoursAgo = NOW_SEC - 23 * 60 * 60;
    expect(formatRelativeTime(twentyThreeHoursAgo)).toBe("23h ago");
  });

  it("returns days ago for timestamps 24+ hours ago", () => {
    const oneDayAgo = NOW_SEC - 24 * 60 * 60;
    expect(formatRelativeTime(oneDayAgo)).toBe("1d ago");

    const sevenDaysAgo = NOW_SEC - 7 * 24 * 60 * 60;
    expect(formatRelativeTime(sevenDaysAgo)).toBe("7d ago");

    const thirtyDaysAgo = NOW_SEC - 30 * 24 * 60 * 60;
    expect(formatRelativeTime(thirtyDaysAgo)).toBe("30d ago");
  });

  it("handles boundary between minutes and hours", () => {
    const sixtyMinutesAgo = NOW_SEC - 60 * 60;
    expect(formatRelativeTime(sixtyMinutesAgo)).toBe("1h ago");
  });

  it("handles boundary between hours and days", () => {
    const twentyFourHoursAgo = NOW_SEC - 24 * 60 * 60;
    expect(formatRelativeTime(twentyFourHoursAgo)).toBe("1d ago");
  });
});

describe("formatTimestamp", () => {
  it("converts Unix timestamp (seconds) to readable date", () => {
    // 1700000000 seconds = November 14, 2023
    const timestamp = 1700000000; // Already in seconds
    const result = formatTimestamp(timestamp);

    // Should contain date components (exact format depends on locale)
    expect(result).toMatch(/\d{1,2}/); // Contains numbers
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles timestamp of 0", () => {
    const result = formatTimestamp(0);
    // Should return epoch date (Jan 1, 1970 UTC, which may be Dec 31, 1969 in western timezones)
    expect(result).toMatch(/1969|1970/);
  });

  it("returns consistent format", () => {
    const timestamp = 1700000000; // In seconds
    const result1 = formatTimestamp(timestamp);
    const result2 = formatTimestamp(timestamp);
    expect(result1).toBe(result2);
  });
});
