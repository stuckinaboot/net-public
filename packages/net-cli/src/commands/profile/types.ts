/**
 * Options for profile get command (read-only)
 */
export interface ProfileGetOptions {
  address: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}

/**
 * Options for profile set-picture command (write)
 */
export interface ProfileSetPictureOptions {
  url: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

/**
 * Options for profile set-username command (write)
 */
export interface ProfileSetUsernameOptions {
  username: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

/**
 * Options for profile set-bio command (write)
 */
export interface ProfileSetBioOptions {
  bio: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

/**
 * Options for profile set-token-address command (write)
 */
export interface ProfileSetTokenAddressOptions {
  tokenAddress: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

/**
 * Options for profile set-canvas command (write)
 */
export interface ProfileSetCanvasOptions {
  file?: string;
  content?: string;
  privateKey?: string;
  chainId?: number;
  rpcUrl?: string;
  encodeOnly?: boolean;
}

/**
 * Options for profile get-canvas command (read-only)
 */
export interface ProfileGetCanvasOptions {
  address: string;
  output?: string;
  chainId?: number;
  rpcUrl?: string;
  json?: boolean;
}
