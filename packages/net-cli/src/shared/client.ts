import { NetClient } from "@net-protocol/core";
import type { ReadOnlyOptions } from "./types";

/**
 * Create a NetClient from read-only options
 */
export function createNetClient(options: ReadOnlyOptions): NetClient {
  return new NetClient({
    chainId: options.chainId,
    overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
  });
}
