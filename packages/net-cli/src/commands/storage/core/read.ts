import chalk from "chalk";
import { StorageClient } from "@net-protocol/storage";
import { hexToString } from "viem";
import { parseReadOnlyOptions } from "../../../cli/shared";
import { exitWithError } from "../../../shared/output";

export interface StorageReadOptions {
  key: string;
  operator: string;
  chainId?: number;
  rpcUrl?: string;
  index?: number;
  json?: boolean;
  raw?: boolean;
}

/**
 * Execute the storage read command
 */
export async function executeStorageRead(
  options: StorageReadOptions
): Promise<void> {
  const readOnlyOptions = parseReadOnlyOptions({
    chainId: options.chainId,
    rpcUrl: options.rpcUrl,
  });

  const client = new StorageClient({
    chainId: readOnlyOptions.chainId,
    overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
  });

  try {
    // Use readStorageData which handles XML resolution
    const result = await client.readStorageData({
      key: options.key,
      operator: options.operator,
      index: options.index,
    });

    if (options.json) {
      const output = {
        key: options.key,
        operator: options.operator,
        chainId: readOnlyOptions.chainId,
        text: result.text,
        data: options.raw ? result.data : result.data,
        isXml: result.isXml,
        ...(options.index !== undefined && { index: options.index }),
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // Human-readable output
    console.log(chalk.white.bold("\nStorage Value:\n"));
    console.log(`  ${chalk.cyan("Key:")} ${options.key}`);
    console.log(`  ${chalk.cyan("Operator:")} ${options.operator}`);
    console.log(`  ${chalk.cyan("Chain ID:")} ${readOnlyOptions.chainId}`);
    if (options.index !== undefined) {
      console.log(`  ${chalk.cyan("Index:")} ${options.index}`);
    }
    console.log(`  ${chalk.cyan("Text:")} ${result.text || "(empty)"}`);
    console.log(`  ${chalk.cyan("Is XML:")} ${result.isXml ? "Yes" : "No"}`);

    // For data, show a preview if it's long
    const dataPreview =
      result.data.length > 500
        ? result.data.substring(0, 500) + "... (truncated)"
        : result.data;

    console.log(`  ${chalk.cyan("Data:")}`);
    if (result.data) {
      console.log(chalk.gray(`    ${dataPreview.split("\n").join("\n    ")}`));
    } else {
      console.log(chalk.gray("    (empty)"));
    }
    console.log();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    if (errorMessage === "StoredDataNotFound") {
      if (options.json) {
        console.log(
          JSON.stringify(
            {
              key: options.key,
              operator: options.operator,
              chainId: readOnlyOptions.chainId,
              error: "Not found",
            },
            null,
            2
          )
        );
        process.exit(1);
      }
      exitWithError(
        `No data found for key "${options.key}" and operator "${options.operator}"`
      );
    }

    exitWithError(`Failed to read storage: ${errorMessage}`);
  }
}
