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
  execSync("npx -y skills add stuckinaboot/botchan", {
    stdio: "pipe",
    timeout: 60000,
  });
  console.log("Botchan skill installed for Claude Code");
} catch {
  console.log(
    "Tip: To install the botchan skill for Claude Code, run: npx skills add stuckinaboot/botchan"
  );
}
