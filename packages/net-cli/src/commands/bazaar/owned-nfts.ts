import chalk from "chalk";
import { BazaarClient } from "@net-protocol/bazaar";
import { parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import type { OwnedNftsOptions } from "./types";

export async function executeOwnedNfts(options: OwnedNftsOptions): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const bazaarClient = new BazaarClient({
    chainId: readOnlyOptions.chainId,
    rpcUrl: readOnlyOptions.rpcUrl,
  });

  const startTokenId = options.startTokenId ? BigInt(options.startTokenId) : undefined;
  const endTokenId = options.endTokenId ? BigInt(options.endTokenId) : undefined;

  try {
    const tokenIds = await bazaarClient.getOwnedTokens({
      nftAddress: options.nftAddress as `0x${string}`,
      ownerAddress: options.owner as `0x${string}`,
      startTokenId,
      endTokenId,
    });

    if (options.json) {
      const output = {
        nftAddress: options.nftAddress,
        owner: options.owner,
        tokenIds: tokenIds.map((id) => id.toString()),
        count: tokenIds.length,
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    if (tokenIds.length === 0) {
      console.log(chalk.yellow("No owned tokens found in the specified range"));
      return;
    }

    console.log(chalk.white.bold(`\nOwned Tokens (${tokenIds.length}):\n`));
    console.log(`  ${chalk.cyan("Collection:")} ${options.nftAddress}`);
    console.log(`  ${chalk.cyan("Owner:")} ${options.owner}`);
    console.log(`  ${chalk.cyan("Token IDs:")} ${tokenIds.map((id) => id.toString()).join(", ")}`);
    console.log();
  } catch (error) {
    exitWithError(
      `Failed to fetch owned tokens: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
