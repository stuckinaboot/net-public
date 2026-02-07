import chalk from "chalk";
import { BazaarClient } from "@net-protocol/bazaar";
import { parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import type { ListOffersOptions } from "./types";
import { formatEthPrice } from "./format";

export async function executeListOffers(options: ListOffersOptions): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const bazaarClient = new BazaarClient({
    chainId: readOnlyOptions.chainId,
    rpcUrl: readOnlyOptions.rpcUrl,
  });

  try {
    const offers = await bazaarClient.getCollectionOffers({
      nftAddress: options.nftAddress as `0x${string}`,
    });

    if (options.json) {
      const output = offers.map((o) => ({
        orderHash: o.orderHash,
        maker: o.maker,
        nftAddress: o.nftAddress,
        price: o.price,
        priceWei: o.priceWei.toString(),
        currency: o.currency,
        expirationDate: o.expirationDate,
        orderStatus: o.orderStatus,
      }));
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    if (offers.length === 0) {
      console.log(chalk.yellow("No active collection offers found"));
      return;
    }

    console.log(chalk.white.bold(`\nCollection Offers (${offers.length}):\n`));

    for (const offer of offers) {
      const expiry = new Date(offer.expirationDate * 1000).toLocaleString();
      console.log(`  ${chalk.cyan("Order Hash:")} ${offer.orderHash}`);
      console.log(`  ${chalk.cyan("Buyer:")} ${offer.maker}`);
      console.log(`  ${chalk.cyan("Collection:")} ${offer.nftAddress}`);
      console.log(`  ${chalk.cyan("Price:")} ${formatEthPrice(offer.price)} ${offer.currency.toUpperCase()}`);
      console.log(`  ${chalk.cyan("Expires:")} ${expiry}`);
      console.log();
    }
  } catch (error) {
    exitWithError(
      `Failed to fetch offers: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
