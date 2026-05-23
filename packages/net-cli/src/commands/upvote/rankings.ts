import chalk from "chalk";
import { Command } from "commander";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { tokenUrl as buildTokenUrl } from "../../shared/urls";
import { getTokenRankings, type RankingSort } from "@net-protocol/score";
import type { RankingsOptions } from "./types";

const VALID_SORTS: RankingSort[] = ["hot", "trending", "recent", "top"];

function formatNumber(n: number | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "-";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(digits)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(digits)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(digits)}K`;
  return n.toFixed(digits);
}

function formatPrice(price: number | undefined): string {
  if (price == null || !Number.isFinite(price)) return "-";
  if (price < 0.000001) return price.toExponential(2);
  if (price < 1) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(4)}`;
}

async function executeRankings(options: RankingsOptions): Promise<void> {
  const sort = (options.sort ?? "hot").toLowerCase() as RankingSort;
  if (!VALID_SORTS.includes(sort)) {
    exitWithError(
      `Invalid --sort "${options.sort}". Must be one of: ${VALID_SORTS.join(", ")}`
    );
    return;
  }

  const limit = options.limit ?? 10;
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    exitWithError("Invalid --limit. Must be an integer between 1 and 100.");
    return;
  }

  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  try {
    const tokens = await getTokenRankings({
      chainId: readOnlyOptions.chainId,
      sort,
      maxTokens: limit,
      messageScanWindow: options.scanWindow,
      thresholds:
        options.minUpvotes != null ||
        options.minMarketCap != null ||
        options.recencyHours != null
          ? {
              minUpvotes: options.minUpvotes,
              minMarketCap: options.minMarketCap,
              recencyHours: options.recencyHours,
            }
          : undefined,
      rpcUrl: readOnlyOptions.rpcUrl,
    });

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            chainId: readOnlyOptions.chainId,
            sort,
            count: tokens.length,
            tokens: tokens.map((t) => ({
              ...t,
              url: buildTokenUrl(readOnlyOptions.chainId, t.address),
            })),
          },
          null,
          2
        )
      );
      return;
    }

    if (tokens.length === 0) {
      console.log(chalk.yellow("No tokens found."));
      return;
    }

    console.log(
      chalk.white(
        `Top ${tokens.length} tokens by ${sort} on chain ${readOnlyOptions.chainId}:`
      )
    );
    console.log();
    tokens.forEach((t, i) => {
      const rank = chalk.dim(`#${(i + 1).toString().padStart(2, " ")}`);
      const symbol = chalk.cyan((t.symbol || "?").padEnd(10, " "));
      const upvotes = chalk.white(`${t.upvotes} upvotes`.padEnd(18, " "));
      const fdv = chalk.dim(`FDV ${formatNumber(t.fdv)}`.padEnd(14, " "));
      const price = chalk.dim(`${formatPrice(t.priceInUsdc)}`.padEnd(14, " "));
      console.log(`${rank}  ${symbol} ${upvotes} ${fdv} ${price} ${t.address}`);
    });
  } catch (error) {
    exitWithError(
      `Failed to fetch token rankings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function registerRankingsCommand(
  parent: Command,
  commandName = "rankings"
): void {
  parent
    .command(commandName)
    .description(
      "List tokens ranked by upvote activity (hot / trending / recent / top)"
    )
    .option(
      "--sort <sort>",
      `Ranking strategy: ${VALID_SORTS.join(" | ")} (default: hot)`,
      "hot"
    )
    .option(
      "--limit <n>",
      "Number of tokens to return (1-100, default: 10)",
      (v) => parseInt(v, 10),
      10
    )
    .option(
      "--scan-window <n>",
      "Messages to scan per contract (default: 150)",
      (v) => parseInt(v, 10)
    )
    .option(
      "--min-upvotes <n>",
      "Floor for two-tier filter (default: 500)",
      (v) => parseInt(v, 10)
    )
    .option(
      "--min-market-cap <n>",
      "FDV floor in USDC (default: 40000)",
      (v) => parseInt(v, 10)
    )
    .option(
      "--recency-hours <n>",
      "Drop below-floor tokens with no upvote within N hours (default: 48)",
      (v) => parseInt(v, 10)
    )
    .option("--chain-id <id>", "Chain ID (default: 8453 for Base)", (v) =>
      parseInt(v, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeRankings(options);
    });
}
