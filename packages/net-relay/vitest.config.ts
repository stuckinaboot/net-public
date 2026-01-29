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
    environment: "node",
    testTimeout: 30000, // 30s for RPC calls
    // Run tests sequentially to avoid RPC rate limits
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true, // Run all tests in a single process sequentially
      },
    },
    include: ["src/__tests__/**/*.test.ts"],
  },
});

