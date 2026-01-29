import { describe, it, expect } from "vitest";
import {
  PROFILE_CANVAS_STORAGE_KEY,
  PROFILE_PICTURE_STORAGE_KEY,
  PROFILE_X_USERNAME_STORAGE_KEY,
  PROFILE_METADATA_STORAGE_KEY,
  PROFILE_PICTURE_TOPIC,
  PROFILE_METADATA_TOPIC,
  PROFILE_CANVAS_TOPIC,
} from "../constants";

describe("constants", () => {
  describe("Storage Keys", () => {
    it("should have PROFILE_PICTURE_STORAGE_KEY defined", () => {
      expect(PROFILE_PICTURE_STORAGE_KEY).toBeDefined();
      expect(typeof PROFILE_PICTURE_STORAGE_KEY).toBe("string");
    });

    it("should have PROFILE_METADATA_STORAGE_KEY defined", () => {
      expect(PROFILE_METADATA_STORAGE_KEY).toBeDefined();
      expect(typeof PROFILE_METADATA_STORAGE_KEY).toBe("string");
    });

    it("should have PROFILE_CANVAS_STORAGE_KEY defined", () => {
      expect(PROFILE_CANVAS_STORAGE_KEY).toBeDefined();
      expect(typeof PROFILE_CANVAS_STORAGE_KEY).toBe("string");
    });

    it("should have PROFILE_X_USERNAME_STORAGE_KEY defined", () => {
      expect(PROFILE_X_USERNAME_STORAGE_KEY).toBeDefined();
      expect(typeof PROFILE_X_USERNAME_STORAGE_KEY).toBe("string");
    });

    it("should have storage keys under 32 bytes", () => {
      // Keys are designed to be under 32 bytes to avoid hashing complexity
      expect(PROFILE_PICTURE_STORAGE_KEY.length).toBeLessThanOrEqual(32);
      expect(PROFILE_METADATA_STORAGE_KEY.length).toBeLessThanOrEqual(32);
      expect(PROFILE_CANVAS_STORAGE_KEY.length).toBeLessThanOrEqual(32);
      expect(PROFILE_X_USERNAME_STORAGE_KEY.length).toBeLessThanOrEqual(32);
    });

    it("should have storage keys with proper versioning prefix", () => {
      const prefix = "net-beta0.0.1-profile-";
      expect(PROFILE_PICTURE_STORAGE_KEY).toContain(prefix);
      expect(PROFILE_METADATA_STORAGE_KEY).toContain(prefix);
      expect(PROFILE_CANVAS_STORAGE_KEY).toContain(prefix);
      expect(PROFILE_X_USERNAME_STORAGE_KEY).toContain(prefix);
    });

    it("should have unique storage keys", () => {
      const keys = [
        PROFILE_PICTURE_STORAGE_KEY,
        PROFILE_METADATA_STORAGE_KEY,
        PROFILE_CANVAS_STORAGE_KEY,
        PROFILE_X_USERNAME_STORAGE_KEY,
      ];
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  describe("Topics", () => {
    it("should have PROFILE_PICTURE_TOPIC defined", () => {
      expect(PROFILE_PICTURE_TOPIC).toBeDefined();
      expect(typeof PROFILE_PICTURE_TOPIC).toBe("string");
    });

    it("should have PROFILE_METADATA_TOPIC defined", () => {
      expect(PROFILE_METADATA_TOPIC).toBeDefined();
      expect(typeof PROFILE_METADATA_TOPIC).toBe("string");
    });

    it("should have PROFILE_CANVAS_TOPIC defined", () => {
      expect(PROFILE_CANVAS_TOPIC).toBeDefined();
      expect(typeof PROFILE_CANVAS_TOPIC).toBe("string");
    });

    it("should have unique topics", () => {
      const topics = [
        PROFILE_PICTURE_TOPIC,
        PROFILE_METADATA_TOPIC,
        PROFILE_CANVAS_TOPIC,
      ];
      const uniqueTopics = new Set(topics);
      expect(uniqueTopics.size).toBe(topics.length);
    });

    it("should have descriptive topic names", () => {
      expect(PROFILE_PICTURE_TOPIC).toContain("profile");
      expect(PROFILE_METADATA_TOPIC).toContain("profile");
      expect(PROFILE_CANVAS_TOPIC).toContain("profile");
    });
  });

  describe("Key-Topic Correspondence", () => {
    it("should have picture key and topic aligned", () => {
      expect(PROFILE_PICTURE_STORAGE_KEY).toContain("picture");
      expect(PROFILE_PICTURE_TOPIC).toContain("picture");
    });

    it("should have metadata key and topic aligned", () => {
      expect(PROFILE_METADATA_STORAGE_KEY).toContain("metadata");
      expect(PROFILE_METADATA_TOPIC).toContain("metadata");
    });

    it("should have canvas key and topic aligned", () => {
      expect(PROFILE_CANVAS_STORAGE_KEY).toContain("canvas");
      expect(PROFILE_CANVAS_TOPIC).toContain("canvas");
    });
  });
});
