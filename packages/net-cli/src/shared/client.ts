import { FeedClient, FeedRegistryClient } from "@net-protocol/feeds";
import { NetClient } from "@net-protocol/core";
import { StorageClient } from "@net-protocol/storage";
import type { ReadOnlyOptions } from "./types";

/**
 * Create a FeedClient from read-only options
 */
export function createFeedClient(options: ReadOnlyOptions): FeedClient {
  return new FeedClient({
    chainId: options.chainId,
    overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
  });
}

/**
 * Create a FeedRegistryClient from read-only options
 */
export function createFeedRegistryClient(
  options: ReadOnlyOptions
): FeedRegistryClient {
  return new FeedRegistryClient({
    chainId: options.chainId,
    overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
  });
}

/**
 * Create a NetClient from read-only options
 */
export function createNetClient(options: ReadOnlyOptions): NetClient {
  return new NetClient({
    chainId: options.chainId,
    overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
  });
}

/**
 * Create a StorageClient from read-only options
 */
export function createStorageClient(options: ReadOnlyOptions): StorageClient {
  return new StorageClient({
    chainId: options.chainId,
    overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
  });
}
