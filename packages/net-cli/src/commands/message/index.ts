import { Command } from "commander";
import { executeSend } from "./send";
import { executeRead } from "./read";
import { executeCount } from "./count";

/**
 * Register the message command with the commander program
 */
export function registerMessageCommand(program: Command): void {
  const messageCommand = program
    .command("message")
    .description("Message operations");

  // Send subcommand
  const sendCommand = new Command("send")
    .description("Send a message to Net Protocol")
    .requiredOption("--text <text>", "Message text")
    .option("--topic <topic>", "Message topic", "")
    .option("--data <hex>", "Additional hex data")
    .option(
      "--private-key <key>",
      "Private key (0x-prefixed hex). Can also be set via NET_PRIVATE_KEY env var"
    )
    .option(
      "--chain-id <id>",
      "Chain ID. Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option(
      "--rpc-url <url>",
      "Custom RPC URL. Can also be set via NET_RPC_URL env var"
    )
    .option(
      "--encode-only",
      "Output transaction data as JSON instead of executing"
    )
    .action(async (options) => {
      await executeSend({
        text: options.text,
        topic: options.topic,
        data: options.data,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  // Read subcommand
  const readCommand = new Command("read")
    .description("Read messages from Net Protocol")
    .option("--app <address>", "Filter by app address")
    .option("--topic <topic>", "Filter by topic")
    .option("--sender <address>", "Filter by sender address")
    .option(
      "--start <n>",
      "Start index (inclusive)",
      (value) => parseInt(value, 10)
    )
    .option(
      "--end <n>",
      "End index (exclusive)",
      (value) => parseInt(value, 10)
    )
    .option(
      "--index <n>",
      "Single message at index",
      (value) => parseInt(value, 10)
    )
    .option(
      "--limit <n>",
      "Number of latest messages (default: 10)",
      (value) => parseInt(value, 10)
    )
    .option(
      "--chain-id <id>",
      "Chain ID. Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option(
      "--rpc-url <url>",
      "Custom RPC URL. Can also be set via NET_RPC_URL env var"
    )
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeRead({
        app: options.app,
        topic: options.topic,
        sender: options.sender,
        start: options.start,
        end: options.end,
        index: options.index,
        limit: options.limit,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
      });
    });

  // Count subcommand
  const countCommand = new Command("count")
    .description("Get message count from Net Protocol")
    .option("--app <address>", "Filter by app address")
    .option("--topic <topic>", "Filter by topic")
    .option("--sender <address>", "Filter by sender address")
    .option(
      "--chain-id <id>",
      "Chain ID. Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option(
      "--rpc-url <url>",
      "Custom RPC URL. Can also be set via NET_RPC_URL env var"
    )
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeCount({
        app: options.app,
        topic: options.topic,
        sender: options.sender,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
      });
    });

  messageCommand.addCommand(sendCommand);
  messageCommand.addCommand(readCommand);
  messageCommand.addCommand(countCommand);
}
