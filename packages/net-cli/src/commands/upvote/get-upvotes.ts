import chalk from "chalk";
import { Command } from "commander";
import { parseReadOnlyOptionsWithDefault } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import {
  ScoreClient,
  getTokenScoreKey,
  ALL_STRATEGY_ADDRESSES,
  PURE_ALPHA_STRATEGY,
  UNIV234_POOLS_STRATEGY,
  DYNAMIC_SPLIT_STRATEGY,
} from "@net-protocol/score";
import type { GetUpvotesOptions } from "./types";

function getStrategyName(address: string): string {
  const lower = address.toLowerCase();
  if (lower === PURE_ALPHA_STRATEGY.address.toLowerCase()) return "Pure Alpha";
  if (lower === UNIV234_POOLS_STRATEGY.address.toLowerCase())
    return "50/50 Pools";
  if (lower === DYNAMIC_SPLIT_STRATEGY.address.toLowerCase())
    return "Dynamic Split";
  return address;
}

async function executeGetUpvotes(options: GetUpvotesOptions): Promise<void> {
  const tokenAddress = options.tokenAddress;
  if (!tokenAddress.startsWith("0x") || tokenAddress.length !== 42) {
    exitWithError(
      "Invalid token address format (must be 0x-prefixed, 42 characters)"
    );
    return;
  }

  const readOnlyOptions = parseReadOnlyOptionsWithDefault({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = new ScoreClient({
    chainId: readOnlyOptions.chainId,
    overrides: readOnlyOptions.rpcUrl
      ? { rpcUrls: [readOnlyOptions.rpcUrl] }
      : undefined,
  });

  const scoreKey = getTokenScoreKey(tokenAddress);

  try {
    // getUpvotesWithLegacy returns one aggregated count per scoreKey
    // (summing legacy + all specified strategies). To get per-strategy
    // counts, use getStrategyKeyScores for each strategy individually.
    const [totalCounts, ...perStrategyCounts] = await Promise.all([
      client.getUpvotesWithLegacy({
        scoreKeys: [scoreKey],
        strategies: ALL_STRATEGY_ADDRESSES,
      }),
      ...ALL_STRATEGY_ADDRESSES.map((strategy) =>
        client.getStrategyKeyScores({
          strategy,
          scoreKeys: [scoreKey],
        })
      ),
    ]);

    const total = totalCounts[0] ?? 0;
    const strategyCounts = ALL_STRATEGY_ADDRESSES.map((addr, i) => ({
      strategy: getStrategyName(addr),
      address: addr,
      count: perStrategyCounts[i]?.[0] ?? 0,
    }));

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            tokenAddress,
            scoreKey,
            total,
            strategies: strategyCounts.map((s) => ({
              name: s.strategy,
              address: s.address,
              count: s.count,
            })),
          },
          null,
          2
        )
      );
    } else {
      console.log(chalk.white(`Upvotes for ${tokenAddress}:`));
      console.log(chalk.cyan(`  Total: ${total}`));
      console.log();
      for (const s of strategyCounts) {
        if (s.count > 0) {
          console.log(chalk.white(`  ${s.strategy}: ${s.count}`));
        }
      }
      if (total === 0) {
        console.log(chalk.yellow("  No upvotes found"));
      }
    }
  } catch (error) {
    exitWithError(
      `Failed to fetch upvotes: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function registerGetUpvotesCommand(
  parent: Command,
  commandName = "info"
): void {
  parent
    .command(commandName)
    .description("Get upvote counts for a token")
    .requiredOption("--token-address <address>", "Token contract address")
    .option("--chain-id <id>", "Chain ID (default: 8453 for Base)", (value) =>
      parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeGetUpvotes(options);
    });
}
