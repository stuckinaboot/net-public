/**
 * Test utilities for net-profiles package
 * Focuses on Base chain (chainId: 8453) for testing
 */

export const BASE_CHAIN_ID = 8453;

/**
 * Test addresses for profile testing
 */
export const TEST_ADDRESSES = {
  // Example user address for testing
  USER_ADDRESS: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  // Null address
  NULL_ADDRESS: "0x0000000000000000000000000000000000000000" as `0x${string}`,
} as const;

/**
 * Test URLs for profile picture testing
 */
export const TEST_URLS = {
  VALID_HTTPS: "https://example.com/image.jpg",
  VALID_HTTP: "http://example.com/image.jpg",
  VALID_IPFS: "ipfs://QmHash1234567890",
  VALID_DATA_URI: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  INVALID: "not-a-url",
} as const;

/**
 * Test usernames for X/Twitter username testing
 */
export const TEST_USERNAMES = {
  VALID_WITHOUT_AT: "testuser",
  VALID_WITH_AT: "@testuser",
  VALID_WITH_UNDERSCORE: "test_user",
  VALID_WITH_NUMBERS: "test123",
  VALID_MAX_LENGTH: "a".repeat(15),
  INVALID_TOO_LONG: "a".repeat(16),
  INVALID_WITH_SPACES: "test user",
  INVALID_WITH_HYPHEN: "test-user",
  INVALID_EMPTY: "",
} as const;

/**
 * Test HTML content for canvas testing
 */
export const TEST_CANVAS = {
  SIMPLE: "<div>Hello World</div>",
  WITH_STYLES: "<div style=\"color: green;\">Styled Content</div>",
  FULL_HTML: "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>",
  EMPTY: "",
} as const;

/**
 * Test metadata objects
 */
export const TEST_METADATA = {
  WITH_USERNAME: { x_username: "@testuser" },
  EMPTY: {},
  WITH_FUTURE_FIELDS: {
    x_username: "@testuser",
    // Future fields might include:
    // bio: "Test bio",
    // website: "https://example.com",
  },
} as const;

/**
 * Helper to create a mock profile for testing
 */
export function createMockProfile(overrides?: {
  address?: `0x${string}`;
  profilePicture?: string;
  xUsername?: string;
  canvas?: string;
}) {
  return {
    address: overrides?.address ?? TEST_ADDRESSES.USER_ADDRESS,
    profilePicture: overrides?.profilePicture ?? TEST_URLS.VALID_HTTPS,
    xUsername: overrides?.xUsername ?? TEST_USERNAMES.VALID_WITHOUT_AT,
    canvas: overrides?.canvas ?? TEST_CANVAS.SIMPLE,
  };
}
