import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "cli/index": "src/cli/index.ts" },
  format: ["esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["viem", "dotenv"],
  treeshake: true,
  outExtension: () => ({ js: ".mjs" }),
});
