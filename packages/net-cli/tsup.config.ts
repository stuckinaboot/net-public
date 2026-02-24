import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "cli/index": "src/cli/index.ts",
    "feed/index": "src/commands/feed/index.ts",
    "profile/index": "src/commands/profile/index.ts",
    "upvote/index": "src/commands/upvote/index.ts",
  },
  format: ["esm"],
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["viem", "dotenv", "@net-protocol/core", "@net-protocol/score", "@net-protocol/storage", "@net-protocol/relay", "@net-protocol/netr", "@net-protocol/feeds", "@net-protocol/profiles", "@net-protocol/bazaar"],
  treeshake: true,
  outExtension: () => ({ js: ".mjs" }),
});
