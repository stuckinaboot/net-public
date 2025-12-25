#!/usr/bin/env tsx

import "dotenv/config";
import { Command } from "commander";
import { uploadFile } from "./upload";
import type { UploadOptions } from "./types";
import chalk from "chalk";
import { encodeStorageKeyForUrl } from "@net-protocol/storage";

const program = new Command();

program
  .name("net-storage-upload")
  .description("Upload files to Net Storage")
  .requiredOption("--file <path>", "Path to file to upload")
  .requiredOption("--key <key>", "Storage key (filename/identifier)")
  .requiredOption("--text <text>", "Text description/filename")
  .option(
    "--private-key <key>",
    "Private key (0x-prefixed hex, 66 characters). Can also be set via NET_PRIVATE_KEY env var"
  )
  .option(
    "--chain-id <id>",
    "Chain ID (8453 for Base, 1 for Ethereum, etc.). Can also be set via NET_CHAIN_ID env var",
    (value) => parseInt(value, 10)
  )
  .option(
    "--rpc-url <url>",
    "Custom RPC URL (can also be set via NET_RPC_URL env var)"
  )
  .action(async (options) => {
    // Get private key from option or environment variable
    const privateKey =
      options.privateKey ||
      process.env.NET_PRIVATE_KEY ||
      process.env.PRIVATE_KEY;

    if (!privateKey) {
      console.error(
        chalk.red(
          "Error: Private key is required. Provide via --private-key flag or NET_PRIVATE_KEY/PRIVATE_KEY environment variable"
        )
      );
      process.exit(1);
    }

    // Validate private key format
    if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
      console.error(
        chalk.red(
          "Error: Invalid private key format (must be 0x-prefixed, 66 characters)"
        )
      );
      process.exit(1);
    }

    // Warn about private key security if provided via command line
    if (options.privateKey) {
      console.warn(
        chalk.yellow(
          "⚠️  Warning: Private key provided via command line. Consider using NET_PRIVATE_KEY environment variable instead."
        )
      );
    }

    // Get chain ID from option or environment variable
    const chainId =
      options.chainId ||
      (process.env.NET_CHAIN_ID
        ? parseInt(process.env.NET_CHAIN_ID, 10)
        : undefined);

    if (!chainId) {
      console.error(
        chalk.red(
          "Error: Chain ID is required. Provide via --chain-id flag or NET_CHAIN_ID environment variable"
        )
      );
      process.exit(1);
    }

    // Get RPC URL from option or environment variable
    const rpcUrl = options.rpcUrl || process.env.NET_RPC_URL;

    const uploadOptions: UploadOptions = {
      filePath: options.file,
      storageKey: options.key,
      text: options.text,
      privateKey: privateKey as `0x${string}`,
      chainId,
      rpcUrl,
    };

    try {
      console.log(chalk.blue(`📁 Reading file: ${options.file}`));
      const result = await uploadFile(uploadOptions);

      // Generate storage URL
      const storageUrl =
        result.operatorAddress &&
        `https://storedon.net/net/${chainId}/storage/load/${
          result.operatorAddress
        }/${encodeStorageKeyForUrl(options.key)}`;

      if (result.skipped && result.transactionsSent === 0) {
        console.log(
          chalk.green(
            `✓ All data already stored - skipping upload\n  Storage Key: ${
              options.key
            }\n  Skipped: ${result.transactionsSkipped} transaction(s)${
              storageUrl ? `\n  Storage URL: ${chalk.cyan(storageUrl)}` : ""
            }`
          )
        );
        process.exit(0);
      }

      if (result.success) {
        console.log(
          chalk.green(
            `✓ File uploaded successfully!\n  Storage Key: ${
              options.key
            }\n  Storage Type: ${
              result.transactionsSkipped > 0 ? "XML" : "Normal"
            }\n  Transactions Sent: ${
              result.transactionsSent
            }\n  Transactions Skipped: ${
              result.transactionsSkipped
            }\n  Final Transaction Hash: ${result.finalHash || "N/A"}${
              storageUrl ? `\n  Storage URL: ${chalk.cyan(storageUrl)}` : ""
            }`
          )
        );
        process.exit(0);
      } else {
        console.error(
          chalk.red(
            `✗ Upload completed with errors\n  Transactions Sent: ${
              result.transactionsSent
            }\n  Transactions Skipped: ${
              result.transactionsSkipped
            }\n  Transactions Failed: ${result.transactionsFailed}\n  Error: ${
              result.error || "Unknown error"
            }`
          )
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(
        chalk.red(
          `Upload failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
      process.exit(1);
    }
  });

program.parse();
