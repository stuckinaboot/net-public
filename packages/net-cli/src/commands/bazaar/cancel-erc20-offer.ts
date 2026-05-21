import chalk from "chalk";
import { privateKeyToAccount } from "viem/accounts";
import { BazaarClient } from "@net-protocol/bazaar";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { createWallet, executeTransaction } from "../../shared/wallet";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import type { CancelErc20OfferOptions } from "./types";

export async function executeCancelErc20Offer(
  options: CancelErc20OfferOptions
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
    console.log(chalk.blue("Fetching ERC20 offer..."));
    const offers = await bazaarClient.getErc20Offers({
      tokenAddress: options.tokenAddress as `0x${string}`,
    });

    const offer = offers.find(
      (o) =>
        o.orderHash.toLowerCase() === options.orderHash.toLowerCase() &&
        o.maker.toLowerCase() === account.address.toLowerCase()
    );

    if (!offer) {
      exitWithError(
        `ERC20 offer with order hash ${options.orderHash} not found for maker ${account.address}`
      );
    }

    const cancelTx = bazaarClient.prepareCancelErc20Offer(offer);

    const walletClient = createWallet(
      commonOptions.privateKey,
      commonOptions.chainId,
      commonOptions.rpcUrl
    );

    console.log(chalk.blue("Sending cancel transaction..."));
    const hash = await executeTransaction(walletClient, cancelTx);

    console.log(
      chalk.green(
        `ERC20 offer cancelled successfully!\n  Transaction: ${hash}\n  Token: ${offer.tokenAddress}\n  Amount: ${offer.tokenAmount.toString()}`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to cancel ERC20 offer: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function executeEncodeOnly(options: CancelErc20OfferOptions): Promise<void> {
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
    const offers = await bazaarClient.getErc20Offers({
      tokenAddress: options.tokenAddress as `0x${string}`,
    });

    const offer = offers.find(
      (o) =>
        o.orderHash.toLowerCase() === options.orderHash.toLowerCase() &&
        o.maker.toLowerCase() === makerAddress.toLowerCase()
    );

    if (!offer) {
      exitWithError(
        `ERC20 offer with order hash ${options.orderHash} not found for maker ${makerAddress}`
      );
    }

    const cancelTx = bazaarClient.prepareCancelErc20Offer(offer);
    console.log(JSON.stringify(encodeTransaction(cancelTx, readOnlyOptions.chainId), null, 2));
  } catch (error) {
    exitWithError(
      `Failed to encode cancel ERC20 offer: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
