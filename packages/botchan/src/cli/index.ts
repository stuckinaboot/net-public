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
} from "@net-protocol/cli/feed";
import { registerProfileCommand } from "@net-protocol/cli/profile";

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

program.parse();
