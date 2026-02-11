import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@net-protocol/core": path.resolve(__dirname, "../net-core/src"),
      "@net-protocol/feeds": path.resolve(__dirname, "../net-feeds/src"),
      "@net-protocol/cli": path.resolve(__dirname, "../net-cli/src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
});
