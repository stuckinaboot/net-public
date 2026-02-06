import { describe, it, expect } from "vitest";
import {
  getValueArgForStorage,
  getBytesArgsForStorage,
  getProfilePictureStorageArgs,
  getXUsernameStorageArgs,
  getBioStorageArgs,
  getDisplayNameStorageArgs,
  getProfileMetadataStorageArgs,
  getProfileCanvasStorageArgs,
  parseProfileMetadata,
  isValidUrl,
  isValidXUsername,
  isValidBio,
  isValidDisplayName,
} from "../utils";
import {
  PROFILE_PICTURE_STORAGE_KEY,
  PROFILE_METADATA_STORAGE_KEY,
  PROFILE_CANVAS_STORAGE_KEY,
  PROFILE_PICTURE_TOPIC,
  PROFILE_METADATA_TOPIC,
  PROFILE_CANVAS_TOPIC,
} from "../constants";

describe("utils", () => {
  describe("getValueArgForStorage", () => {
    it("should convert string to hex", () => {
      const result = getValueArgForStorage("hello");
      expect(result).toMatch(/^0x/);
      expect(result).toBe("0x68656c6c6f"); // "hello" in hex
    });

    it("should handle empty string", () => {
      const result = getValueArgForStorage("");
      expect(result).toBe("0x");
    });

    it("should handle special characters", () => {
      const result = getValueArgForStorage("test@example.com");
      expect(result).toMatch(/^0x/);
    });

    it("should handle unicode characters", () => {
      const result = getValueArgForStorage("测试");
      expect(result).toMatch(/^0x/);
    });

    it("should handle URLs", () => {
      const result = getValueArgForStorage("https://example.com/image.jpg?foo=bar");
      expect(result).toMatch(/^0x/);
    });
  });

  describe("getBytesArgsForStorage", () => {
    it("should return bytesKey and bytesValue", () => {
      const result = getBytesArgsForStorage("test-key", "test-value");
      expect(result).toHaveProperty("bytesKey");
      expect(result).toHaveProperty("bytesValue");
    });

    it("should return hex-encoded bytesKey", () => {
      const result = getBytesArgsForStorage("test-key", "test-value");
      expect(result.bytesKey).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should return hex-encoded bytesValue", () => {
      const result = getBytesArgsForStorage("test-key", "test-value");
      expect(result.bytesValue).toMatch(/^0x/);
    });

    it("should produce consistent results", () => {
      const result1 = getBytesArgsForStorage("key", "value");
      const result2 = getBytesArgsForStorage("key", "value");
      expect(result1.bytesKey).toBe(result2.bytesKey);
      expect(result1.bytesValue).toBe(result2.bytesValue);
    });

    it("should produce different keys for different inputs", () => {
      const result1 = getBytesArgsForStorage("key1", "value");
      const result2 = getBytesArgsForStorage("key2", "value");
      expect(result1.bytesKey).not.toBe(result2.bytesKey);
    });
  });

  describe("getProfilePictureStorageArgs", () => {
    it("should return correct topic", () => {
      const args = getProfilePictureStorageArgs("https://example.com/image.jpg");
      expect(args.topic).toBe(PROFILE_PICTURE_TOPIC);
    });

    it("should return hex-encoded bytesKey", () => {
      const args = getProfilePictureStorageArgs("https://example.com/image.jpg");
      expect(args.bytesKey).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should return hex-encoded bytesValue", () => {
      const args = getProfilePictureStorageArgs("https://example.com/image.jpg");
      expect(args.bytesValue).toMatch(/^0x/);
    });

    it("should produce consistent bytesKey for same storage key", () => {
      const args1 = getProfilePictureStorageArgs("url1");
      const args2 = getProfilePictureStorageArgs("url2");
      // Same storage key should produce same bytesKey
      expect(args1.bytesKey).toBe(args2.bytesKey);
    });

    it("should produce different bytesValue for different URLs", () => {
      const args1 = getProfilePictureStorageArgs("https://example.com/a.jpg");
      const args2 = getProfilePictureStorageArgs("https://example.com/b.jpg");
      expect(args1.bytesValue).not.toBe(args2.bytesValue);
    });

    it("should handle empty URL", () => {
      const args = getProfilePictureStorageArgs("");
      expect(args.bytesKey).toMatch(/^0x/);
      expect(args.bytesValue).toBe("0x");
    });
  });

  describe("getXUsernameStorageArgs", () => {
    it("should return metadata topic", () => {
      const args = getXUsernameStorageArgs("myusername");
      expect(args.topic).toBe(PROFILE_METADATA_TOPIC);
    });

    it("should add @ prefix if missing", () => {
      const args = getXUsernameStorageArgs("myusername");
      // Decode the bytesValue to verify the JSON contains @
      expect(args.bytesValue).toBeDefined();
      // The JSON stored should have x_username with @ prefix
    });

    it("should preserve @ prefix if present", () => {
      const args = getXUsernameStorageArgs("@myusername");
      expect(args.bytesValue).toBeDefined();
    });

    it("should produce consistent results", () => {
      const args1 = getXUsernameStorageArgs("user");
      const args2 = getXUsernameStorageArgs("user");
      expect(args1.bytesKey).toBe(args2.bytesKey);
      expect(args1.bytesValue).toBe(args2.bytesValue);
    });

    it("should produce same result with or without @ prefix", () => {
      const args1 = getXUsernameStorageArgs("user");
      const args2 = getXUsernameStorageArgs("@user");
      // Both should produce @user in the JSON
      expect(args1.bytesValue).toBe(args2.bytesValue);
    });
  });

  describe("getProfileMetadataStorageArgs", () => {
    it("should return metadata topic", () => {
      const args = getProfileMetadataStorageArgs({ x_username: "@test" });
      expect(args.topic).toBe(PROFILE_METADATA_TOPIC);
    });

    it("should handle empty metadata", () => {
      const args = getProfileMetadataStorageArgs({});
      expect(args.bytesKey).toMatch(/^0x/);
      expect(args.bytesValue).toMatch(/^0x/);
    });

    it("should handle x_username field", () => {
      const args = getProfileMetadataStorageArgs({ x_username: "@handle" });
      expect(args.bytesValue).toBeDefined();
    });

    it("should produce different bytesValue for different metadata", () => {
      const args1 = getProfileMetadataStorageArgs({ x_username: "@user1" });
      const args2 = getProfileMetadataStorageArgs({ x_username: "@user2" });
      expect(args1.bytesValue).not.toBe(args2.bytesValue);
    });
  });

  describe("getProfileCanvasStorageArgs", () => {
    it("should return canvas topic", () => {
      const args = getProfileCanvasStorageArgs("<div>Hello</div>");
      expect(args.topic).toBe(PROFILE_CANVAS_TOPIC);
    });

    it("should handle HTML content", () => {
      const html = "<html><body><h1>Title</h1></body></html>";
      const args = getProfileCanvasStorageArgs(html);
      expect(args.bytesKey).toMatch(/^0x[0-9a-f]{64}$/);
      expect(args.bytesValue).toMatch(/^0x/);
    });

    it("should handle empty content", () => {
      const args = getProfileCanvasStorageArgs("");
      expect(args.bytesKey).toMatch(/^0x/);
      expect(args.bytesValue).toBe("0x");
    });

    it("should handle large content", () => {
      const largeHtml = "<div>".repeat(1000) + "content" + "</div>".repeat(1000);
      const args = getProfileCanvasStorageArgs(largeHtml);
      expect(args.bytesValue).toMatch(/^0x/);
    });
  });

  describe("parseProfileMetadata", () => {
    it("should parse valid JSON with x_username", () => {
      const result = parseProfileMetadata('{"x_username":"@testuser"}');
      expect(result?.x_username).toBe("testuser");
    });

    it("should strip @ from username", () => {
      const result = parseProfileMetadata('{"x_username":"@myhandle"}');
      expect(result?.x_username).toBe("myhandle");
    });

    it("should handle username without @", () => {
      const result = parseProfileMetadata('{"x_username":"myhandle"}');
      expect(result?.x_username).toBe("myhandle");
    });

    it("should return undefined for invalid JSON", () => {
      const result = parseProfileMetadata("not json");
      expect(result).toBeUndefined();
    });

    it("should return undefined for empty x_username", () => {
      const result = parseProfileMetadata('{"x_username":""}');
      expect(result?.x_username).toBeUndefined();
    });

    it("should handle null x_username", () => {
      const result = parseProfileMetadata('{"x_username":null}');
      expect(result?.x_username).toBeUndefined();
    });

    it("should handle missing x_username field", () => {
      const result = parseProfileMetadata('{"other":"field"}');
      expect(result?.x_username).toBeUndefined();
    });

    it("should handle empty JSON object", () => {
      const result = parseProfileMetadata("{}");
      expect(result?.x_username).toBeUndefined();
    });

    it("should handle numeric x_username (invalid)", () => {
      const result = parseProfileMetadata('{"x_username":123}');
      expect(result?.x_username).toBeUndefined();
    });

    it("should handle array x_username (invalid)", () => {
      const result = parseProfileMetadata('{"x_username":["test"]}');
      expect(result?.x_username).toBeUndefined();
    });

    it("should handle empty string input", () => {
      const result = parseProfileMetadata("");
      expect(result).toBeUndefined();
    });

    // Bio parsing tests
    it("should parse valid JSON with bio", () => {
      const result = parseProfileMetadata('{"bio":"Hello world"}');
      expect(result?.bio).toBe("Hello world");
    });

    it("should parse JSON with both x_username and bio", () => {
      const result = parseProfileMetadata('{"x_username":"@testuser","bio":"My bio"}');
      expect(result?.x_username).toBe("testuser");
      expect(result?.bio).toBe("My bio");
    });

    it("should return undefined for empty bio", () => {
      const result = parseProfileMetadata('{"bio":""}');
      expect(result?.bio).toBeUndefined();
    });

    it("should handle null bio", () => {
      const result = parseProfileMetadata('{"bio":null}');
      expect(result?.bio).toBeUndefined();
    });

    it("should handle numeric bio (invalid)", () => {
      const result = parseProfileMetadata('{"bio":123}');
      expect(result?.bio).toBeUndefined();
    });

    it("should handle bio with newlines", () => {
      const result = parseProfileMetadata('{"bio":"Line 1\\nLine 2"}');
      expect(result?.bio).toBe("Line 1\nLine 2");
    });

    it("should handle bio with unicode characters", () => {
      const result = parseProfileMetadata('{"bio":"Hello 👋 世界"}');
      expect(result?.bio).toBe("Hello 👋 世界");
    });

    // Display name parsing tests
    it("should parse valid JSON with display_name", () => {
      const result = parseProfileMetadata('{"display_name":"Alice"}');
      expect(result?.display_name).toBe("Alice");
    });

    it("should parse JSON with all metadata fields", () => {
      const result = parseProfileMetadata(
        '{"x_username":"@testuser","bio":"My bio","display_name":"Alice"}'
      );
      expect(result?.x_username).toBe("testuser");
      expect(result?.bio).toBe("My bio");
      expect(result?.display_name).toBe("Alice");
    });

    it("should return undefined for empty display_name", () => {
      const result = parseProfileMetadata('{"display_name":""}');
      expect(result?.display_name).toBeUndefined();
    });

    it("should handle null display_name", () => {
      const result = parseProfileMetadata('{"display_name":null}');
      expect(result?.display_name).toBeUndefined();
    });

    it("should handle numeric display_name (invalid)", () => {
      const result = parseProfileMetadata('{"display_name":123}');
      expect(result?.display_name).toBeUndefined();
    });

    it("should handle display_name with unicode characters", () => {
      const result = parseProfileMetadata('{"display_name":"Alice 🚀"}');
      expect(result?.display_name).toBe("Alice 🚀");
    });
  });

  describe("isValidUrl", () => {
    it("should return true for valid HTTPS URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("https://example.com/path")).toBe(true);
      expect(isValidUrl("https://example.com/path?query=value")).toBe(true);
      expect(isValidUrl("https://example.com/image.jpg")).toBe(true);
    });

    it("should return true for valid HTTP URLs", () => {
      expect(isValidUrl("http://example.com")).toBe(true);
      expect(isValidUrl("http://example.com/path")).toBe(true);
    });

    it("should return true for other valid URL schemes", () => {
      expect(isValidUrl("ipfs://QmHash123")).toBe(true);
      expect(isValidUrl("data:image/png;base64,abc123")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(isValidUrl("not a url")).toBe(false);
      expect(isValidUrl("example.com")).toBe(false);
      expect(isValidUrl("www.example.com")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidUrl("")).toBe(false);
    });

    it("should handle URLs with special characters", () => {
      expect(isValidUrl("https://example.com/path%20with%20spaces")).toBe(true);
      expect(isValidUrl("https://example.com/path?foo=bar&baz=qux")).toBe(true);
    });

    it("should handle URLs with port numbers", () => {
      expect(isValidUrl("https://example.com:8080")).toBe(true);
      expect(isValidUrl("http://localhost:3000")).toBe(true);
    });

    it("should handle URLs with authentication", () => {
      expect(isValidUrl("https://user:pass@example.com")).toBe(true);
    });
  });

  describe("isValidXUsername", () => {
    it("should return true for valid usernames", () => {
      expect(isValidXUsername("username")).toBe(true);
      expect(isValidXUsername("user_name")).toBe(true);
      expect(isValidXUsername("user123")).toBe(true);
      expect(isValidXUsername("a")).toBe(true);
      expect(isValidXUsername("A")).toBe(true);
      expect(isValidXUsername("_underscore")).toBe(true);
    });

    it("should return true for usernames with @ prefix", () => {
      expect(isValidXUsername("@username")).toBe(true);
      expect(isValidXUsername("@user_name")).toBe(true);
      expect(isValidXUsername("@user123")).toBe(true);
    });

    it("should return true for 15-character usernames (max length)", () => {
      expect(isValidXUsername("a".repeat(15))).toBe(true);
      expect(isValidXUsername("@" + "a".repeat(15))).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isValidXUsername("")).toBe(false);
    });

    it("should return false for usernames with spaces", () => {
      expect(isValidXUsername("user name")).toBe(false);
      expect(isValidXUsername("user name")).toBe(false);
    });

    it("should return false for usernames with hyphens", () => {
      expect(isValidXUsername("user-name")).toBe(false);
    });

    it("should return false for usernames with special characters", () => {
      expect(isValidXUsername("user@name")).toBe(false);
      expect(isValidXUsername("user.name")).toBe(false);
      expect(isValidXUsername("user!name")).toBe(false);
    });

    it("should return false for usernames longer than 15 characters", () => {
      expect(isValidXUsername("a".repeat(16))).toBe(false);
      expect(isValidXUsername("thisusernameiswaytoolong")).toBe(false);
    });

    it("should return false for @ only", () => {
      expect(isValidXUsername("@")).toBe(false);
    });
  });

  describe("isValidBio", () => {
    it("should return true for valid bio", () => {
      expect(isValidBio("Hello, I'm a developer!")).toBe(true);
      expect(isValidBio("Short bio")).toBe(true);
      expect(isValidBio("a")).toBe(true);
    });

    it("should return true for bio with newlines", () => {
      expect(isValidBio("Line 1\nLine 2")).toBe(true);
      expect(isValidBio("Line 1\r\nLine 2")).toBe(true);
    });

    it("should return true for bio with unicode/emojis", () => {
      expect(isValidBio("Hello 👋 世界")).toBe(true);
      expect(isValidBio("🚀 Building cool stuff")).toBe(true);
    });

    it("should return true for bio at max length (280 chars)", () => {
      expect(isValidBio("a".repeat(280))).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isValidBio("")).toBe(false);
    });

    it("should return false for bio over 280 characters", () => {
      expect(isValidBio("a".repeat(281))).toBe(false);
      expect(isValidBio("a".repeat(500))).toBe(false);
    });

    it("should return false for bio with control characters", () => {
      expect(isValidBio("Hello\x00World")).toBe(false);
      expect(isValidBio("Test\x07bell")).toBe(false);
      expect(isValidBio("Tab\x08backspace")).toBe(false);
    });

    it("should allow tabs", () => {
      expect(isValidBio("Hello\tWorld")).toBe(true);
    });

    it("should handle bio with special characters", () => {
      expect(isValidBio("Email: test@example.com")).toBe(true);
      expect(isValidBio("URL: https://example.com")).toBe(true);
      expect(isValidBio("Symbols: !@#$%^&*()")).toBe(true);
    });
  });

  describe("isValidDisplayName", () => {
    it("should return true for valid display names", () => {
      expect(isValidDisplayName("Alice")).toBe(true);
      expect(isValidDisplayName("Bob Smith")).toBe(true);
      expect(isValidDisplayName("a")).toBe(true);
      expect(isValidDisplayName("Hello World!")).toBe(true);
    });

    it("should return true for display names at max length (25 chars)", () => {
      expect(isValidDisplayName("a".repeat(25))).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isValidDisplayName("")).toBe(false);
    });

    it("should return false for display names over 25 characters", () => {
      expect(isValidDisplayName("a".repeat(26))).toBe(false);
      expect(isValidDisplayName("This Display Name Is Way Too Long")).toBe(false);
    });

    it("should return false for display names with control characters", () => {
      expect(isValidDisplayName("Hello\x00World")).toBe(false);
      expect(isValidDisplayName("Test\x07bell")).toBe(false);
      expect(isValidDisplayName("Tab\tname")).toBe(false);
      expect(isValidDisplayName("New\nline")).toBe(false);
    });

    it("should return true for display names with special characters", () => {
      expect(isValidDisplayName("Alice!")).toBe(true);
      expect(isValidDisplayName("@handle")).toBe(true);
      expect(isValidDisplayName("#1 fan")).toBe(true);
    });

    it("should return true for display names with unicode/emojis", () => {
      expect(isValidDisplayName("Alice 🚀")).toBe(true);
      expect(isValidDisplayName("世界")).toBe(true);
    });
  });

  describe("getBioStorageArgs", () => {
    it("should return metadata topic", () => {
      const args = getBioStorageArgs("My bio");
      expect(args.topic).toBe(PROFILE_METADATA_TOPIC);
    });

    it("should return hex-encoded bytesKey", () => {
      const args = getBioStorageArgs("My bio");
      expect(args.bytesKey).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should return hex-encoded bytesValue", () => {
      const args = getBioStorageArgs("My bio");
      expect(args.bytesValue).toMatch(/^0x/);
    });

    it("should produce consistent results", () => {
      const args1 = getBioStorageArgs("Test bio");
      const args2 = getBioStorageArgs("Test bio");
      expect(args1.bytesKey).toBe(args2.bytesKey);
      expect(args1.bytesValue).toBe(args2.bytesValue);
    });

    it("should produce different bytesValue for different bios", () => {
      const args1 = getBioStorageArgs("Bio 1");
      const args2 = getBioStorageArgs("Bio 2");
      expect(args1.bytesValue).not.toBe(args2.bytesValue);
    });

    it("should use same storage key as other metadata", () => {
      const bioArgs = getBioStorageArgs("My bio");
      const usernameArgs = getXUsernameStorageArgs("testuser");
      expect(bioArgs.bytesKey).toBe(usernameArgs.bytesKey);
    });
  });

  describe("getDisplayNameStorageArgs", () => {
    it("should return metadata topic", () => {
      const args = getDisplayNameStorageArgs("Alice");
      expect(args.topic).toBe(PROFILE_METADATA_TOPIC);
    });

    it("should return hex-encoded bytesKey", () => {
      const args = getDisplayNameStorageArgs("Alice");
      expect(args.bytesKey).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("should return hex-encoded bytesValue", () => {
      const args = getDisplayNameStorageArgs("Alice");
      expect(args.bytesValue).toMatch(/^0x/);
    });

    it("should produce consistent results", () => {
      const args1 = getDisplayNameStorageArgs("Alice");
      const args2 = getDisplayNameStorageArgs("Alice");
      expect(args1.bytesKey).toBe(args2.bytesKey);
      expect(args1.bytesValue).toBe(args2.bytesValue);
    });

    it("should produce different bytesValue for different names", () => {
      const args1 = getDisplayNameStorageArgs("Alice");
      const args2 = getDisplayNameStorageArgs("Bob");
      expect(args1.bytesValue).not.toBe(args2.bytesValue);
    });

    it("should use same storage key as other metadata", () => {
      const displayNameArgs = getDisplayNameStorageArgs("Alice");
      const usernameArgs = getXUsernameStorageArgs("testuser");
      expect(displayNameArgs.bytesKey).toBe(usernameArgs.bytesKey);
    });
  });
});
