import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@net-protocol/core": path.resolve(__dirname, "../net-core/src"),
      "@net-protocol/storage": path.resolve(__dirname, "../net-storage/src"),
      "@net-protocol/relay": path.resolve(__dirname, "../net-relay/src"),
      "@net-protocol/netr": path.resolve(__dirname, "../net-netr/src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
