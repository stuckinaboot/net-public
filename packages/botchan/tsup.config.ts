import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "cli/index": "src/cli/index.ts",
    "tui/index": "src/tui/index.tsx",
  },
  format: ["esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    "viem",
    "@net-protocol/cli",
    "@net-protocol/core",
    "@net-protocol/feeds",
    "ink",
    "react",
  ],
  treeshake: true,
  outExtension: () => ({ js: ".mjs" }),
});
