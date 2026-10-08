import { exitWithError } from "./output";

const DURATION_UNIT_SECONDS: Record<string, number> = {
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
  w: 7 * 24 * 60 * 60,
};

/**
 * Parse the bazaar `--expiration` flag into a unix timestamp (seconds).
 *
 * Accepts either a relative duration (`30m`, `12h`, `30d`, `4w`) or an
 * absolute unix timestamp in seconds (e.g. `1767225600`). Returns undefined
 * when the flag is omitted so the SDK applies its default (24 hours).
 */
export function parseExpiration(
  value: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim().toLowerCase();

  const duration = trimmed.match(/^(\d+)([mhdw])$/);
  if (duration) {
    const amount = parseInt(duration[1], 10);
    if (amount <= 0) {
      throw new Error(`Invalid --expiration "${value}": duration must be greater than zero`);
    }
    return nowSeconds + amount * DURATION_UNIT_SECONDS[duration[2]];
  }

  if (/^\d+$/.test(trimmed)) {
    const timestamp = parseInt(trimmed, 10);
    if (timestamp <= nowSeconds) {
      throw new Error(`Invalid --expiration "${value}": timestamp is in the past`);
    }
    return timestamp;
  }

  throw new Error(
    `Invalid --expiration "${value}": use a duration like 12h, 30d or 4w, or a unix timestamp in seconds`
  );
}

/**
 * Same as parseExpiration, but exits the CLI with a readable error on bad input.
 */
export function resolveExpiration(value: string | undefined): number | undefined {
  try {
    return parseExpiration(value);
  } catch (error) {
    exitWithError(error instanceof Error ? error.message : String(error));
  }
}
