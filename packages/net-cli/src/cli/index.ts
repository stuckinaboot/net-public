#!/usr/bin/env node

// Configure proxy support before any network requests
import { ProxyAgent, setGlobalDispatcher } from "undici";

const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY;
if (proxyUrl) {
  const agent = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(agent);
}

import "dotenv/config";
import { Command } from "commander";
import { createRequire } from "module";
import chalk from "chalk";
import { registerStorageCommand } from "../commands/storage";
import { registerMessageCommand } from "../commands/message";
import { registerChainsCommand } from "../commands/chains";
import { registerInfoCommand } from "../commands/info";
import { registerTokenCommand } from "../commands/token";
import { registerProfileCommand } from "../commands/profile";
import { registerBazaarCommand } from "../commands/bazaar";
import { registerFeedCommand } from "../commands/feed";
import { registerUpvoteCommand } from "../commands/upvote";
import { getUpdateInfo, printUpdateBanner } from "../utils/update-check";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

const program = new Command();

program
  .name("netp")
  .description("CLI tool for Net Protocol")
  .version(version);

// Register commands
registerStorageCommand(program);
registerMessageCommand(program);
registerChainsCommand(program);
registerInfoCommand(program);
registerTokenCommand(program);
registerProfileCommand(program);
registerBazaarCommand(program);
registerFeedCommand(program);
registerUpvoteCommand(program);

// Add update command
program
  .command("update")
  .description("Update netp to the latest version")
  .action(async () => {
    const { execSync } = await import("child_process");

    console.log("Updating @net-protocol/cli...");
    try {
      execSync("npm install -g @net-protocol/cli@latest", {
        stdio: "inherit",
      });
      console.log(chalk.green("\n✓ netp updated successfully"));
    } catch {
      console.error(
        chalk.red(
          "Failed to update. Try manually: npm install -g @net-protocol/cli@latest"
        )
      );
    }
  });

// Start non-blocking update check in parallel with command execution
const updatePromise = getUpdateInfo(version).catch(() => null);

await program.parseAsync();

// Show update notification after command completes (with timeout so we don't hang)
try {
  const updateInfo = await Promise.race([
    updatePromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
  ]);
  if (updateInfo) {
    printUpdateBanner(version, updateInfo.latest);
  }
} catch {
  // Never let update check interfere with normal operation
}
