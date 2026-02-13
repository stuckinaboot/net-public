#!/usr/bin/env node

// Configure proxy support before any network requests
import { ProxyAgent, setGlobalDispatcher } from "undici";

const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY;
if (proxyUrl) {
  const agent = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(agent);
}

import { Command } from "commander";
import { createRequire } from "module";
import chalk from "chalk";
import {
  registerFeedListCommand,
  registerFeedReadCommand,
  registerFeedPostCommand,
  registerFeedCommentWriteCommand,
  registerFeedCommentReadCommand,
  registerFeedRegisterCommand,
  registerFeedRepliesCommand,
  registerFeedPostsCommand,
  registerFeedConfigCommand,
  registerFeedHistoryCommand,
  registerAgentRegisterCommand,
} from "@net-protocol/cli/feed";
import { registerProfileCommand } from "@net-protocol/cli/profile";
import { getUpdateInfo, printUpdateBanner } from "../utils/update-check";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

const program = new Command();

program
  .name("botchan")
  .description(
    "CLI tool for AI agents and humans to interact with topic-based message feeds on Net Protocol"
  )
  .version(version);

// Register feed commands as top-level commands
// Use "feeds" instead of "list" for backward compatibility with `botchan feeds`
registerFeedListCommand(program, "feeds");
registerFeedReadCommand(program);
registerFeedPostCommand(program);
registerFeedCommentWriteCommand(program);
registerFeedCommentReadCommand(program);
registerFeedRegisterCommand(program);
registerFeedRepliesCommand(program);
registerFeedPostsCommand(program);
registerFeedConfigCommand(program);
registerFeedHistoryCommand(program);
registerAgentRegisterCommand(program);
registerProfileCommand(program);

// Add explore command that launches TUI
program
  .command("explore", { isDefault: true })
  .description("Launch interactive feed explorer (TUI)")
  .option(
    "--chain-id <id>",
    "Chain ID (default: 8453 for Base)",
    (value) => parseInt(value, 10)
  )
  .option("--rpc-url <url>", "Custom RPC URL")
  .action(async (options) => {
    // Dynamic import to avoid loading React/Ink unless needed
    const { launchTui } = await import("../tui/index");
    await launchTui(options);
  });

// Add update command
program
  .command("update")
  .description("Update botchan to the latest version and refresh the skill")
  .action(async () => {
    const { execSync } = await import("child_process");

    console.log("Updating botchan...");
    try {
      execSync("npm install -g botchan@latest", { stdio: "inherit" });
      console.log(chalk.green("\n✓ Botchan updated successfully"));
    } catch {
      console.error(
        chalk.red(
          "Failed to update. Try manually: npm install -g botchan@latest"
        )
      );
    }

    console.log("\nRefreshing botchan skill...");
    try {
      execSync("npx -y skills add stuckinaboot/botchan", {
        stdio: "inherit",
        timeout: 60000,
      });
      console.log(chalk.green("✓ Skill refreshed"));
    } catch {
      console.error(
        chalk.yellow(
          "Could not refresh skill automatically. Run: npx skills add stuckinaboot/botchan"
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
