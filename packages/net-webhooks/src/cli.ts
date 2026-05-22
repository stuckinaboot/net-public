#!/usr/bin/env node

import { Command } from "commander";
import { SubscriptionStore } from "./subscriptions.js";
import { NetWatcher } from "./watcher.js";
import { createManagementServer } from "./server.js";

const program = new Command();

program
  .name("net-webhooks")
  .description("Push notification server for Net Protocol messages")
  .version("0.1.0");

program
  .command("serve")
  .description("Start the webhook watcher and management API")
  .option("--chain-id <id>", "Chain ID to watch", "8453")
  .option("--port <port>", "Management API port", "3847")
  .option("--rpc <urls...>", "Custom RPC URLs")
  .option("--poll-interval <ms>", "Polling interval in ms", "2000")
  .option("--max-retries <n>", "Max delivery retries", "3")
  .action((opts) => {
    const chainId = parseInt(opts.chainId, 10);
    const port = parseInt(opts.port, 10);

    const store = new SubscriptionStore();

    const watcher = new NetWatcher(
      store,
      {
        chainId,
        rpcUrls: opts.rpc,
        pollIntervalMs: parseInt(opts.pollInterval, 10),
        maxRetries: parseInt(opts.maxRetries, 10),
      },
      (event) => {
        const r = event.result;
        const status = r.success ? "✓" : "✗";
        console.log(
          `[${status}] ${r.subscriptionId} → ${r.success ? r.statusCode : r.error} (attempt ${r.retryCount + 1})`
        );
      }
    );

    const server = createManagementServer({ store, watcher, chainId });

    watcher.start();
    server.listen(port, "127.0.0.1", () => {
      console.log(`net-webhooks running`);
      console.log(`  Chain: ${chainId}`);
      console.log(`  API:   http://localhost:${port}`);
      console.log(`  Watching for Net Protocol events...`);
      console.log();
      console.log(`Subscribe:`);
      console.log(`  curl -X POST http://localhost:${port}/subscriptions \\`);
      console.log(`    -H "Content-Type: application/json" \\`);
      console.log(`    -d '{"filter":{"topic":"general"},"webhookUrl":"https://your-agent.com/hook"}'`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("\nShutting down...");
      watcher.stop();
      server.close(() => process.exit(0));
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });

program
  .command("subscribe")
  .description("Register a webhook subscription (requires running server)")
  .requiredOption("--url <webhookUrl>", "Webhook endpoint URL")
  .option("--topic <topic>", "Filter by topic")
  .option("--sender <address>", "Filter by sender address")
  .option("--app <address>", "Filter by app contract address")
  .option("--secret <secret>", "HMAC secret for signature verification")
  .option("--server <url>", "Management server URL", "http://localhost:3847")
  .action(async (opts) => {
    const filter: Record<string, string> = {};
    if (opts.topic) filter.topic = opts.topic;
    if (opts.sender) filter.sender = opts.sender;
    if (opts.app) filter.appAddress = opts.app;

    if (Object.keys(filter).length === 0) {
      console.error("Error: At least one filter (--topic, --sender, --app) is required");
      process.exit(1);
    }

    try {
      const res = await fetch(`${opts.server}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter,
          webhookUrl: opts.url,
          secret: opts.secret,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log("Subscription created:");
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.error("Error:", (data as any).error);
        process.exit(1);
      }
    } catch (err) {
      console.error("Failed to connect to server:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List all subscriptions")
  .option("--server <url>", "Management server URL", "http://localhost:3847")
  .action(async (opts) => {
    try {
      const res = await fetch(`${opts.server}/subscriptions`);
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Failed to connect to server:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("remove <id>")
  .description("Remove a subscription by ID")
  .option("--server <url>", "Management server URL", "http://localhost:3847")
  .action(async (id, opts) => {
    try {
      const res = await fetch(`${opts.server}/subscriptions/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Failed to connect to server:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
