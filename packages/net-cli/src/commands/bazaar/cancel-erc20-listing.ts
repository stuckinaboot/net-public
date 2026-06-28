import chalk from "chalk";
import { privateKeyToAccount } from "viem/accounts";
import { BazaarClient } from "@net-protocol/bazaar";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { createWallet, executeTransaction } from "../../shared/wallet";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import type { CancelErc20ListingOptions } from "./types";

export async function executeCancelErc20Listing(
  options: CancelErc20ListingOptions
): Promise<void> {
  if (options.encodeOnly) {
    await executeEncodeOnly(options);
    return;
  }

  const commonOptions = parseCommonOptions(
    {
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    },
    true
  );

  const account = privateKeyToAccount(commonOptions.privateKey);
  const bazaarClient = new BazaarClient({
    chainId: commonOptions.chainId,
    rpcUrl: commonOptions.rpcUrl,
  });

  try {
    console.log(chalk.blue("Fetching ERC20 listing..."));
    const listings = await bazaarClient.getErc20Listings({
      tokenAddress: options.tokenAddress as `0x${string}`,
      maker: account.address,
      includeExpired: true,
    });

    const listing = listings.find(
      (l) => l.orderHash.toLowerCase() === options.orderHash.toLowerCase()
    );

    if (!listing) {
      exitWithError(
        `ERC20 listing with order hash ${options.orderHash} not found for maker ${account.address}`
      );
    }

    const cancelTx = bazaarClient.prepareCancelErc20Listing(listing);

    const walletClient = createWallet(
      commonOptions.privateKey,
      commonOptions.chainId,
      commonOptions.rpcUrl
    );

    console.log(chalk.blue("Sending cancel transaction..."));
    const hash = await executeTransaction(walletClient, cancelTx);

    console.log(
      chalk.green(
        `ERC20 listing cancelled successfully!\n  Transaction: ${hash}\n  Token: ${listing.tokenAddress}\n  Amount: ${listing.tokenAmount.toString()}`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to cancel ERC20 listing: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function executeEncodeOnly(options: CancelErc20ListingOptions): Promise<void> {
  if (!options.maker) {
    exitWithError("--maker is required when using --encode-only without --private-key");
  }

  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const makerAddress = options.maker as `0x${string}`;
  const bazaarClient = new BazaarClient({
    chainId: readOnlyOptions.chainId,
    rpcUrl: readOnlyOptions.rpcUrl,
  });

  try {
    const listings = await bazaarClient.getErc20Listings({
      tokenAddress: options.tokenAddress as `0x${string}`,
      maker: makerAddress,
      includeExpired: true,
    });

    const listing = listings.find(
      (l) => l.orderHash.toLowerCase() === options.orderHash.toLowerCase()
    );

    if (!listing) {
      exitWithError(
        `ERC20 listing with order hash ${options.orderHash} not found for maker ${makerAddress}`
      );
    }

    const cancelTx = bazaarClient.prepareCancelErc20Listing(listing);
    console.log(JSON.stringify(encodeTransaction(cancelTx, readOnlyOptions.chainId), null, 2));
  } catch (error) {
    exitWithError(
      `Failed to encode cancel ERC20 listing: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
