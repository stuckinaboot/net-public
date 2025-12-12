import { keccak256HashString } from "./keyUtils";

/**
 * XML reference type for chunk metadata
 */
export interface XmlReference {
  hash: string;
  version: string;
  index?: number;
  operator?: string;
  source?: string; // 'd' for direct Storage.sol, undefined for ChunkedStorage
}

/**
 * Parse XML metadata to extract chunk references
 * Format: <net k="hashValue" v="0.0.1" o="0xoperator" s="d" />
 */
export function parseNetReferences(metadata: string): XmlReference[] {
  const regex =
    /<net\s+k="([^"]+)"\s+v="([^"]+)"(?:\s+i="([^"]+)")?(?:\s+o="([^"]+)")?(?:\s+s="([^"]+)")?\s*\/>/g;
  const references: XmlReference[] = [];
  let match;

  while ((match = regex.exec(metadata)) !== null) {
    references.push({
      hash: match[1],
      version: match[2],
      index: match[3] ? parseInt(match[3], 10) : undefined,
      operator: match[4]?.toLowerCase(),
      source: match[5],
    });
  }

  return references;
}

/**
 * Check if a string contains XML references
 */
export function containsXmlReferences(data: string): boolean {
  return /<net\s+k="[^"]+"\s+v="[^"]+"(?:\s+i="[^"]+")?(?:\s+o="[^"]+")?(?:\s+s="[^"]+")?\s*\/>/.test(
    data
  );
}

/**
 * Detect storage type based on content
 */
export function detectStorageType(metadata: string): "xml" | "regular" {
  return containsXmlReferences(metadata) ? "xml" : "regular";
}

/**
 * Resolve operator address for a reference with fallback to default
 */
export function resolveOperator(
  reference: XmlReference,
  defaultOperator: string
): string {
  return reference.operator?.toLowerCase() || defaultOperator.toLowerCase();
}

/**
 * Generate unique key for a reference to detect circular dependencies
 */
export function getReferenceKey(
  reference: XmlReference,
  defaultOperator: string
): string {
  const operator = resolveOperator(reference, defaultOperator);
  const index = reference.index !== undefined ? `-${reference.index}` : "";
  return `${reference.hash}-${operator}${index}`;
}

