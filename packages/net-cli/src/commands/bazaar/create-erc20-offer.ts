import chalk from "chalk";
import {
  createWalletClient,
  http,
  parseEther,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { BazaarClient } from "@net-protocol/bazaar";
import { getChainRpcUrls } from "@net-protocol/core";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import type { CreateErc20OfferOptions } from "./types";

export async function executeCreateErc20Offer(options: CreateErc20OfferOptions): Promise<void> {
  const hasPrivateKey = !!(
    options.privateKey ||
    process.env.NET_PRIVATE_KEY ||
    process.env.PRIVATE_KEY
  );

  if (!hasPrivateKey) {
    await executeKeylessMode(options);
    return;
  }

  const commonOptions = parseCommonOptions({
    privateKey: options.privateKey,
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const account = privateKeyToAccount(commonOptions.privateKey);

  const bazaarClient = new BazaarClient({
    chainId: commonOptions.chainId,
    rpcUrl: commonOptions.rpcUrl,
  });

  const priceWei = parseEther(options.price);
  const tokenAmount = BigInt(options.tokenAmount);

  try {
    console.log(chalk.blue("Preparing ERC-20 offer..."));

    const prepared = await bazaarClient.prepareCreateErc20Offer({
      tokenAddress: options.tokenAddress as `0x${string}`,
      tokenAmount,
      priceWei,
      offerer: account.address,
    });

    const rpcUrls = getChainRpcUrls({
      chainId: commonOptions.chainId,
      rpcUrl: commonOptions.rpcUrl,
    });

    const walletClient = createWalletClient({
      account,
      transport: http(rpcUrls[0]),
    });

    // Send approval txs if needed (WETH approval)
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

    // Sign the EIP-712 typed data
    console.log(chalk.blue("Signing offer..."));
    const signature = await walletClient.signTypedData({
      domain: prepared.eip712.domain,
      types: prepared.eip712.types,
      primaryType: prepared.eip712.primaryType,
      message: prepared.eip712.message,
    });

    // Submit the offer
    console.log(chalk.blue("Submitting ERC-20 offer..."));
    const submitTx = bazaarClient.prepareSubmitErc20Offer(
      prepared.eip712.orderParameters,
      prepared.eip712.counter,
      signature as `0x${string}`
    );

    const submitCalldata = encodeFunctionData({
      abi: submitTx.abi,
      functionName: submitTx.functionName,
      args: submitTx.args,
    });

    const hash = await walletClient.sendTransaction({
      to: submitTx.to,
      data: submitCalldata,
      chain: null,
      value: submitTx.value,
    });

    console.log(
      chalk.green(
        `ERC-20 offer created successfully!\n  Transaction: ${hash}\n  Token: ${options.tokenAddress}\n  Amount: ${options.tokenAmount}\n  Price: ${options.price} ETH`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to create ERC-20 offer: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function executeKeylessMode(options: CreateErc20OfferOptions): Promise<void> {
  if (!options.offerer) {
    exitWithError("--offerer is required when not providing --private-key");
  }

  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const bazaarClient = new BazaarClient({
    chainId: readOnlyOptions.chainId,
    rpcUrl: readOnlyOptions.rpcUrl,
  });

  const priceWei = parseEther(options.price);
  const tokenAmount = BigInt(options.tokenAmount);

  try {
    const prepared = await bazaarClient.prepareCreateErc20Offer({
      tokenAddress: options.tokenAddress as `0x${string}`,
      tokenAmount,
      priceWei,
      offerer: options.offerer as `0x${string}`,
    });

    const output = {
      eip712: {
        domain: prepared.eip712.domain,
        types: prepared.eip712.types,
        primaryType: prepared.eip712.primaryType,
        message: prepared.eip712.message,
      },
      orderParameters: prepared.eip712.orderParameters,
      counter: prepared.eip712.counter.toString(),
      approvals: prepared.approvals.map((a) => ({
        to: a.to,
        data: encodeFunctionData({
          abi: a.abi,
          functionName: a.functionName,
          args: a.args,
        }),
        description: `Approve ${a.functionName}`,
      })),
    };

    console.log(JSON.stringify(output, bigintReplacer, 2));
  } catch (error) {
    exitWithError(
      `Failed to prepare ERC-20 offer: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}
