import chalk from "chalk";
import { privateKeyToAccount } from "viem/accounts";
import { BazaarClient } from "@net-protocol/bazaar";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { createWallet, executeTransaction } from "../../shared/wallet";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import type { CancelListingOptions } from "./types";

export async function executeCancelListing(options: CancelListingOptions): Promise<void> {
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
    console.log(chalk.blue("Fetching listing..."));
    const listings = await bazaarClient.getListings({
      nftAddress: options.nftAddress as `0x${string}`,
      maker: account.address,
      includeExpired: true,
    });

    const listing = listings.find(
      (l) => l.orderHash.toLowerCase() === options.orderHash.toLowerCase()
    );

    if (!listing) {
      exitWithError(
        `Listing with order hash ${options.orderHash} not found for maker ${account.address}`
      );
    }

    const cancelTx = bazaarClient.prepareCancelListing(listing);

    const walletClient = createWallet(
      commonOptions.privateKey,
      commonOptions.chainId,
      commonOptions.rpcUrl
    );

    console.log(chalk.blue("Sending cancel transaction..."));
    const hash = await executeTransaction(walletClient, cancelTx);

    console.log(
      chalk.green(
        `Listing cancelled successfully!\n  Transaction: ${hash}\n  NFT: ${listing.nftAddress} #${listing.tokenId}`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to cancel listing: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function executeEncodeOnly(options: CancelListingOptions): Promise<void> {
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
    const listings = await bazaarClient.getListings({
      nftAddress: options.nftAddress as `0x${string}`,
      maker: makerAddress,
      includeExpired: true,
    });

    const listing = listings.find(
      (l) => l.orderHash.toLowerCase() === options.orderHash.toLowerCase()
    );

    if (!listing) {
      exitWithError(
        `Listing with order hash ${options.orderHash} not found for maker ${makerAddress}`
      );
    }

    const cancelTx = bazaarClient.prepareCancelListing(listing);
    console.log(JSON.stringify(encodeTransaction(cancelTx, readOnlyOptions.chainId), null, 2));
  } catch (error) {
    exitWithError(
      `Failed to encode cancel listing: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
