/**
 * Test utilities for profile command tests
 */

export const TEST_CHAIN_ID = 8453;
export const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
export const TEST_PRIVATE_KEY =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export const TEST_PROFILE_PICTURE = "https://example.com/image.jpg";
export const TEST_X_USERNAME = "testuser";
export const TEST_BIO = "Hello, I'm a developer!";
export const TEST_CANVAS_CONTENT = "<html><body><h1>My Canvas</h1></body></html>";
export const TEST_CANVAS_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * Create mock storage data for profile picture
 */
export function createMockProfilePictureData(url: string = TEST_PROFILE_PICTURE) {
  return {
    text: "profile-picture",
    data: url,
    isXml: false,
  };
}

/**
 * Create mock storage data for profile metadata
 */
export function createMockProfileMetadataData(
  username: string = TEST_X_USERNAME,
  bio?: string
) {
  const metadata: { x_username?: string; bio?: string } = {};
  if (username) {
    metadata.x_username = `@${username}`;
  }
  if (bio) {
    metadata.bio = bio;
  }
  return {
    text: "profile-metadata",
    data: JSON.stringify(metadata),
    isXml: false,
  };
}

/**
 * Create options for profile get command
 */
export function createGetOptions(overrides?: {
  address?: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}) {
  return {
    address: overrides?.address ?? TEST_ADDRESS,
    chainId: overrides?.chainId ?? TEST_CHAIN_ID,
    rpcUrl: overrides?.rpcUrl,
    json: overrides?.json ?? false,
  };
}

/**
 * Create options for profile set-picture command
 */
export function createSetPictureOptions(overrides?: {
  url?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}) {
  return {
    url: overrides?.url ?? TEST_PROFILE_PICTURE,
    privateKey: overrides?.privateKey ?? TEST_PRIVATE_KEY,
    chainId: overrides?.chainId ?? TEST_CHAIN_ID,
    rpcUrl: overrides?.rpcUrl,
    encodeOnly: overrides?.encodeOnly ?? false,
  };
}

/**
 * Create options for profile set-username command
 */
export function createSetUsernameOptions(overrides?: {
  username?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}) {
  return {
    username: overrides?.username ?? TEST_X_USERNAME,
    privateKey: overrides?.privateKey ?? TEST_PRIVATE_KEY,
    chainId: overrides?.chainId ?? TEST_CHAIN_ID,
    rpcUrl: overrides?.rpcUrl,
    encodeOnly: overrides?.encodeOnly ?? false,
  };
}

/**
 * Create options for profile set-bio command
 */
export function createSetBioOptions(overrides?: {
  bio?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}) {
  return {
    bio: overrides?.bio ?? TEST_BIO,
    privateKey: overrides?.privateKey ?? TEST_PRIVATE_KEY,
    chainId: overrides?.chainId ?? TEST_CHAIN_ID,
    rpcUrl: overrides?.rpcUrl,
    encodeOnly: overrides?.encodeOnly ?? false,
  };
}

/**
 * Create options for profile set-canvas command
 * Note: If file is provided, content should be explicitly set to undefined
 */
export function createSetCanvasOptions(overrides?: {
  file?: string;
  content?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}) {
  // If overrides includes 'content' key (even if undefined), use that value
  // Otherwise default to TEST_CANVAS_CONTENT
  const hasContentKey = overrides && "content" in overrides;
  return {
    file: overrides?.file,
    content: hasContentKey ? overrides?.content : TEST_CANVAS_CONTENT,
    privateKey: overrides?.privateKey ?? TEST_PRIVATE_KEY,
    chainId: overrides?.chainId ?? TEST_CHAIN_ID,
    rpcUrl: overrides?.rpcUrl,
    encodeOnly: overrides?.encodeOnly ?? false,
  };
}

/**
 * Create options for profile get-canvas command
 */
export function createGetCanvasOptions(overrides?: {
  address?: string;
  output?: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}) {
  return {
    address: overrides?.address ?? TEST_ADDRESS,
    output: overrides?.output,
    chainId: overrides?.chainId ?? TEST_CHAIN_ID,
    rpcUrl: overrides?.rpcUrl,
    json: overrides?.json ?? false,
  };
}

/**
 * Create mock storage data for profile canvas
 */
export function createMockCanvasData(content: string = TEST_CANVAS_CONTENT) {
  return {
    text: "profile-compressed.html",
    data: content,
  };
}
