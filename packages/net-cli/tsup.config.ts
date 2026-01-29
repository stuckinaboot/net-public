import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "cli/index": "src/cli/index.ts" },
  format: ["esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["viem", "dotenv", "@net-protocol/core", "@net-protocol/storage", "@net-protocol/relay", "@net-protocol/netr"],
  treeshake: true,
  outExtension: () => ({ js: ".mjs" }),
});
