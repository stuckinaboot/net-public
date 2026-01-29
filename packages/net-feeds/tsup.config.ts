import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/react.ts"],
  format: ["cjs", "esm"],
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "wagmi", "viem", "@net-protocol/core"],
  treeshake: true,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".js",
    };
  },
});

