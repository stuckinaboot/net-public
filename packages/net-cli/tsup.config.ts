import { defineConfig } from "tsup";

export default defineConfig([
  // Library entry
  {
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: {
      compilerOptions: {
        composite: false,
      },
    },
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ["viem", "dotenv"],
    treeshake: true,
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".js",
      };
    },
  },
  // CLI entry (shebang preserved from source)
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm"],
    splitting: false,
    sourcemap: true,
    external: ["viem", "dotenv"],
    treeshake: true,
    outExtension() {
      return {
        js: ".mjs",
      };
    },
  },
]);
