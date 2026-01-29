import chalk from "chalk";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { getChainRpcUrls } from "@net-protocol/core";
import {
  getXUsernameStorageArgs,
  isValidXUsername,
  STORAGE_CONTRACT,
} from "@net-protocol/profiles";
import { parseCommonOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
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

  // Parse common options
  const commonOptions = parseCommonOptions({
    privateKey: options.privateKey,
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  // Get storage args (will add @ prefix if needed)
  const storageArgs = getXUsernameStorageArgs(options.username);

  // Normalize username for display
  const displayUsername = options.username.startsWith("@")
    ? options.username
    : `@${options.username}`;

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

    console.log(chalk.blue(`🐦 Setting X username...`));
    console.log(chalk.gray(`   Username: ${displayUsername}`));
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
          `\n✓ X username updated successfully!\n  Transaction: ${hash}\n  Username: ${displayUsername}`
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
