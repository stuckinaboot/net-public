import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { getChainRpcUrls } from "@net-protocol/core";
import {
  PROFILE_CANVAS_STORAGE_KEY,
  PROFILE_CANVAS_TOPIC,
} from "@net-protocol/profiles";
import {
  CHUNKED_STORAGE_CONTRACT,
  chunkDataForStorage,
} from "@net-protocol/storage";
import { toBytes32 } from "@net-protocol/core";
import { parseCommonOptions, parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import { encodeTransaction } from "../../shared/encode";
import type { ProfileSetCanvasOptions } from "./types";

const MAX_CANVAS_SIZE = 60 * 1024; // 60KB
const CANVAS_FILENAME = "profile-compressed.html";

/**
 * Check if a buffer contains binary data (non-text)
 */
function isBinaryContent(buffer: Buffer): boolean {
  // Check for null bytes or other non-text characters in the first 8KB
  const sampleSize = Math.min(buffer.length, 8192);
  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i];
    // Null byte is a strong indicator of binary
    if (byte === 0) return true;
    // Control characters (except tab, newline, carriage return)
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) return true;
  }
  return false;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".txt": "text/plain",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Convert binary buffer to data URI
 */
function bufferToDataUri(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Execute the profile set-canvas command
 */
export async function executeProfileSetCanvas(
  options: ProfileSetCanvasOptions
): Promise<void> {
  // Validate: must provide --file or --content, but not both
  if (!options.file && !options.content) {
    exitWithError(
      "Must provide either --file or --content to set canvas content."
    );
  }

  if (options.file && options.content) {
    exitWithError("Cannot provide both --file and --content. Choose one.");
  }

  let canvasContent: string;

  // Read content from file or use provided content
  if (options.file) {
    const filePath = path.resolve(options.file);

    // Check file exists
    if (!fs.existsSync(filePath)) {
      exitWithError(`File not found: ${filePath}`);
    }

    // Read file as buffer to detect binary content
    const buffer = fs.readFileSync(filePath);

    // Check file size
    if (buffer.length > MAX_CANVAS_SIZE) {
      exitWithError(
        `File too large: ${buffer.length} bytes exceeds maximum of ${MAX_CANVAS_SIZE} bytes (60KB).`
      );
    }

    // Handle binary files (convert to data URI)
    if (isBinaryContent(buffer)) {
      const mimeType = getMimeType(filePath);
      canvasContent = bufferToDataUri(buffer, mimeType);
    } else {
      canvasContent = buffer.toString("utf-8");
    }
  } else {
    // Use provided content
    canvasContent = options.content!;

    // Check content size
    const contentSize = Buffer.byteLength(canvasContent, "utf-8");
    if (contentSize > MAX_CANVAS_SIZE) {
      exitWithError(
        `Content too large: ${contentSize} bytes exceeds maximum of ${MAX_CANVAS_SIZE} bytes (60KB).`
      );
    }
  }

  // Prepare storage key as bytes32
  const bytesKey = toBytes32(PROFILE_CANVAS_STORAGE_KEY) as `0x${string}`;

  // Chunk and compress data for storage
  const chunks = chunkDataForStorage(canvasContent);

  // Handle encode-only mode (no private key required)
  if (options.encodeOnly) {
    const readOnlyOptions = parseReadOnlyOptions({
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    });
    const encoded = encodeTransaction(
      {
        to: CHUNKED_STORAGE_CONTRACT.address,
        abi: CHUNKED_STORAGE_CONTRACT.abi,
        functionName: "put",
        args: [bytesKey, CANVAS_FILENAME, chunks],
      },
      readOnlyOptions.chainId
    );
    console.log(JSON.stringify(encoded, null, 2));
    return;
  }

  // Parse common options (requires private key for transaction submission)
  const commonOptions = parseCommonOptions(
    {
      privateKey: options.privateKey,
      chainId: options.chainId,
      rpcUrl: options.rpcUrl,
    },
    true // supports --encode-only
  );

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

    console.log(chalk.blue(`Setting profile canvas...`));
    console.log(
      chalk.gray(`   Content size: ${Buffer.byteLength(canvasContent)} bytes`)
    );
    console.log(chalk.gray(`   Chunks: ${chunks.length}`));
    console.log(chalk.gray(`   Address: ${account.address}`));

    // Submit transaction to ChunkedStorage
    const hash = await client.writeContract({
      address: CHUNKED_STORAGE_CONTRACT.address as `0x${string}`,
      abi: CHUNKED_STORAGE_CONTRACT.abi,
      functionName: "put",
      args: [bytesKey, CANVAS_FILENAME, chunks],
    });

    console.log(chalk.blue(`Waiting for confirmation...`));

    // Wait for transaction
    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log(
        chalk.green(
          `\nCanvas updated successfully!\n  Transaction: ${hash}\n  Content size: ${Buffer.byteLength(canvasContent)} bytes\n  Chunks: ${chunks.length}`
        )
      );
    } else {
      exitWithError(`Transaction failed: ${hash}`);
    }
  } catch (error) {
    exitWithError(
      `Failed to set canvas: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
