import chalk from "chalk";
import { createWalletClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { BazaarClient } from "@net-protocol/bazaar";
import { getChainRpcUrls } from "@net-protocol/core";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import type { BuyListingOptions } from "./types";

export async function executeBuyListing(options: BuyListingOptions): Promise<void> {
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
    });

    const listing = listings.find(
      (l) => l.orderHash.toLowerCase() === options.orderHash.toLowerCase()
    );

    if (!listing) {
      exitWithError(`Listing with order hash ${options.orderHash} not found or no longer active`);
    }

    console.log(chalk.blue("Preparing fulfillment..."));

    const prepared = await bazaarClient.prepareFulfillListing(listing, account.address);

    const rpcUrls = getChainRpcUrls({
      chainId: commonOptions.chainId,
      rpcUrl: commonOptions.rpcUrl,
    });

    const walletClient = createWalletClient({
      account,
      transport: http(rpcUrls[0]),
    });

    // Send approval txs if any
    for (const approval of prepared.approvals) {
      console.log(chalk.blue("Sending approval transaction..."));
      const calldata = encodeFunctionData({
        abi: approval.abi,
        functionName: approval.functionName,
        args: approval.args,
      });
      const approvalHash = await walletClient.sendTransaction({
        to: approval.to,
        data: calldata,
        chain: null,
        value: approval.value,
      });
      console.log(chalk.green(`Approval tx: ${approvalHash}`));
    }

    // Send fulfillment tx
    console.log(chalk.blue("Sending fulfillment transaction..."));
    const calldata = encodeFunctionData({
      abi: prepared.fulfillment.abi,
      functionName: prepared.fulfillment.functionName,
      args: prepared.fulfillment.args,
    });

    const hash = await walletClient.sendTransaction({
      to: prepared.fulfillment.to,
      data: calldata,
      chain: null,
      value: prepared.fulfillment.value,
    });

    console.log(
      chalk.green(
        `Listing fulfilled successfully!\n  Transaction: ${hash}\n  NFT: ${listing.nftAddress} #${listing.tokenId}\n  Price: ${listing.price} ${listing.currency.toUpperCase()}`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to buy listing: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function executeEncodeOnly(options: BuyListingOptions): Promise<void> {
  if (!options.buyer) {
    exitWithError("--buyer is required when using --encode-only without --private-key");
  }

  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const buyerAddress = options.buyer as `0x${string}`;

  const bazaarClient = new BazaarClient({
    chainId: readOnlyOptions.chainId,
    rpcUrl: readOnlyOptions.rpcUrl,
  });

  try {
    const listings = await bazaarClient.getListings({
      nftAddress: options.nftAddress as `0x${string}`,
    });

    const listing = listings.find(
      (l) => l.orderHash.toLowerCase() === options.orderHash.toLowerCase()
    );

    if (!listing) {
      exitWithError(`Listing with order hash ${options.orderHash} not found or no longer active`);
    }

    const prepared = await bazaarClient.prepareFulfillListing(listing, buyerAddress);

    const result = {
      approvals: prepared.approvals.map((a) =>
        encodeTransaction(
          { to: a.to, functionName: a.functionName, args: a.args, abi: a.abi, value: a.value },
          readOnlyOptions.chainId
        )
      ),
      fulfillment: encodeTransaction(
        {
          to: prepared.fulfillment.to,
          functionName: prepared.fulfillment.functionName,
          args: prepared.fulfillment.args,
          abi: prepared.fulfillment.abi,
          value: prepared.fulfillment.value,
        },
        readOnlyOptions.chainId
      ),
    };

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    exitWithError(
      `Failed to encode buy listing: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
