import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { StorageClient } from "@net-protocol/storage";
import { PROFILE_CSS_STORAGE_KEY } from "@net-protocol/profiles";
import { parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import type { ProfileGetCSSOptions } from "./types";

/**
 * Execute the profile get-css command — reads custom CSS for an address
 */
export async function executeProfileGetCSS(
  options: ProfileGetCSSOptions
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
    let cssContent: string | undefined;

    try {
      const result = await client.readStorageData({
        key: PROFILE_CSS_STORAGE_KEY,
        operator: options.address,
      });

      if (result.data) {
        cssContent = result.data;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage !== "StoredDataNotFound") {
        throw error;
      }
    }

    // Handle JSON output
    if (options.json) {
      const output = {
        address: options.address,
        chainId: readOnlyOptions.chainId,
        css: cssContent || null,
        hasCSS: !!cssContent,
        contentLength: cssContent ? cssContent.length : 0,
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // No CSS found
    if (!cssContent) {
      exitWithError(`No custom CSS found for address: ${options.address}`);
    }

    // Handle output to file
    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, cssContent, "utf-8");
      console.log(
        chalk.green(
          `CSS written to: ${outputPath} (${cssContent.length} bytes)`
        )
      );
      return;
    }

    // Output to stdout
    console.log(cssContent);
  } catch (error) {
    exitWithError(
      `Failed to read CSS: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
