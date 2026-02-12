import chalk from "chalk";
import { StorageClient } from "@net-protocol/storage";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { getChainRpcUrls } from "@net-protocol/core";
import {
  getProfileMetadataStorageArgs,
  isValidXUsername,
  STORAGE_CONTRACT,
} from "@net-protocol/profiles";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import { readExistingMetadata } from "./utils";
import type { ProfileSetUsernameOptions } from "./types";

/**
 * Execute the profile set-username command
 */
export async function executeProfileSetUsername(
  options: ProfileSetUsernameOptions
): Promise<void> {
  // Validate username
  if (!isValidXUsername(options.username)) {
    exitWithError(
      `Invalid X username: "${options.username}". Usernames must be 1-15 characters, alphanumeric and underscores only.`
    );
  }

  // Normalize username (strip @ if present for storage)
  const usernameForStorage = options.username.startsWith("@")
    ? options.username.slice(1)
    : options.username;
  const displayUsername = `@${usernameForStorage}`;

  // Handle encode-only mode (no private key required)
  if (options.encodeOnly) {
    const readOnlyOptions = parseReadOnlyOptions({
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });

    // If address provided, read existing metadata to preserve other fields
    let existing: Awaited<ReturnType<typeof readExistingMetadata>> = {};
    if (options.address) {
      const storageClient = new StorageClient({
        chainId: readOnlyOptions.chainId,
        overrides: options.rpcUrl
          ? { rpcUrls: [options.rpcUrl] }
          : undefined,
      });
      existing = await readExistingMetadata(options.address, storageClient);
    }

    const storageArgs = getProfileMetadataStorageArgs({
      x_username: usernameForStorage,
      bio: existing.bio,
      display_name: existing.display_name,
      token_address: existing.token_address,
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

    console.log(chalk.blue(`Setting X username...`));
    console.log(chalk.gray(`   Username: ${displayUsername}`));
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

    // Merge: update x_username, preserve other fields
    const storageArgs = getProfileMetadataStorageArgs({
      x_username: usernameForStorage,
      bio: existing.bio,
      display_name: existing.display_name,
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
          `\nX username updated successfully!\n  Transaction: ${hash}\n  Username: ${displayUsername}`
        )
      );
    } else {
      exitWithError(`Transaction failed: ${hash}`);
    }
  } catch (error) {
    exitWithError(
      `Failed to set X username: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
