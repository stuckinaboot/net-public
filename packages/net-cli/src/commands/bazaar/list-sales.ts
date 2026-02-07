import chalk from "chalk";
import { BazaarClient } from "@net-protocol/bazaar";
import { parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import type { ListSalesOptions } from "./types";
import { formatEthPrice } from "./format";

export async function executeListSales(options: ListSalesOptions): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const bazaarClient = new BazaarClient({
    chainId: readOnlyOptions.chainId,
    rpcUrl: readOnlyOptions.rpcUrl,
  });

  try {
    const sales = await bazaarClient.getSales({
      nftAddress: options.nftAddress as `0x${string}`,
    });

    if (options.json) {
      const output = sales.map((s) => ({
        orderHash: s.orderHash,
        seller: s.seller,
        buyer: s.buyer,
        tokenAddress: s.tokenAddress,
        tokenId: s.tokenId,
        amount: s.amount.toString(),
        price: s.price,
        priceWei: s.priceWei.toString(),
        currency: s.currency,
        timestamp: s.timestamp,
      }));
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    if (sales.length === 0) {
      console.log(chalk.yellow("No sales found"));
      return;
    }

    console.log(chalk.white.bold(`\nSales (${sales.length}):\n`));

    for (const sale of sales) {
      const date = new Date(sale.timestamp * 1000).toLocaleString();
      console.log(`  ${chalk.cyan("Order Hash:")} ${sale.orderHash}`);
      console.log(`  ${chalk.cyan("Seller:")} ${sale.seller}`);
      console.log(`  ${chalk.cyan("Buyer:")} ${sale.buyer}`);
      console.log(`  ${chalk.cyan("Token:")} ${sale.tokenAddress} #${sale.tokenId}`);
      console.log(`  ${chalk.cyan("Price:")} ${formatEthPrice(sale.price)} ${sale.currency.toUpperCase()}`);
      console.log(`  ${chalk.cyan("Date:")} ${date}`);
      console.log();
    }
  } catch (error) {
    exitWithError(
      `Failed to fetch sales: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
