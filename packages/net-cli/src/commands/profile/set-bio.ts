import chalk from "chalk";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { getChainRpcUrls } from "@net-protocol/core";
import {
  getProfileMetadataStorageArgs,
  isValidBio,
  STORAGE_CONTRACT,
} from "@net-protocol/profiles";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import type { ProfileSetBioOptions } from "./types";

/**
 * Execute the profile set-bio command
 */
export async function executeProfileSetBio(
  options: ProfileSetBioOptions
): Promise<void> {
  // Validate bio
  if (!isValidBio(options.bio)) {
    exitWithError(
      `Invalid bio: "${options.bio}". Bio must be 1-280 characters and cannot contain control characters.`
    );
  }

  // Get storage args
  const storageArgs = getProfileMetadataStorageArgs({ bio: options.bio });

  // Handle encode-only mode (no private key required)
  if (options.encodeOnly) {
    const readOnlyOptions = parseReadOnlyOptions({
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });
    const encoded = encodeTransaction(
      {
        to: STORAGE_CONTRACT.address,
        abi: STORAGE_CONTRACT.abi,
        functionName: "put",
        args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
      },
      readOnlyOptions.chainId
    );
    console.log(JSON.stringify(encoded, null, 2));
    return;
  }

  // Parse common options (requires private key for transaction submission)
  const commonOptions = parseCommonOptions(
    {
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    },
    true // supports --encode-only
  );

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

    console.log(chalk.blue(`Setting profile bio...`));
    console.log(chalk.gray(`   Bio: ${options.bio}`));
    console.log(chalk.gray(`   Address: ${account.address}`));

    // Submit transaction
    const hash = await client.writeContract({
      address: STORAGE_CONTRACT.address as `0x${string}`,
      abi: STORAGE_CONTRACT.abi,
      functionName: "put",
      args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
    });

    console.log(chalk.blue(`Waiting for confirmation...`));

    // Wait for transaction
    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log(
        chalk.green(
          `\nBio updated successfully!\n  Transaction: ${hash}\n  Bio: ${options.bio}`
        )
      );
    } else {
      exitWithError(`Transaction failed: ${hash}`);
    }
  } catch (error) {
    exitWithError(
      `Failed to set bio: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
