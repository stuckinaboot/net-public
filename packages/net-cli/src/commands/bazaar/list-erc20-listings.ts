import chalk from "chalk";
import { BazaarClient } from "@net-protocol/bazaar";
import { parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import type { ListErc20ListingsOptions } from "./types";
import { formatEthPrice } from "./format";

export async function executeListErc20Listings(options: ListErc20ListingsOptions): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const bazaarClient = new BazaarClient({
    chainId: readOnlyOptions.chainId,
    rpcUrl: readOnlyOptions.rpcUrl,
  });

  try {
    const listings = await bazaarClient.getErc20Listings({
      tokenAddress: options.tokenAddress as `0x${string}`,
    });

    if (options.json) {
      const output = listings.map((l) => ({
        orderHash: l.orderHash,
        maker: l.maker,
        tokenAddress: l.tokenAddress,
        tokenAmount: l.tokenAmount.toString(),
        price: l.price,
        priceWei: l.priceWei.toString(),
        pricePerToken: l.pricePerToken,
        pricePerTokenWei: l.pricePerTokenWei.toString(),
        currency: l.currency,
        expirationDate: l.expirationDate,
        orderStatus: l.orderStatus,
      }));
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    if (listings.length === 0) {
      console.log(chalk.yellow("No active ERC-20 listings found"));
      return;
    }

    console.log(chalk.white.bold(`\nERC-20 Listings (${listings.length}):\n`));

    for (const listing of listings) {
      const expiry = new Date(listing.expirationDate * 1000).toLocaleString();
      console.log(`  ${chalk.cyan("Order Hash:")} ${listing.orderHash}`);
      console.log(`  ${chalk.cyan("Seller:")} ${listing.maker}`);
      console.log(`  ${chalk.cyan("Token:")} ${listing.tokenAddress}`);
      console.log(`  ${chalk.cyan("Amount:")} ${listing.tokenAmount.toString()}`);
      console.log(`  ${chalk.cyan("Price:")} ${formatEthPrice(listing.price)} ${listing.currency.toUpperCase()}`);
      console.log(`  ${chalk.cyan("Price/Token:")} ${formatEthPrice(listing.pricePerToken)} ${listing.currency.toUpperCase()}`);
      console.log(`  ${chalk.cyan("Expires:")} ${expiry}`);
      console.log();
    }
  } catch (error) {
    exitWithError(
      `Failed to fetch ERC-20 listings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
