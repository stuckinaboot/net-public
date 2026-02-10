import { StorageClient } from "@net-protocol/storage";
import {
  PROFILE_METADATA_STORAGE_KEY,
  parseProfileMetadata,
} from "@net-protocol/profiles";

interface ExistingMetadata {
  x_username?: string;
  bio?: string;
  display_name?: string;
  token_address?: string;
}

/**
 * Read existing profile metadata for an address.
 * Returns parsed metadata fields, or empty object if not found.
 */
export async function readExistingMetadata(
  address: string,
  client: StorageClient
): Promise<ExistingMetadata> {
  try {
    const metadataResult = await client.readStorageData({
      key: PROFILE_METADATA_STORAGE_KEY,
      operator: address,
    });
    if (metadataResult.data) {
      const metadata = parseProfileMetadata(metadataResult.data);
      return {
        x_username: metadata?.x_username,
        bio: metadata?.bio,
        display_name: metadata?.display_name,
        token_address: metadata?.token_address,
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    if (errorMessage !== "StoredDataNotFound") {
      throw error;
    }
  }
  return {};
}
