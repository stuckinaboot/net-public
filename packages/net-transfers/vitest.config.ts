import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@net-protocol/core": path.resolve(__dirname, "../net-core/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
    testTimeout: 30000,
  },
});
