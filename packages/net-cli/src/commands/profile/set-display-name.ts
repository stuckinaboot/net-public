import chalk from "chalk";
import { StorageClient } from "@net-protocol/storage";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { getChainRpcUrls } from "@net-protocol/core";
import {
  getProfileMetadataStorageArgs,
  isValidDisplayName,
  STORAGE_CONTRACT,
} from "@net-protocol/profiles";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import { readExistingMetadata } from "./utils";
import type { ProfileSetDisplayNameOptions } from "./types";

/**
 * Execute the profile set-display-name command
 */
export async function executeProfileSetDisplayName(
  options: ProfileSetDisplayNameOptions
): Promise<void> {
  // Validate display name
  if (!isValidDisplayName(options.name)) {
    exitWithError(
      `Invalid display name: "${options.name}". Display name must be 1-25 characters and cannot contain control characters.`
    );
  }

  // Handle encode-only mode (no private key required)
  if (options.encodeOnly) {
    const readOnlyOptions = parseReadOnlyOptions({
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });
    const storageArgs = getProfileMetadataStorageArgs({
      display_name: options.name,
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

    console.log(chalk.blue(`Setting display name...`));
    console.log(chalk.gray(`   Name: ${options.name}`));
    console.log(chalk.gray(`   Address: ${account.address}`));

    // Read existing metadata to preserve other fields
    const storageClient = new StorageClient({
      chainId: commonOptions.chainId,
      overrides: commonOptions.rpcUrl
        ? { rpcUrls: [commonOptions.rpcUrl] }
        : undefined,
    });
    const existing = await readExistingMetadata(
      account.address,
      storageClient
    );

    // Merge: update display_name, preserve other fields
    const storageArgs = getProfileMetadataStorageArgs({
      display_name: options.name,
      bio: existing.bio,
      x_username: existing.x_username,
      token_address: existing.token_address,
    });

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
          `\nDisplay name updated successfully!\n  Transaction: ${hash}\n  Name: ${options.name}`
        )
      );
    } else {
      exitWithError(`Transaction failed: ${hash}`);
    }
  } catch (error) {
    exitWithError(
      `Failed to set display name: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
