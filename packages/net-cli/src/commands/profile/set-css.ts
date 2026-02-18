import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { getChainRpcUrls } from "@net-protocol/core";
import {
  getProfileCSSStorageArgs,
  isValidCSS,
  MAX_CSS_SIZE,
  STORAGE_CONTRACT,
  DEMO_THEMES,
} from "@net-protocol/profiles";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import type { ProfileSetCSSOptions } from "./types";

/**
 * Execute the profile set-css command
 */
export async function executeProfileSetCSS(
  options: ProfileSetCSSOptions
): Promise<void> {
  // Validate: must provide exactly one of --file, --content, or --theme
  const sourceCount = [options.file, options.content, options.theme].filter(
    Boolean
  ).length;
  if (sourceCount === 0) {
    exitWithError(
      "Must provide one of --file, --content, or --theme to set CSS."
    );
  }
  if (sourceCount > 1) {
    exitWithError("Cannot provide more than one of --file, --content, --theme.");
  }

  let cssContent: string;

  if (options.theme) {
    // Use a built-in demo theme
    const theme = DEMO_THEMES[options.theme];
    if (!theme) {
      const available = Object.entries(DEMO_THEMES)
        .map(([key, val]) => `  ${key} — ${val.name}`)
        .join("\n");
      exitWithError(
        `Unknown theme: "${options.theme}"\n\nAvailable themes:\n${available}`
      );
    }
    cssContent = theme.css;
    console.log(chalk.gray(`   Using theme: ${theme.name}`));
  } else if (options.file) {
    const filePath = path.resolve(options.file);
    if (!fs.existsSync(filePath)) {
      exitWithError(`File not found: ${filePath}`);
    }
    const buffer = fs.readFileSync(filePath);
    if (buffer.length > MAX_CSS_SIZE) {
      exitWithError(
        `File too large: ${buffer.length} bytes exceeds maximum of ${MAX_CSS_SIZE} bytes (10KB).`
      );
    }
    cssContent = buffer.toString("utf-8");
  } else {
    cssContent = options.content!;
    const contentSize = Buffer.byteLength(cssContent, "utf-8");
    if (contentSize > MAX_CSS_SIZE) {
      exitWithError(
        `Content too large: ${contentSize} bytes exceeds maximum of ${MAX_CSS_SIZE} bytes (10KB).`
      );
    }
  }

  // Validate CSS
  if (!isValidCSS(cssContent)) {
    exitWithError(
      "Invalid CSS: content is empty, too large, or contains disallowed patterns (script injection)."
    );
  }

  // Prepare storage args
  const storageArgs = getProfileCSSStorageArgs(cssContent);

  // Handle encode-only mode
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

  // Parse common options (requires private key)
  const commonOptions = parseCommonOptions(
    {
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    },
    true
  );

  try {
    const account = privateKeyToAccount(commonOptions.privateKey);
    const rpcUrls = getChainRpcUrls({
      chainId: commonOptions.chainId,
      rpcUrl: commonOptions.rpcUrl,
    });

    const client = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrls[0]),
    }).extend(publicActions);

    console.log(chalk.blue(`Setting profile CSS...`));
    console.log(
      chalk.gray(
        `   Content size: ${Buffer.byteLength(cssContent, "utf-8")} bytes`
      )
    );
    console.log(chalk.gray(`   Address: ${account.address}`));

    const hash = await client.writeContract({
      address: STORAGE_CONTRACT.address as `0x${string}`,
      abi: STORAGE_CONTRACT.abi,
      functionName: "put",
      args: [storageArgs.bytesKey, storageArgs.topic, storageArgs.bytesValue],
    });

    console.log(chalk.blue(`Waiting for confirmation...`));

    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log(
        chalk.green(
          `\nCSS updated successfully!\n  Transaction: ${hash}\n  Content size: ${Buffer.byteLength(cssContent, "utf-8")} bytes`
        )
      );
    } else {
      exitWithError(`Transaction failed: ${hash}`);
    }
  } catch (error) {
    exitWithError(
      `Failed to set CSS: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
