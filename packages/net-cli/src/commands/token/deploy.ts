import chalk from "chalk";
import { encodeFunctionData, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { NetrClient, isNetrSupportedChain } from "@net-protocol/netr";
import { getChainRpcUrls } from "@net-protocol/core";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import type { TokenDeployOptions } from "./types";
import type { EncodedTransaction } from "../../shared/types";

interface EncodedDeployResult {
  predictedAddress: string;
  salt: string;
  transaction: EncodedTransaction;
  config: {
    name: string;
    symbol: string;
    image: string;
    deployer: string;
    initialBuy?: string;
  };
}

/**
 * Execute encode-only mode - output deployment transaction data as JSON
 */
async function executeEncodeOnly(options: TokenDeployOptions): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  if (!isNetrSupportedChain(readOnlyOptions.chainId)) {
    exitWithError(
      `Chain ${readOnlyOptions.chainId} is not supported for token deployment`
    );
  }

  // Get deployer address from private key if provided
  let deployerAddress: `0x${string}`;
  if (options.privateKey) {
    const account = privateKeyToAccount(options.privateKey as `0x${string}`);
    deployerAddress = account.address;
  } else {
    // Use a placeholder address when no private key is provided
    deployerAddress = "0x0000000000000000000000000000000000000000";
  }

  const client = new NetrClient({
    chainId: readOnlyOptions.chainId,
    overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
  });

  // Generate salt and predict address
  const saltResult = await client.generateSalt({
    name: options.name,
    symbol: options.symbol,
    image: options.image,
    animation: options.animation,
    deployer: deployerAddress,
    fid: options.fid ? BigInt(options.fid) : undefined,
    metadataAddress: options.metadataAddress as `0x${string}` | undefined,
    extraStringData: options.extraStringData,
  });

  if (!saltResult) {
    exitWithError("Failed to generate salt for token deployment");
    return;
  }

  // Build deploy config
  const txConfig = client.buildDeployConfig(
    {
      name: options.name,
      symbol: options.symbol,
      image: options.image,
      animation: options.animation,
      deployer: deployerAddress,
      fid: options.fid ? BigInt(options.fid) : undefined,
      mintPrice: options.mintPrice ? BigInt(options.mintPrice) : undefined,
      mintEndTimestamp: options.mintEndTimestamp
        ? BigInt(options.mintEndTimestamp)
        : undefined,
      maxMintSupply: options.maxMintSupply
        ? BigInt(options.maxMintSupply)
        : undefined,
      metadataAddress: options.metadataAddress as `0x${string}` | undefined,
      extraStringData: options.extraStringData,
      initialBuy: options.initialBuy ? parseEther(options.initialBuy) : undefined,
    },
    saltResult.salt
  );

  // Encode the transaction
  const calldata = encodeFunctionData({
    abi: txConfig.abi,
    functionName: txConfig.functionName,
    args: txConfig.args,
  });

  const result: EncodedDeployResult = {
    predictedAddress: saltResult.predictedAddress,
    salt: saltResult.salt,
    transaction: {
      to: txConfig.address,
      data: calldata,
      chainId: readOnlyOptions.chainId,
      value: txConfig.value?.toString() ?? "0",
    },
    config: {
      name: options.name,
      symbol: options.symbol,
      image: options.image,
      deployer: deployerAddress,
      ...(options.initialBuy && { initialBuy: options.initialBuy }),
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

/**
 * Execute the token deploy command
 */
export async function executeTokenDeploy(
  options: TokenDeployOptions
): Promise<void> {
  if (options.encodeOnly) {
    await executeEncodeOnly(options);
    return;
  }

  const commonOptions = parseCommonOptions({
    privateKey: options.privateKey,
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  if (!isNetrSupportedChain(commonOptions.chainId)) {
    exitWithError(
      `Chain ${commonOptions.chainId} is not supported for token deployment. Supported: Base (8453), Plasma (9745), Monad (143), HyperEVM (999)`
    );
  }

  const account = privateKeyToAccount(commonOptions.privateKey);

  const client = new NetrClient({
    chainId: commonOptions.chainId,
    overrides: commonOptions.rpcUrl
      ? { rpcUrls: [commonOptions.rpcUrl] }
      : undefined,
  });

  console.log(chalk.blue("Generating salt and predicting token address..."));

  // Generate salt and predict address
  const saltResult = await client.generateSalt({
    name: options.name,
    symbol: options.symbol,
    image: options.image,
    animation: options.animation,
    deployer: account.address,
    fid: options.fid ? BigInt(options.fid) : undefined,
    metadataAddress: options.metadataAddress as `0x${string}` | undefined,
    extraStringData: options.extraStringData,
  });

  if (!saltResult) {
    exitWithError("Failed to generate salt for token deployment");
    return;
  }

  console.log(
    chalk.cyan(`Predicted token address: ${saltResult.predictedAddress}`)
  );

  // Build deploy config
  const txConfig = client.buildDeployConfig(
    {
      name: options.name,
      symbol: options.symbol,
      image: options.image,
      animation: options.animation,
      deployer: account.address,
      fid: options.fid ? BigInt(options.fid) : undefined,
      mintPrice: options.mintPrice ? BigInt(options.mintPrice) : undefined,
      mintEndTimestamp: options.mintEndTimestamp
        ? BigInt(options.mintEndTimestamp)
        : undefined,
      maxMintSupply: options.maxMintSupply
        ? BigInt(options.maxMintSupply)
        : undefined,
      metadataAddress: options.metadataAddress as `0x${string}` | undefined,
      extraStringData: options.extraStringData,
      initialBuy: options.initialBuy ? parseEther(options.initialBuy) : undefined,
    },
    saltResult.salt
  );

  const rpcUrls = getChainRpcUrls({
    chainId: commonOptions.chainId,
    rpcUrl: commonOptions.rpcUrl,
  });

  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrls[0]),
  });

  if (options.initialBuy) {
    console.log(chalk.blue(`Deploying token with ${options.initialBuy} ETH initial buy...`));
  } else {
    console.log(chalk.blue("Deploying token..."));
  }

  try {
    // Use sendTransaction with encoded calldata to support payable functions
    const calldata = encodeFunctionData({
      abi: txConfig.abi,
      functionName: txConfig.functionName,
      args: txConfig.args,
    });

    const hash = await walletClient.sendTransaction({
      to: txConfig.address,
      data: calldata,
      chain: null,
      value: txConfig.value,
    });

    const initialBuyLine = options.initialBuy
      ? `\n  Initial Buy: ${options.initialBuy} ETH`
      : "";

    console.log(
      chalk.green(
        `Token deployed successfully!\n  Transaction: ${hash}\n  Token Address: ${saltResult.predictedAddress}\n  Name: ${options.name}\n  Symbol: ${options.symbol}${initialBuyLine}`
      )
    );
  } catch (error) {
    exitWithError(
      `Failed to deploy token: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
