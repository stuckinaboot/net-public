import chalk from "chalk";
import { createWalletClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { BazaarClient } from "@net-protocol/bazaar";
import { getChainRpcUrls } from "@net-protocol/core";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import type { SubmitErc20OfferOptions } from "./types";
import { readFileSync } from "fs";

export async function executeSubmitErc20Offer(options: SubmitErc20OfferOptions): Promise<void> {
  // Read order data from file
  let orderData: { orderParameters: unknown; counter: string };
  try {
    const raw = readFileSync(options.orderData, "utf-8");
    orderData = JSON.parse(raw);
  } catch (error) {
    exitWithError(
      `Failed to read order data file: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (options.encodeOnly) {
    await executeEncodeOnly(options, orderData);
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
    const submitTx = bazaarClient.prepareSubmitErc20Offer(
      orderData.orderParameters as Parameters<typeof bazaarClient.prepareSubmitErc20Offer>[0],
      BigInt(orderData.counter),
      options.signature as `0x${string}`
    );

    const rpcUrls = getChainRpcUrls({
      chainId: commonOptions.chainId,
      rpcUrl: commonOptions.rpcUrl,
    });

    const walletClient = createWalletClient({
      account,
      transport: http(rpcUrls[0]),
    });

    console.log(chalk.blue("Submitting ERC-20 offer..."));

    const calldata = encodeFunctionData({
      abi: submitTx.abi,
      functionName: submitTx.functionName,
      args: submitTx.args,
    });

    const hash = await walletClient.sendTransaction({
      to: submitTx.to,
      data: calldata,
      chain: null,
      value: submitTx.value,
    });

    console.log(chalk.green(`ERC-20 offer submitted successfully!\n  Transaction: ${hash}`));
  } catch (error) {
    exitWithError(
      `Failed to submit ERC-20 offer: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function executeEncodeOnly(
  options: SubmitErc20OfferOptions,
  orderData: { orderParameters: unknown; counter: string }
): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const bazaarClient = new BazaarClient({
    chainId: readOnlyOptions.chainId,
    rpcUrl: readOnlyOptions.rpcUrl,
  });

  const submitTx = bazaarClient.prepareSubmitErc20Offer(
    orderData.orderParameters as Parameters<typeof bazaarClient.prepareSubmitErc20Offer>[0],
    BigInt(orderData.counter),
    options.signature as `0x${string}`
  );

  const encoded = encodeTransaction(
    { to: submitTx.to, functionName: submitTx.functionName, args: submitTx.args, abi: submitTx.abi, value: submitTx.value },
    readOnlyOptions.chainId
  );
  console.log(JSON.stringify(encoded, null, 2));
}
