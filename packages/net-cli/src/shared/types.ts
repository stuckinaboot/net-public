/**
 * Common options shared across all CLI commands
 */
export interface CommonOptions {
  privateKey: `0x${string}`;
  chainId: number;
  rpcUrl?: string;
}

/**
 * Read-only options for commands that don't need a private key
 */
export interface ReadOnlyOptions {
  chainId: number;
  rpcUrl?: string;
}

/**
 * Encoded transaction data for --encode-only mode
 */
export interface EncodedTransaction {
  to: `0x${string}`;
  data: `0x${string}`;
  chainId: number;
  value: string;
}

