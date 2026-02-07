import chalk from "chalk";
import { BazaarClient } from "@net-protocol/bazaar";
import { parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import type { ListListingsOptions } from "./types";
import { formatEthPrice } from "./format";

export async function executeListListings(options: ListListingsOptions): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const bazaarClient = new BazaarClient({
    chainId: readOnlyOptions.chainId,
    rpcUrl: readOnlyOptions.rpcUrl,
  });

  try {
    const listings = await bazaarClient.getListings({
      nftAddress: options.nftAddress as `0x${string}` | undefined,
    });

    if (options.json) {
      const output = listings.map((l) => ({
        orderHash: l.orderHash,
        maker: l.maker,
        nftAddress: l.nftAddress,
        tokenId: l.tokenId,
        price: l.price,
        priceWei: l.priceWei.toString(),
        currency: l.currency,
        expirationDate: l.expirationDate,
        orderStatus: l.orderStatus,
        ...(l.targetFulfiller ? { targetFulfiller: l.targetFulfiller } : {}),
      }));
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    if (listings.length === 0) {
      console.log(chalk.yellow("No active listings found"));
      return;
    }

    console.log(chalk.white.bold(`\nListings (${listings.length}):\n`));

    for (const listing of listings) {
      const expiry = new Date(listing.expirationDate * 1000).toLocaleString();
      console.log(`  ${chalk.cyan("Order Hash:")} ${listing.orderHash}`);
      console.log(`  ${chalk.cyan("Seller:")} ${listing.maker}`);
      console.log(`  ${chalk.cyan("NFT:")} ${listing.nftAddress} #${listing.tokenId}`);
      console.log(`  ${chalk.cyan("Price:")} ${formatEthPrice(listing.price)} ${listing.currency.toUpperCase()}`);
      console.log(`  ${chalk.cyan("Expires:")} ${expiry}`);
      if (listing.targetFulfiller) {
        console.log(`  ${chalk.cyan("Private (for):")} ${listing.targetFulfiller}`);
      }
      console.log();
    }
  } catch (error) {
    exitWithError(
      `Failed to fetch listings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
