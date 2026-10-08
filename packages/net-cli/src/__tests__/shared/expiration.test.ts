import { describe, it, expect } from "vitest";
import { parseExpiration } from "../../shared/expiration";

const NOW = 1_800_000_000;

describe("parseExpiration", () => {
  it("returns undefined when the flag is omitted so the SDK default applies", () => {
    expect(parseExpiration(undefined, NOW)).toBeUndefined();
  });

  it("parses relative durations", () => {
    expect(parseExpiration("30m", NOW)).toBe(NOW + 30 * 60);
    expect(parseExpiration("12h", NOW)).toBe(NOW + 12 * 3600);
    expect(parseExpiration("30d", NOW)).toBe(NOW + 30 * 86400);
    expect(parseExpiration("4w", NOW)).toBe(NOW + 28 * 86400);
    expect(parseExpiration(" 30D ", NOW)).toBe(NOW + 30 * 86400);
  });

  it("accepts a future unix timestamp as-is", () => {
    expect(parseExpiration(String(NOW + 100), NOW)).toBe(NOW + 100);
  });

  it("rejects past timestamps, zero durations and unknown formats", () => {
    expect(() => parseExpiration(String(NOW - 1), NOW)).toThrow(/in the past/);
    expect(() => parseExpiration("30", NOW)).toThrow(/in the past/);
    expect(() => parseExpiration("0d", NOW)).toThrow(/greater than zero/);
    expect(() => parseExpiration("1 month", NOW)).toThrow(/duration like/);
    expect(() => parseExpiration("2026-12-01", NOW)).toThrow(/duration like/);
  });
});
