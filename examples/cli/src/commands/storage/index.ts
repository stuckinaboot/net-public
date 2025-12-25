import { Command } from "commander";
import chalk from "chalk";
import { parseCommonOptions } from "../../cli/shared";
import { uploadFile } from "./core/upload";
import { generateStorageUrl } from "./utils";
import type { UploadOptions } from "./types";

/**
 * Register the storage command with the commander program
 */
export function registerStorageCommand(program: Command): void {
  const storageCommand = program
    .command("storage")
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
}

