/**
 * Common options shared across all CLI commands
 */
export interface CommonOptions {
  privateKey: `0x${string}`;
  chainId: number;
  rpcUrl?: string;
}

