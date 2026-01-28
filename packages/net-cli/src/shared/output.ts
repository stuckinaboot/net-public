import chalk from "chalk";
import type { NetMessage } from "@net-protocol/core";

/**
 * Format a message for human-readable output
 */
export function formatMessage(
  message: NetMessage,
  index: number
): string {
  const timestamp = new Date(Number(message.timestamp) * 1000).toISOString();
  const lines = [
    chalk.cyan(`[${index}]`) + ` ${chalk.gray(timestamp)}`,
    `  ${chalk.white("Sender:")} ${message.sender}`,
    `  ${chalk.white("App:")} ${message.app}`,
  ];

  if (message.topic) {
    lines.push(`  ${chalk.white("Topic:")} ${message.topic}`);
  }

  lines.push(`  ${chalk.white("Text:")} ${message.text}`);

  if (message.data && message.data !== "0x") {
    lines.push(`  ${chalk.white("Data:")} ${message.data}`);
  }

  return lines.join("\n");
}

/**
 * Format a message for JSON output
 */
export function messageToJson(
  message: NetMessage,
  index: number
): Record<string, unknown> {
  return {
    index,
    sender: message.sender,
    app: message.app,
    timestamp: Number(message.timestamp),
    text: message.text,
    topic: message.topic,
    data: message.data,
  };
}

/**
 * Print messages in human-readable or JSON format
 */
export function printMessages(
  messages: NetMessage[],
  startIndex: number,
  json: boolean
): void {
  if (json) {
    const output = messages.map((msg, i) => messageToJson(msg, startIndex + i));
    console.log(JSON.stringify(output, null, 2));
  } else {
    if (messages.length === 0) {
      console.log(chalk.yellow("No messages found"));
      return;
    }

    messages.forEach((msg, i) => {
      console.log(formatMessage(msg, startIndex + i));
      if (i < messages.length - 1) {
        console.log(); // Empty line between messages
      }
    });
  }
}

/**
 * Print a count result
 */
export function printCount(
  count: number,
  label: string,
  json: boolean
): void {
  if (json) {
    console.log(JSON.stringify({ count }, null, 2));
  } else {
    console.log(`${chalk.white(label)} ${chalk.cyan(count)}`);
  }
}

/**
 * Print an error message and exit
 */
export function exitWithError(message: string): never {
  console.error(chalk.red(`Error: ${message}`));
  process.exit(1);
}
