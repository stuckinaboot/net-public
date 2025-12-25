#!/usr/bin/env node

import { Command } from "commander";
import { uploadFile } from "./upload";
import type { UploadOptions } from "./types";
import chalk from "chalk";

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
  .requiredOption(
    "--chain-id <id>",
    "Chain ID (8453 for Base, 1 for Ethereum, etc.)",
    (value) => parseInt(value, 10)
  )
  .option("--rpc-url <url>", "Custom RPC URL")
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

    const uploadOptions: UploadOptions = {
      filePath: options.file,
      storageKey: options.key,
      text: options.text,
      privateKey: privateKey as `0x${string}`,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    };

    try {
      console.log(chalk.blue(`📁 Reading file: ${options.file}`));
      const result = await uploadFile(uploadOptions);

      if (result.skipped && result.transactionsSent === 0) {
        console.log(
          chalk.green(
            `✓ All data already stored - skipping upload\n  Storage Key: ${options.key}\n  Skipped: ${result.transactionsSkipped} transaction(s)`
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
            }\n  Final Transaction Hash: ${result.finalHash || "N/A"}`
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
