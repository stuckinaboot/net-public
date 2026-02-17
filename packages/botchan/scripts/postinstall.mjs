#!/usr/bin/env node

// Auto-install the botchan skill for AI coding tools (Claude Code, openclaw)
// on package installation. This is best-effort and will not fail the install.

import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

// Skip in CI environments
if (process.env.CI) {
  process.exit(0);
}

// Skip in monorepo workspace context (development) — net-core lives next door
const monorepoIndicator = resolve(process.cwd(), "../net-core/package.json");
if (existsSync(monorepoIndicator)) {
  process.exit(0);
}

try {
  execSync("npx -y skills add stuckinaboot/net-public", {
    stdio: "pipe",
    timeout: 60000,
  });
  console.log("Net Protocol skill installed for Claude Code");
} catch {
  console.log(
    "Tip: To install the Net Protocol skill for Claude Code, run: npx skills add stuckinaboot/net-public"
  );
}
