import chalk from "chalk";
import { StorageClient } from "@net-protocol/storage";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { getChainRpcUrls } from "@net-protocol/core";
import {
  getProfileMetadataStorageArgs,
  isValidTokenAddress,
  STORAGE_CONTRACT,
} from "@net-protocol/profiles";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import { readExistingMetadata } from "./utils";
import type { ProfileSetTokenAddressOptions } from "./types";

/**
 * Execute the profile set-token-address command
 */
export async function executeProfileSetTokenAddress(
  options: ProfileSetTokenAddressOptions
): Promise<void> {
  // Validate token address
  if (!isValidTokenAddress(options.tokenAddress)) {
    exitWithError(
      `Invalid token address: "${options.tokenAddress}". Must be a valid EVM address (0x-prefixed, 40 hex characters).`
    );
  }

  // Store as lowercase
  const normalizedAddress = options.tokenAddress.toLowerCase();

  // Handle encode-only mode (no private key required)
  if (options.encodeOnly) {
    const readOnlyOptions = parseReadOnlyOptions({
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });
    const storageArgs = getProfileMetadataStorageArgs({
      token_address: normalizedAddress,
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

    console.log(chalk.blue(`Setting profile token address...`));
    console.log(chalk.gray(`   Token Address: ${normalizedAddress}`));
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

    // Merge: update token_address, preserve other fields
    const storageArgs = getProfileMetadataStorageArgs({
      token_address: normalizedAddress,
      x_username: existing.x_username,
      bio: existing.bio,
      display_name: existing.display_name,
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
          `\nToken address updated successfully!\n  Transaction: ${hash}\n  Token Address: ${normalizedAddress}`
        )
      );
    } else {
      exitWithError(`Transaction failed: ${hash}`);
    }
  } catch (error) {
    exitWithError(
      `Failed to set token address: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
