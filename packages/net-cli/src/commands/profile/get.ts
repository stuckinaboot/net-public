import chalk from "chalk";
import { StorageClient } from "@net-protocol/storage";
import { hexToString } from "viem";
import {
  PROFILE_PICTURE_STORAGE_KEY,
  PROFILE_METADATA_STORAGE_KEY,
  PROFILE_CANVAS_STORAGE_KEY,
  PROFILE_CSS_STORAGE_KEY,
  parseProfileMetadata,
} from "@net-protocol/profiles";
import { parseReadOnlyOptions } from "../../cli/shared";
import { exitWithError } from "../../shared/output";
import type { ProfileGetOptions } from "./types";

/**
 * Execute the profile get command - reads profile data for an address
 */
export async function executeProfileGet(
  options: ProfileGetOptions
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
    // Fetch profile picture
    let profilePicture: string | undefined;
    try {
      const pictureResult = await client.readStorageData({
        key: PROFILE_PICTURE_STORAGE_KEY,
        operator: options.address,
      });
      if (pictureResult.data) {
        profilePicture = pictureResult.data;
      }
    } catch (error) {
      // Not found is okay
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage !== "StoredDataNotFound") {
        throw error;
      }
    }

    // Fetch profile metadata (X username, bio, token address)
    let xUsername: string | undefined;
    let bio: string | undefined;
    let tokenAddress: string | undefined;
    try {
      const metadataResult = await client.readStorageData({
        key: PROFILE_METADATA_STORAGE_KEY,
        operator: options.address,
      });
      if (metadataResult.data) {
        const metadata = parseProfileMetadata(metadataResult.data);
        xUsername = metadata?.x_username;
        bio = metadata?.bio;
        tokenAddress = metadata?.token_address;
      }
    } catch (error) {
      // Not found is okay
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage !== "StoredDataNotFound") {
        throw error;
      }
    }

    // Fetch profile canvas
    let canvasSize: number | undefined;
    let canvasIsDataUri = false;
    try {
      const canvasResult = await client.readChunkedStorage({
        key: PROFILE_CANVAS_STORAGE_KEY,
        operator: options.address,
      });
      if (canvasResult.data) {
        canvasSize = canvasResult.data.length;
        canvasIsDataUri = canvasResult.data.startsWith("data:");
      }
    } catch (error) {
      // Not found is okay
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage !== "ChunkedStorage metadata not found" &&
        !errorMessage.includes("not found")
      ) {
        throw error;
      }
    }

    // Fetch profile CSS
    let cssSize: number | undefined;
    try {
      const cssResult = await client.readStorageData({
        key: PROFILE_CSS_STORAGE_KEY,
        operator: options.address,
      });
      if (cssResult.data) {
        cssSize = cssResult.data.length;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage !== "StoredDataNotFound") {
        throw error;
      }
    }

    const hasProfile = profilePicture || xUsername || bio || tokenAddress || canvasSize || cssSize;

    if (options.json) {
      const output = {
        address: options.address,
        chainId: readOnlyOptions.chainId,
        profilePicture: profilePicture || null,
        xUsername: xUsername || null,
        bio: bio || null,
        tokenAddress: tokenAddress || null,
        canvas: canvasSize
          ? { size: canvasSize, isDataUri: canvasIsDataUri }
          : null,
        css: cssSize ? { size: cssSize } : null,
        hasProfile,
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // Human-readable output
    console.log(chalk.white.bold("\nProfile:\n"));
    console.log(`  ${chalk.cyan("Address:")} ${options.address}`);
    console.log(`  ${chalk.cyan("Chain ID:")} ${readOnlyOptions.chainId}`);
    console.log(
      `  ${chalk.cyan("Profile Picture:")} ${
        profilePicture || chalk.gray("(not set)")
      }`
    );
    console.log(
      `  ${chalk.cyan("X Username:")} ${
        xUsername ? `@${xUsername}` : chalk.gray("(not set)")
      }`
    );
    console.log(
      `  ${chalk.cyan("Bio:")} ${bio || chalk.gray("(not set)")}`
    );
    console.log(
      `  ${chalk.cyan("Token Address:")} ${
        tokenAddress || chalk.gray("(not set)")
      }`
    );
    console.log(
      `  ${chalk.cyan("Canvas:")} ${
        canvasSize
          ? `${canvasSize} bytes${canvasIsDataUri ? " (data URI)" : ""}`
          : chalk.gray("(not set)")
      }`
    );
    console.log(
      `  ${chalk.cyan("Custom CSS:")} ${
        cssSize ? `${cssSize} bytes` : chalk.gray("(not set)")
      }`
    );

    if (!hasProfile) {
      console.log(chalk.yellow("\n  No profile data found for this address."));
    }
    console.log();
  } catch (error) {
    exitWithError(
      `Failed to read profile: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
