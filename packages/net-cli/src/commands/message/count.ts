import { parseReadOnlyOptions } from "../../cli/shared";
import { createNetClient } from "../../shared/client";
import { printCount, exitWithError } from "../../shared/output";
import type { MessageCountOptions } from "./types";
import { buildFilter, warnIgnoredFilters } from "./types";
import type { NetMessageFilter } from "@net-protocol/core";

function buildCountLabel(filter: NetMessageFilter | undefined): string {
  if (!filter) {
    return "Total messages:";
  }

  const parts: string[] = [];
  if (filter.appAddress) parts.push(`app=${filter.appAddress}`);
  if (filter.topic) parts.push(`topic="${filter.topic}"`);
  if (filter.maker) parts.push(`sender=${filter.maker}`);

  return `Messages (${parts.join(", ")}):`;
}

/**
 * Execute the message count command
 */
export async function executeCount(options: MessageCountOptions): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = createNetClient(readOnlyOptions);
  const filter = buildFilter(options);

  warnIgnoredFilters(options);

  try {
    const count = await client.getMessageCount({ filter });
    printCount(count, buildCountLabel(filter), options.json ?? false);
  } catch (error) {
    exitWithError(
      `Failed to get message count: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
