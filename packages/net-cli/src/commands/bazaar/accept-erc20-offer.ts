import chalk from "chalk";
import { createWalletClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { BazaarClient } from "@net-protocol/bazaar";
import { getChainRpcUrls } from "@net-protocol/core";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import type { AcceptErc20OfferOptions } from "./types";

export async function executeAcceptErc20Offer(options: AcceptErc20OfferOptions): Promise<void> {
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
    console.log(chalk.blue("Fetching ERC-20 offers..."));

    const offers = await bazaarClient.getErc20Offers({
      tokenAddress: options.tokenAddress as `0x${string}`,
    });

    const offer = offers.find(
      (o) => o.orderHash.toLowerCase() === options.orderHash.toLowerCase()
    );

    if (!offer) {
      exitWithError(`ERC-20 offer with order hash ${options.orderHash} not found or no longer active`);
    }

    console.log(chalk.blue("Preparing fulfillment..."));

    const prepared = await bazaarClient.prepareFulfillErc20Offer(
      offer,
      account.address
    );

    const rpcUrls = getChainRpcUrls({
      chainId: commonOptions.chainId,
      rpcUrl: commonOptions.rpcUrl,
    });

    const walletClient = createWalletClient({
      account,
      transport: http(rpcUrls[0]),
    });

    // Send approval txs if any (ERC20 approval)
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
        `ERC-20 offer accepted successfully!\n  Transaction: ${hash}\n  Token: ${offer.tokenAddress}\n  Amount: ${offer.tokenAmount.toString()}\n  Price: ${offer.price} ${offer.currency.toUpperCase()}`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to accept ERC-20 offer: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function executeEncodeOnly(options: AcceptErc20OfferOptions): Promise<void> {
  if (!options.seller) {
    exitWithError("--seller is required when using --encode-only without --private-key");
  }

  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const sellerAddress = options.seller as `0x${string}`;

  const bazaarClient = new BazaarClient({
    chainId: readOnlyOptions.chainId,
    rpcUrl: readOnlyOptions.rpcUrl,
  });

  try {
    const offers = await bazaarClient.getErc20Offers({
      tokenAddress: options.tokenAddress as `0x${string}`,
    });

    const offer = offers.find(
      (o) => o.orderHash.toLowerCase() === options.orderHash.toLowerCase()
    );

    if (!offer) {
      exitWithError(`ERC-20 offer with order hash ${options.orderHash} not found or no longer active`);
    }

    const prepared = await bazaarClient.prepareFulfillErc20Offer(
      offer,
      sellerAddress
    );

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
      `Failed to encode accept ERC-20 offer: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
