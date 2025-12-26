import { Command } from "commander";
import chalk from "chalk";
import { parseCommonOptions } from "../../cli/shared";
import { uploadFile } from "./core/upload";
import { previewFile } from "./core/preview";
import { generateStorageUrl } from "./utils";
import type { UploadOptions } from "./types";

/**
 * Register the storage command with the commander program
 */
export function registerStorageCommand(program: Command): void {
  // Command group - no options, no action
  const storageCommand = program
    .command("storage")
    .description("Storage operations");

  // Upload subcommand (current storage functionality)
  const uploadCommand = new Command("upload")
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
      // Parse common options (private-key, chain-id, rpc-url)
      const commonOptions = parseCommonOptions({
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
      });

      const uploadOptions: UploadOptions = {
        filePath: options.file,
        storageKey: options.key,
        text: options.text,
        privateKey: commonOptions.privateKey,
        chainId: commonOptions.chainId,
        rpcUrl: commonOptions.rpcUrl,
      };

      try {
        console.log(chalk.blue(`📁 Reading file: ${options.file}`));
        const result = await uploadFile(uploadOptions);

        // Generate storage URL
        const storageUrl = generateStorageUrl(
          result.operatorAddress,
          commonOptions.chainId,
          options.key
        );

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
                result.storageType === "xml" ? "XML" : "Normal"
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
              }\n  Transactions Failed: ${
                result.transactionsFailed
              }\n  Error: ${result.error || "Unknown error"}`
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

  // Preview subcommand
  const previewCommand = new Command("preview")
    .description("Preview storage upload without submitting transactions")
    .requiredOption("--file <path>", "Path to file to preview")
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
      // Parse common options (private-key, chain-id, rpc-url)
      const commonOptions = parseCommonOptions({
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
      });

      const previewOptions: UploadOptions = {
        filePath: options.file,
        storageKey: options.key,
        text: options.text,
        privateKey: commonOptions.privateKey,
        chainId: commonOptions.chainId,
        rpcUrl: commonOptions.rpcUrl,
      };

      try {
        console.log(chalk.blue(`📁 Reading file: ${options.file}`));
        const result = await previewFile(previewOptions);

        // Generate storage URL
        const storageUrl = generateStorageUrl(
          result.operatorAddress,
          commonOptions.chainId,
          options.key
        );

        // Display preview results
        console.log(chalk.cyan("\n📊 Storage Preview:"));
        console.log(`  Storage Key: ${chalk.white(result.storageKey)}`);
        console.log(
          `  Storage Type: ${chalk.white(
            result.storageType === "xml" ? "XML" : "Normal"
          )}`
        );
        console.log(`  Total Chunks: ${chalk.white(result.totalChunks)}`);
        console.log(
          `  Already Stored: ${chalk.green(result.alreadyStoredChunks)}`
        );
        console.log(
          `  Need to Store: ${chalk.yellow(result.needToStoreChunks)}`
        );

        if (result.storageType === "xml" && result.metadataNeedsStorage) {
          console.log(`  Metadata: ${chalk.yellow("Needs Storage")}`);
        } else if (result.storageType === "xml") {
          console.log(`  Metadata: ${chalk.green("Already Stored")}`);
        }

        console.log(
          `  Total Transactions: ${chalk.white(result.totalTransactions)}`
        );
        console.log(
          `  Transactions to Send: ${chalk.yellow(result.transactionsToSend)}`
        );
        console.log(
          `  Transactions Skipped: ${chalk.green(result.transactionsSkipped)}`
        );
        console.log(
          `  Operator Address: ${chalk.gray(result.operatorAddress)}`
        );

        if (storageUrl) {
          console.log(`  Storage URL: ${chalk.cyan(storageUrl)}`);
        }

        if (result.needToStoreChunks === 0 && !result.metadataNeedsStorage) {
          console.log(
            chalk.green("\n✓ All data is already stored - no upload needed")
          );
        } else {
          console.log(
            chalk.yellow(
              `\n⚠ ${result.transactionsToSend} transaction(s) would be sent`
            )
          );
        }

        process.exit(0);
      } catch (error) {
        console.error(
          chalk.red(
            `Preview failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
        process.exit(1);
      }
    });

  storageCommand.addCommand(uploadCommand);
  storageCommand.addCommand(previewCommand);
}
