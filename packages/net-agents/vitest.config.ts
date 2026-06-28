import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@net-protocol/core": path.resolve(__dirname, "../net-core/src"),
      "@net-protocol/relay": path.resolve(__dirname, "../net-relay/src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    include: ["src/__tests__/**/*.test.ts"],
  },
});
