import { describe, it, expect } from "vitest";

describe("exports", () => {
  describe("main entry point (index.ts)", () => {
    it("should export all constants", async () => {
      const exports = await import("../index");

      expect(exports.PROFILE_CANVAS_STORAGE_KEY).toBeDefined();
      expect(exports.PROFILE_PICTURE_STORAGE_KEY).toBeDefined();
      expect(exports.PROFILE_X_USERNAME_STORAGE_KEY).toBeDefined();
      expect(exports.PROFILE_METADATA_STORAGE_KEY).toBeDefined();
      expect(exports.PROFILE_PICTURE_TOPIC).toBeDefined();
      expect(exports.PROFILE_METADATA_TOPIC).toBeDefined();
      expect(exports.PROFILE_CANVAS_TOPIC).toBeDefined();
    });

    it("should export all utility functions", async () => {
      const exports = await import("../index");

      expect(typeof exports.getValueArgForStorage).toBe("function");
      expect(typeof exports.getBytesArgsForStorage).toBe("function");
      expect(typeof exports.getProfilePictureStorageArgs).toBe("function");
      expect(typeof exports.getProfileMetadataStorageArgs).toBe("function");
      expect(typeof exports.getXUsernameStorageArgs).toBe("function");
      expect(typeof exports.getDisplayNameStorageArgs).toBe("function");
      expect(typeof exports.getProfileCanvasStorageArgs).toBe("function");
      expect(typeof exports.parseProfileMetadata).toBe("function");
      expect(typeof exports.isValidUrl).toBe("function");
      expect(typeof exports.isValidXUsername).toBe("function");
      expect(typeof exports.isValidDisplayName).toBe("function");
      expect(typeof exports.sanitizeCSS).toBe("function");
    });

    it("should export theme selectors, demo themes, and buildCSSPrompt", async () => {
      const exports = await import("../index");

      expect(exports.THEME_SELECTORS).toBeDefined();
      expect(Array.isArray(exports.THEME_SELECTORS)).toBe(true);
      expect(exports.DEMO_THEMES).toBeDefined();
      expect(typeof exports.DEMO_THEMES).toBe("object");
      expect(typeof exports.buildCSSPrompt).toBe("function");
    });

    it("should re-export STORAGE_CONTRACT from @net-protocol/storage", async () => {
      const exports = await import("../index");

      expect(exports.STORAGE_CONTRACT).toBeDefined();
      expect(exports.STORAGE_CONTRACT.address).toBeDefined();
      expect(exports.STORAGE_CONTRACT.abi).toBeDefined();
    });
  });

  describe("react entry point (react.ts)", () => {
    it("should export all hooks", async () => {
      const exports = await import("../react");

      expect(typeof exports.useProfilePicture).toBe("function");
      expect(typeof exports.useProfileXUsername).toBe("function");
      expect(typeof exports.useProfileCanvas).toBe("function");
      expect(typeof exports.useBasicUserProfileMetadata).toBe("function");
    });
  });
});
