import chalk from "chalk";
import { parseReadOnlyOptions } from "../../cli/shared";
import { createNetClient } from "../../shared/client";
import { printMessages, exitWithError } from "../../shared/output";
import type { MessageReadOptions } from "./types";
import { buildFilter, warnIgnoredFilters } from "./types";

function printEmptyResult(message: string, json: boolean): void {
  if (json) {
    console.log(JSON.stringify([], null, 2));
  } else {
    console.log(chalk.yellow(message));
  }
}

/**
 * Execute the message read command
 */
export async function executeRead(options: MessageReadOptions): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = createNetClient(readOnlyOptions);
  const filter = buildFilter(options);
  const json = options.json ?? false;

  warnIgnoredFilters(options);

  try {
    // Handle single message by index
    if (options.index !== undefined) {
      const message = await client.getMessageAtIndex({
        messageIndex: options.index,
        appAddress: filter?.appAddress,
        topic: filter?.topic,
        maker: filter?.maker,
      });

      if (!message) {
        exitWithError(`No message found at index ${options.index}`);
      }

      printMessages([message], options.index, json);
      return;
    }

    // Get total count for range calculation
    const count = await client.getMessageCount({ filter });

    if (count === 0) {
      printEmptyResult("No messages found", json);
      return;
    }

    // Determine range
    const hasExplicitRange = options.start !== undefined || options.end !== undefined;
    let startIndex: number;
    let endIndex: number;

    if (hasExplicitRange) {
      startIndex = options.start ?? 0;
      endIndex = options.end ?? count;
    } else {
      const limit = options.limit ?? 10;
      startIndex = Math.max(0, count - limit);
      endIndex = count;
    }

    // Clamp to valid range
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(endIndex, count);

    if (startIndex >= endIndex) {
      printEmptyResult("No messages in specified range", json);
      return;
    }

    const messages = await client.getMessagesBatch({
      filter,
      startIndex,
      endIndex,
    });

    printMessages(messages, startIndex, json);
  } catch (error) {
    exitWithError(
      `Failed to read messages: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
