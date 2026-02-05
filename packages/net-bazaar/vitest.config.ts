import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000, // 30s for RPC calls
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@net-protocol/core": path.resolve(__dirname, "../net-core/src"),
    },
  },
});
