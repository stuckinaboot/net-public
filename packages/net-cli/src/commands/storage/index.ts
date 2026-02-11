import { Command } from "commander";
import chalk from "chalk";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { uploadFile } from "./core/upload";
import { uploadFileWithRelay } from "./core/uploadRelay";
import { previewFile } from "./core/preview";
import { executeStorageRead } from "./core/read";
import { encodeStorageUpload } from "./core/encode";
import { generateStorageUrl } from "./utils";
import { OPTIMAL_CHUNK_SIZE } from "@net-protocol/storage";
import type { UploadOptions } from "./types";
import type { UploadWithRelayOptions } from "./relay/types";

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
    .option(
      "--encode-only",
      "Output transaction data as JSON instead of executing"
    )
    .option(
      "--chunk-size <bytes>",
      `Max chunk size in bytes for splitting large files (default: ${OPTIMAL_CHUNK_SIZE})`,
      (value) => parseInt(value, 10)
    )
    .action(async (options) => {
      // Handle encode-only mode
      if (options.encodeOnly) {
        try {
          const result = await encodeStorageUpload({
            filePath: options.file,
            storageKey: options.key,
            text: options.text,
            privateKey: options.privateKey,
            chainId: options.chainId,
            rpcUrl: options.rpcUrl,
            chunkSize: options.chunkSize,
          });
          console.log(JSON.stringify(result, null, 2));
          process.exit(0);
        } catch (error) {
          console.error(
            chalk.red(
              `Encode failed: ${
                error instanceof Error ? error.message : String(error)
              }`
            )
          );
          process.exit(1);
        }
        return;
      }

      // Parse common options (private-key, chain-id, rpc-url)
      const commonOptions = parseCommonOptions(
        {
          privateKey: options.privateKey,
          chainId: options.chainId,
          rpcUrl: options.rpcUrl,
        },
        true // supports --encode-only
      );

      const uploadOptions: UploadOptions = {
        filePath: options.file,
        storageKey: options.key,
        text: options.text,
        privateKey: commonOptions.privateKey,
        chainId: commonOptions.chainId,
        rpcUrl: commonOptions.rpcUrl,
        chunkSize: options.chunkSize,
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
    .option(
      "--chunk-size <bytes>",
      `Max chunk size in bytes for splitting large files (default: ${OPTIMAL_CHUNK_SIZE})`,
      (value) => parseInt(value, 10)
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
        chunkSize: options.chunkSize,
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

  // Upload-relay subcommand (relay upload via x402)
  const uploadRelayCommand = new Command("upload-relay")
    .description("Upload files to Net Storage via x402 relay (backend pays gas for chunks)")
    .requiredOption("--file <path>", "Path to file to upload")
    .requiredOption("--key <key>", "Storage key (filename/identifier)")
    .requiredOption("--text <text>", "Text description/filename")
    .requiredOption(
      "--api-url <url>",
      "Backend API URL (e.g., http://localhost:3000)"
    )
    .requiredOption(
      "--secret-key <key>",
      "Secret key for backend wallet derivation. Can also be set via X402_SECRET_KEY env var"
    )
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
    .option(
      "--chunk-size <bytes>",
      `Max chunk size in bytes for splitting large files (default: ${OPTIMAL_CHUNK_SIZE})`,
      (value) => parseInt(value, 10)
    )
    .action(async (options) => {
      // Parse common options (private-key, chain-id, rpc-url)
      const commonOptions = parseCommonOptions({
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
      });

      // Parse secret key from options or env
      const secretKey =
        options.secretKey || process.env.X402_SECRET_KEY;
      if (!secretKey) {
        console.error(
          chalk.red(
            "Error: --secret-key is required or set X402_SECRET_KEY environment variable"
          )
        );
        process.exit(1);
      }

      const uploadRelayOptions: UploadWithRelayOptions = {
        filePath: options.file,
        storageKey: options.key,
        text: options.text,
        privateKey: commonOptions.privateKey,
        chainId: commonOptions.chainId,
        rpcUrl: commonOptions.rpcUrl,
        apiUrl: options.apiUrl,
        secretKey,
        chunkSize: options.chunkSize,
      };

      try {
        console.log(chalk.blue(`📁 Reading file: ${options.file}`));
        console.log(chalk.blue(`🔗 Using relay API: ${options.apiUrl}`));
        const result = await uploadFileWithRelay(uploadRelayOptions);

        // Generate storage URL (using user address, not backend wallet)
        const { privateKeyToAccount } = await import("viem/accounts");
        const userAccount = privateKeyToAccount(commonOptions.privateKey);
        const storageUrl = generateStorageUrl(
          userAccount.address,
          commonOptions.chainId,
          options.key
        );

        if (result.success) {
          console.log(
            chalk.green(
              `✓ File uploaded successfully via relay!\n  Storage Key: ${
                options.key
              }\n  Top-Level Hash: ${result.topLevelHash}\n  Chunks Sent: ${
                result.chunksSent
              }\n  Chunks Skipped: ${
                result.chunksSkipped
              }\n  Metadata Submitted: ${
                result.metadataSubmitted ? "Yes" : "No (already exists)"
              }\n  Backend Wallet: ${result.backendWalletAddress}\n  Chunk Transaction Hashes: ${
                result.chunkTransactionHashes.length > 0
                  ? result.chunkTransactionHashes.join(", ")
                  : "None"
              }${
                result.metadataTransactionHash
                  ? `\n  Metadata Transaction Hash: ${result.metadataTransactionHash}`
                  : ""
              }${
                storageUrl ? `\n  Storage URL: ${chalk.cyan(storageUrl)}` : ""
              }`
            )
          );
          process.exit(0);
        } else {
          console.error(
            chalk.red(
              `✗ Upload completed with errors\n  Chunks Sent: ${
                result.chunksSent
              }\n  Chunks Skipped: ${
                result.chunksSkipped
              }\n  Metadata Submitted: ${
                result.metadataSubmitted ? "Yes" : "No"
              }\n  Errors: ${
                result.errors
                  ? result.errors.map((e) => e.message).join(", ")
                  : "Unknown error"
              }`
            )
          );
          process.exit(1);
        }
      } catch (error) {
        console.error(
          chalk.red(
            `Upload via relay failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
        process.exit(1);
      }
    });

  // Read subcommand
  const readCommand = new Command("read")
    .description("Read data from Net Storage")
    .requiredOption("--key <key>", "Storage key to read")
    .requiredOption("--operator <address>", "Operator address (wallet that stored the data)")
    .option(
      "--chain-id <id>",
      "Chain ID. Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option(
      "--rpc-url <url>",
      "Custom RPC URL. Can also be set via NET_RPC_URL env var"
    )
    .option(
      "--index <n>",
      "Historical version index (0 = oldest). Omit for latest.",
      (value) => parseInt(value, 10)
    )
    .option("--json", "Output in JSON format")
    .option("--raw", "Output raw data without truncation (use with --json)")
    .action(async (options) => {
      await executeStorageRead({
        key: options.key,
        operator: options.operator,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        index: options.index,
        json: options.json,
        raw: options.raw,
      });
    });

  storageCommand.addCommand(uploadCommand);
  storageCommand.addCommand(previewCommand);
  storageCommand.addCommand(uploadRelayCommand);
  storageCommand.addCommand(readCommand);
}
