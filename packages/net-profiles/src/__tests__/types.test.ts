import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  ProfileMetadata,
  UserDisplayName,
  BasicUserProfileMetadata,
  UseProfileOptions,
  ProfileStorageArgs,
  UserProfile,
} from "../types";

describe("types", () => {
  describe("ProfileMetadata", () => {
    it("should allow x_username field", () => {
      const metadata: ProfileMetadata = { x_username: "@testuser" };
      expect(metadata.x_username).toBe("@testuser");
    });

    it("should allow optional x_username", () => {
      const metadata: ProfileMetadata = {};
      expect(metadata.x_username).toBeUndefined();
    });

    it("should allow display_name field", () => {
      const metadata: ProfileMetadata = { display_name: "Alice" };
      expect(metadata.display_name).toBe("Alice");
    });

    it("should allow all metadata fields together", () => {
      const metadata: ProfileMetadata = {
        x_username: "testuser",
        bio: "My bio",
        display_name: "Alice",
      };
      expect(metadata.x_username).toBe("testuser");
      expect(metadata.bio).toBe("My bio");
      expect(metadata.display_name).toBe("Alice");
    });
  });

  describe("UserDisplayName", () => {
    it("should have required displayName and isLoading", () => {
      const displayName: UserDisplayName = {
        displayName: "Test User",
        isLoading: false,
      };
      expect(displayName.displayName).toBe("Test User");
      expect(displayName.isLoading).toBe(false);
    });

    it("should allow optional ensName", () => {
      const displayName: UserDisplayName = {
        displayName: "test.eth",
        ensName: "test.eth",
        isLoading: false,
      };
      expect(displayName.ensName).toBe("test.eth");
    });

    it("should allow optional error", () => {
      const displayName: UserDisplayName = {
        displayName: "",
        isLoading: false,
        error: new Error("Failed to fetch"),
      };
      expect(displayName.error).toBeInstanceOf(Error);
    });
  });

  describe("BasicUserProfileMetadata", () => {
    it("should have required isLoading", () => {
      const metadata: BasicUserProfileMetadata = {
        isLoading: true,
      };
      expect(metadata.isLoading).toBe(true);
    });

    it("should allow optional profilePicture", () => {
      const metadata: BasicUserProfileMetadata = {
        profilePicture: "https://example.com/image.jpg",
        isLoading: false,
      };
      expect(metadata.profilePicture).toBe("https://example.com/image.jpg");
    });

    it("should allow optional xUsername", () => {
      const metadata: BasicUserProfileMetadata = {
        xUsername: "testuser",
        isLoading: false,
      };
      expect(metadata.xUsername).toBe("testuser");
    });

    it("should allow optional forwardedTo", () => {
      const metadata: BasicUserProfileMetadata = {
        forwardedTo: "0x1234567890123456789012345678901234567890",
        isLoading: false,
      };
      expect(metadata.forwardedTo).toBeDefined();
    });

    it("should allow optional displayName", () => {
      const metadata: BasicUserProfileMetadata = {
        displayName: "Alice",
        isLoading: false,
      };
      expect(metadata.displayName).toBe("Alice");
    });

    it("should allow all fields together", () => {
      const metadata: BasicUserProfileMetadata = {
        profilePicture: "https://example.com/image.jpg",
        xUsername: "testuser",
        displayName: "Alice",
        forwardedTo: "0x1234567890123456789012345678901234567890",
        isLoading: false,
      };
      expect(metadata.profilePicture).toBeDefined();
      expect(metadata.xUsername).toBeDefined();
      expect(metadata.displayName).toBeDefined();
      expect(metadata.forwardedTo).toBeDefined();
      expect(metadata.isLoading).toBe(false);
    });
  });

  describe("UseProfileOptions", () => {
    it("should require chainId and userAddress", () => {
      const options: UseProfileOptions = {
        chainId: 8453,
        userAddress: "0x1234567890123456789012345678901234567890",
      };
      expect(options.chainId).toBe(8453);
      expect(options.userAddress).toBeDefined();
    });

    it("should allow optional enabled", () => {
      const options: UseProfileOptions = {
        chainId: 8453,
        userAddress: "0x1234567890123456789012345678901234567890",
        enabled: false,
      };
      expect(options.enabled).toBe(false);
    });
  });

  describe("ProfileStorageArgs", () => {
    it("should have bytesKey, topic, and bytesValue", () => {
      const args: ProfileStorageArgs = {
        bytesKey: "0x" + "a".repeat(64) as `0x${string}`,
        topic: "profile-picture",
        bytesValue: "0x1234" as `0x${string}`,
      };
      expect(args.bytesKey).toMatch(/^0x/);
      expect(args.topic).toBe("profile-picture");
      expect(args.bytesValue).toMatch(/^0x/);
    });
  });

  describe("UserProfile", () => {
    it("should require address", () => {
      const profile: UserProfile = {
        address: "0x1234567890123456789012345678901234567890",
      };
      expect(profile.address).toBeDefined();
    });

    it("should allow all optional fields", () => {
      const profile: UserProfile = {
        address: "0x1234567890123456789012345678901234567890",
        profilePicture: "https://example.com/image.jpg",
        xUsername: "testuser",
        displayName: "Alice",
        canvas: "<div>Hello</div>",
        forwardedTo: "0x0987654321098765432109876543210987654321",
      };
      expect(profile.profilePicture).toBeDefined();
      expect(profile.xUsername).toBeDefined();
      expect(profile.displayName).toBeDefined();
      expect(profile.canvas).toBeDefined();
      expect(profile.forwardedTo).toBeDefined();
    });
  });
});
