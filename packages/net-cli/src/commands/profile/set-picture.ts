import chalk from "chalk";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { getChainRpcUrls } from "@net-protocol/core";
import {
  getProfilePictureStorageArgs,
  isValidUrl,
  STORAGE_CONTRACT,
} from "@net-protocol/profiles";
import { parseCommonOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import type { ProfileSetPictureOptions } from "./types";

/**
 * Execute the profile set-picture command
 */
export async function executeProfileSetPicture(
  options: ProfileSetPictureOptions
): Promise<void> {
  // Validate URL
  if (!isValidUrl(options.url)) {
    exitWithError(
      `Invalid URL: "${options.url}". Please provide a valid URL (e.g., https://example.com/image.jpg)`
    );
  }

  // Parse common options
  const commonOptions = parseCommonOptions({
    privateKey: options.privateKey,
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  // Get storage args
  const storageArgs = getProfilePictureStorageArgs(options.url);

  // Handle encode-only mode
  if (options.encodeOnly) {
    const encoded = encodeTransaction(
      {
        to: STORAGE_CONTRACT.address,
        abi: STORAGE_CONTRACT.abi,
        functionName: "put",
        args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
      },
      commonOptions.chainId
    );
    console.log(JSON.stringify(encoded, null, 2));
    return;
  }

  try {
    // Create wallet client
    const account = privateKeyToAccount(commonOptions.privateKey);
    const rpcUrls = getChainRpcUrls({
      chainId: commonOptions.chainId,
      rpcUrl: commonOptions.rpcUrl,
    });

    const client = createWalletClient({
      account,
      chain: base, // TODO: Support other chains
      transport: http(rpcUrls[0]),
    }).extend(publicActions);

    console.log(chalk.blue(`📷 Setting profile picture...`));
    console.log(chalk.gray(`   URL: ${options.url}`));
    console.log(chalk.gray(`   Address: ${account.address}`));

    // Submit transaction
    const hash = await client.writeContract({
      address: STORAGE_CONTRACT.address as `0x${string}`,
      abi: STORAGE_CONTRACT.abi,
      functionName: "put",
      args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
    });

    console.log(chalk.blue(`⏳ Waiting for confirmation...`));

    // Wait for transaction
    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log(
        chalk.green(
          `\n✓ Profile picture updated successfully!\n  Transaction: ${hash}\n  URL: ${options.url}`
        )
      );
    } else {
      exitWithError(`Transaction failed: ${hash}`);
    }
  } catch (error) {
    exitWithError(
      `Failed to set profile picture: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
