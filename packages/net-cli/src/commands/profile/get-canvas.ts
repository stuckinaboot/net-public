import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { StorageClient } from "@net-protocol/storage";
import { PROFILE_CANVAS_STORAGE_KEY } from "@net-protocol/profiles";
import { parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import type { ProfileGetCanvasOptions } from "./types";

/**
 * Check if content is a data URI
 */
function isDataUri(content: string): boolean {
  return content.startsWith("data:");
}

/**
 * Parse a data URI and return the buffer and mime type
 */
function parseDataUri(dataUri: string): { buffer: Buffer; mimeType: string } {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URI format");
  }
  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");
  return { buffer, mimeType };
}

/**
 * Get file extension from mime type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
    "text/html": ".html",
    "text/css": ".css",
    "application/javascript": ".js",
    "application/json": ".json",
    "text/plain": ".txt",
    "application/octet-stream": ".bin",
  };
  return extensions[mimeType] || ".bin";
}

/**
 * Execute the profile get-canvas command - reads canvas data for an address
 */
export async function executeProfileGetCanvas(
  options: ProfileGetCanvasOptions
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
    // Read canvas from chunked storage
    let canvasContent: string | undefined;
    let canvasText: string | undefined;

    try {
      const result = await client.readChunkedStorage({
        key: PROFILE_CANVAS_STORAGE_KEY,
        operator: options.address,
      });

      if (result.data) {
        canvasContent = result.data;
        canvasText = result.text;
      }
    } catch (error) {
      // Check for "not found" type errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage !== "ChunkedStorage metadata not found" &&
        !errorMessage.includes("not found")
      ) {
        throw error;
      }
      // No canvas exists - that's okay
    }

    // Handle JSON output
    if (options.json) {
      const output = {
        address: options.address,
        chainId: readOnlyOptions.chainId,
        canvas: canvasContent || null,
        filename: canvasText || null,
        hasCanvas: !!canvasContent,
        isDataUri: canvasContent ? isDataUri(canvasContent) : false,
        contentLength: canvasContent ? canvasContent.length : 0,
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // No canvas found
    if (!canvasContent) {
      exitWithError(`No canvas found for address: ${options.address}`);
    }

    // Handle output to file
    if (options.output) {
      const outputPath = path.resolve(options.output);

      // Check if content is a data URI (binary)
      if (isDataUri(canvasContent)) {
        const { buffer, mimeType } = parseDataUri(canvasContent);

        // If output path doesn't have extension, add one based on mime type
        let finalPath = outputPath;
        if (!path.extname(outputPath)) {
          finalPath = outputPath + getExtensionFromMimeType(mimeType);
        }

        fs.writeFileSync(finalPath, buffer);
        console.log(
          chalk.green(`Canvas written to: ${finalPath} (${buffer.length} bytes)`)
        );
      } else {
        // Text content
        fs.writeFileSync(outputPath, canvasContent, "utf-8");
        console.log(
          chalk.green(
            `Canvas written to: ${outputPath} (${canvasContent.length} bytes)`
          )
        );
      }
      return;
    }

    // Output to stdout
    // For binary content (data URI), output as-is since stdout can't handle raw binary
    console.log(canvasContent);
  } catch (error) {
    exitWithError(
      `Failed to read canvas: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
