import { keccak256HashString } from "@net-protocol/core";

// Constants from ChunkedStorage.sol
const MAX_CHUNKS = 255;
const OPTIMAL_CHUNK_SIZE = 80 * 1000;

/**
 * Split data into chunks of specified size
 */
export function chunkData(
  data: string,
  chunkSize: number = OPTIMAL_CHUNK_SIZE
): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Generate XML metadata string from chunk hashes
 * Format: <net k="hash1" v="0.0.1" i="0" o="0xoperator" /><net k="hash2" v="0.0.1" i="0" o="0xoperator" />
 */
export function generateXmlMetadata(
  chunkHashes: string[],
  historicalIndex: number,
  operatorAddress: string
): string {
  return chunkHashes
    .map((hash) => {
      const operator = operatorAddress.toLowerCase();
      return `<net k="${hash}" v="0.0.1" i="${historicalIndex}" o="${operator}" />`;
    })
    .join("");
}

/**
 * Generate XML metadata string from chunk hashes with source support
 * Format: <net k="hash1" v="0.0.1" i="0" o="0xoperator" s="d" /><net k="hash2" v="0.0.1" i="0" o="0xoperator" />
 */
export function generateXmlMetadataWithSource(
  chunkHashes: string[],
  historicalIndex: number,
  operatorAddress: string,
  source?: string
): string {
  return chunkHashes
    .map((hash) => {
      const operator = operatorAddress.toLowerCase();
      const sourceAttr = source ? ` s="${source}"` : "";
      return `<net k="${hash}" v="0.0.1" i="${historicalIndex}" o="${operator}"${sourceAttr} />`;
    })
    .join("");
}

/**
 * Validate data size against constraints
 */
export function validateDataSize(chunks: string[]): {
  valid: boolean;
  error?: string;
} {
  if (chunks.length === 0) {
    return { valid: false, error: "No chunks generated" };
  }

  if (chunks.length > MAX_CHUNKS) {
    return {
      valid: false,
      error: `Too many chunks: ${chunks.length} exceeds maximum of ${MAX_CHUNKS}`,
    };
  }

  return { valid: true };
}

/**
 * Compute top-level hash from chunk hashes
 */
export function computeTopLevelHash(chunkHashes: string[]): string {
  return keccak256HashString(chunkHashes.join(""));
}

/**
 * Complete chunking and hash generation process
 */
export function processDataForStorage(
  data: string,
  operatorAddress: string,
  storageKey?: string
): {
  chunks: string[];
  chunkHashes: string[];
  xmlMetadata: string;
  topLevelHash: string;
  valid: boolean;
  error?: string;
} {
  // 1. Chunk the data
  const chunks = chunkData(data);

  // 2. Validate size
  const validation = validateDataSize(chunks);
  if (!validation.valid) {
    return {
      chunks: [],
      chunkHashes: [],
      xmlMetadata: "",
      topLevelHash: "",
      valid: false,
      error: validation.error,
    };
  }

  // 3. Generate chunk hashes
  const chunkHashes = chunks.map((chunk) => keccak256HashString(chunk));

  // 4. Generate XML metadata
  const xmlMetadata = generateXmlMetadata(chunkHashes, 0, operatorAddress);

  // 5. Use provided storage key or compute top-level hash
  const topLevelHash = storageKey || computeTopLevelHash(chunkHashes);

  return {
    chunks,
    chunkHashes,
    xmlMetadata,
    topLevelHash,
    valid: true,
  };
}

