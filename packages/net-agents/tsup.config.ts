import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    "viem",
    "@net-protocol/core",
    "@net-protocol/relay",
  ],
  treeshake: true,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".js",
    };
  },
});
