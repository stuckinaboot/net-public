import { readContract } from "viem/actions";
import { hexToString } from "viem";
import { PublicClient } from "viem";
import { STORAGE_CONTRACT } from "../constants";
import { CHUNKED_STORAGE_READER_CONTRACT } from "../constants";
import {
  XmlReference,
  resolveOperator,
  getReferenceKey,
  containsXmlReferences,
  parseNetReferences,
} from "../utils/xmlUtils";
import { assembleChunks } from "../utils/chunkUtils";

/**
 * Maximum depth for recursive XML resolution
 */
export const MAX_XML_DEPTH = 3;

/**
 * Number of XML references to fetch concurrently per batch
 */
export const CONCURRENT_XML_FETCHES = 3;

/**
 * Fetch chunks sequentially (legacy function)
 */
export async function fetchChunksSequential(
  references: XmlReference[],
  operatorAddress: string,
  client: PublicClient
): Promise<string[]> {
  console.log("Fetching chunks sequentially:", references);

  const chunks: string[] = [];

  for (let i = 0; i < references.length; i++) {
    const reference = references[i];
    const hash = reference.hash;
    const operator = resolveOperator(reference, operatorAddress);
    try {
      console.log(
        `Fetching chunk ${i + 1}/${references.length}: ${hash} from operator ${operator}`
      );
      const result = await readContract(client, {
        address: STORAGE_CONTRACT.address,
        abi: STORAGE_CONTRACT.abi,
        functionName: "get",
        args: [hash, operator],
      });
      const chunkData = hexToString((result as any)[1] || "");
      console.log(`Chunk ${i + 1} data length: ${chunkData.length}`);
      chunks.push(chunkData);
    } catch (error) {
      console.error(
        `Failed to fetch chunk ${i + 1} (${hash}) from operator ${operator}:`,
        error
      );
      chunks.push("");
    }
  }

  console.log("Sequential chunk results:", chunks);
  return chunks;
}

/**
 * Assemble XML data by replacing references with chunk content
 */
export function assembleXmlData(
  metadata: string,
  chunks: string[],
  references: XmlReference[]
): string {
  console.log("Assembling data:", { metadata, chunks, references });

  let result = metadata;

  references.forEach((ref, index) => {
    const chunkData = chunks[index];
    if (chunkData) {
      // Build XML tag with all attributes in order: k, v, i, o, s
      const indexAttr = ref.index !== undefined ? ` i="${ref.index}"` : "";
      const operatorAttr = ref.operator ? ` o="${ref.operator}"` : "";
      const sourceAttr = ref.source ? ` s="${ref.source}"` : "";

      const xmlTag = `<net k="${ref.hash}" v="${ref.version}"${indexAttr}${operatorAttr}${sourceAttr} />`;
      result = result.replace(xmlTag, chunkData);
    }
  });

  console.log("Assembled data length:", result.length);
  return result;
}

/**
 * Fetch chunk data from direct Storage.sol (no decompression)
 */
async function fetchFromDirectStorage(
  reference: XmlReference,
  operator: string,
  client: PublicClient
): Promise<string> {
  const functionName =
    reference.index !== undefined ? "getValueAtIndex" : "get";
  const args =
    reference.index !== undefined
      ? [reference.hash, operator, reference.index]
      : [reference.hash, operator];

  const result = await readContract(client, {
    address: STORAGE_CONTRACT.address,
    abi: STORAGE_CONTRACT.abi,
    functionName,
    args,
  });

  const content = hexToString((result as any)[1] || "");
  return content;
}

/**
 * Fetch chunk data from ChunkedStorage (with decompression)
 */
async function fetchFromChunkedStorage(
  reference: XmlReference,
  operator: string,
  client: PublicClient
): Promise<string> {
  const contract = CHUNKED_STORAGE_READER_CONTRACT;

  const functionName =
    reference.index !== undefined ? "getMetadataAtIndex" : "getMetadata";
  const chunksFunctionName =
    reference.index !== undefined ? "getChunksAtIndex" : "getChunks";

  const metadataArgs =
    reference.index !== undefined
      ? [reference.hash, operator, reference.index]
      : [reference.hash, operator];

  const metadata = await readContract(client, {
    abi: contract.abi,
    address: contract.address,
    functionName,
    args: metadataArgs,
  });

  const chunkCount = (metadata as [number, string])[0];

  if (chunkCount === 0) return "";

  const chunksArgs =
    reference.index !== undefined
      ? [reference.hash, operator, 0, chunkCount, reference.index]
      : [reference.hash, operator, 0, chunkCount];

  const chunks = (await readContract(client, {
    abi: contract.abi,
    address: contract.address,
    functionName: chunksFunctionName,
    args: chunksArgs,
  })) as string[];

  const assembledResult = assembleChunks(chunks);
  // assembleChunks returns plain string (converted via hexToString internally)
  const content = assembledResult || "";

  return content;
}

/**
 * Fetch a single chunk (used by recursive resolver)
 * Handles both Storage.sol and ChunkedStorage based on source attribute
 */
async function fetchSingleChunk(
  reference: XmlReference,
  defaultOperator: string,
  inheritedOperator: string | undefined,
  client: PublicClient
): Promise<string> {
  // Use inherited operator if reference doesn't specify one
  const effectiveOperator =
    reference.operator || inheritedOperator || defaultOperator;

  if (reference.source === "d") {
    return await fetchFromDirectStorage(reference, effectiveOperator, client);
  } else {
    return await fetchFromChunkedStorage(reference, effectiveOperator, client);
  }
}

/**
 * Fetch chunks with source type support
 * Reads from Storage.sol if source="d", otherwise from ChunkedStorage
 */
export async function fetchChunksWithSourceSupport(
  references: XmlReference[],
  operatorAddress: string,
  client: PublicClient
): Promise<string[]> {
  const chunks: string[] = [];

  for (let i = 0; i < references.length; i++) {
    const reference = references[i];

    try {
      let chunkData: string;

      if (reference.source === "d") {
        // Read from regular Storage.sol
        chunkData = await fetchFromDirectStorage(
          reference,
          resolveOperator(reference, operatorAddress),
          client
        );
      } else {
        // Read from ChunkedStorage (default behavior)
        chunkData = await fetchFromChunkedStorage(
          reference,
          resolveOperator(reference, operatorAddress),
          client
        );
      }

      chunks.push(chunkData);
    } catch (error) {
      console.error(`Failed to fetch chunk ${i + 1}:`, error);
      chunks.push("");
    }
  }

  return chunks;
}

/**
 * Fetch XML chunks from ChunkedStorage backend
 * Each XML chunk is stored as ChunkedStorage data (20KB chunks + compression)
 */
export async function fetchXmlChunksFromChunkedStorage(
  references: XmlReference[],
  operatorAddress: string,
  client: PublicClient
): Promise<string[]> {
  console.log("[ChunkedStorage->XML] Fetching XML chunks:", {
    referenceCount: references.length,
    references: references,
  });

  const xmlChunks: string[] = [];

  // Fetch each XML chunk from ChunkedStorageReader
  for (let i = 0; i < references.length; i++) {
    const reference = references[i];
    const chunkedHash = reference.hash;

    try {
      console.log(
        `[ChunkedStorage->XML] Fetching XML chunk ${i + 1}/${references.length}:`,
        {
          chunkedHash,
          operatorAddress,
          historicalIndex: reference.index,
        }
      );

      // Always use ChunkedStorageReader - it has all ChunkedStorage functions plus historical ones
      const contract = CHUNKED_STORAGE_READER_CONTRACT;
      const functionName =
        reference.index !== undefined ? "getMetadataAtIndex" : "getMetadata";
      const chunksFunctionName =
        reference.index !== undefined ? "getChunksAtIndex" : "getChunks";

      console.log(
        `[ChunkedStorage->XML] Using ChunkedStorageReader for XML chunk ${i + 1}:`,
        {
          chunkedHash,
          operatorAddress,
          historicalIndex: reference.index,
          contractAddress: contract.address,
          functionName,
          chunksFunctionName,
        }
      );

      // 1. Get metadata (latest or historical)
      const metadata = await readContract(client, {
        abi: contract.abi,
        address: contract.address,
        functionName,
        args:
          reference.index !== undefined
            ? [
                chunkedHash,
                resolveOperator(reference, operatorAddress),
                reference.index,
              ]
            : [chunkedHash, resolveOperator(reference, operatorAddress)],
      });

      const chunkCount = (metadata as [number, string])[0];

      if (chunkCount === 0) {
        xmlChunks.push("");
        continue;
      }

      // 2. Get chunks (latest or historical)
      const chunks = (await readContract(client, {
        abi: contract.abi,
        address: contract.address,
        functionName: chunksFunctionName,
        args:
          reference.index !== undefined
            ? [
                chunkedHash,
                resolveOperator(reference, operatorAddress),
                0,
                chunkCount,
                reference.index,
              ]
            : [
                chunkedHash,
                resolveOperator(reference, operatorAddress),
                0,
                chunkCount,
              ],
      })) as string[];

      // 3. Use existing assembly logic (unchanged)
      const assembledResult = assembleChunks(chunks);

      if (assembledResult === undefined) {
        xmlChunks.push("");
      } else {
        // assembleChunks returns plain string (converted via hexToString internally)
        xmlChunks.push(assembledResult);
      }
    } catch (error) {
      console.error(
        `[ChunkedStorage->XML] Failed to fetch XML chunk ${i + 1} (${chunkedHash}):`,
        error
      );
      xmlChunks.push(""); // Push empty for failed chunks
    }
  }

  console.log("[ChunkedStorage->XML] Completed fetching all XML chunks:", {
    totalChunks: xmlChunks.length,
    successfulChunks: xmlChunks.filter((chunk) => chunk.length > 0).length,
    failedChunks: xmlChunks.filter((chunk) => chunk.length === 0).length,
  });

  return xmlChunks;
}

/**
 * Recursively resolve XML references up to specified depth
 * Handles circular reference detection and parallel fetching per layer
 */
export async function resolveXmlRecursive(
  content: string,
  defaultOperator: string,
  client: PublicClient,
  maxDepth: number,
  visited: Set<string> = new Set(),
  inheritedOperator?: string
): Promise<string> {
  // Base case 1: Depth limit reached
  if (maxDepth <= 0) {
    return content;
  }

  // Base case 2: No XML references in content
  if (!containsXmlReferences(content)) {
    return content;
  }

  // Parse references at current layer
  const references = parseNetReferences(content);

  if (references.length === 0) {
    return content;
  }

  // Fetch and recursively resolve chunks in batches to balance speed and rate limits
  const resolvedChunks: string[] = [];
  for (
    let batchStart = 0;
    batchStart < references.length;
    batchStart += CONCURRENT_XML_FETCHES
  ) {
    // Calculate batch boundaries
    const batchEnd = Math.min(
      batchStart + CONCURRENT_XML_FETCHES,
      references.length
    );
    const batch = references.slice(batchStart, batchEnd);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (ref, batchIndex) => {
        const index = batchStart + batchIndex; // Global index for logging

        // Determine effective operator for this reference
        const effectiveOperator =
          ref.operator || inheritedOperator || defaultOperator;

        // Generate unique key for this reference using effective operator
        const refKey = getReferenceKey(
          { ...ref, operator: effectiveOperator },
          defaultOperator
        );

        // Check for circular reference
        if (visited.has(refKey)) {
          console.warn(
            `[resolveXmlRecursive] Circular reference detected: ${refKey}`
          );
          return `[Circular: ${refKey}]`;
        }

        // Add to visited set for this branch
        const newVisited = new Set(visited);
        newVisited.add(refKey);

        try {
          // Fetch the chunk
          const chunkContent = await fetchSingleChunk(
            ref,
            defaultOperator,
            inheritedOperator,
            client
          );

          // Recursively resolve the chunk's content, passing this reference's operator as inherited
          const resolvedContent = await resolveXmlRecursive(
            chunkContent,
            defaultOperator,
            client,
            maxDepth - 1,
            newVisited,
            effectiveOperator // Pass the effective operator to children
          );

          return resolvedContent;
        } catch (error) {
          console.error(
            `[resolveXmlRecursive] Failed to fetch/resolve chunk ${index}:`,
            error
          );
          return ""; // Return empty string on error
        }
      })
    );

    // Append batch results in order
    resolvedChunks.push(...batchResults);
  }

  // Assemble content with resolved chunks
  const assembled = assembleXmlData(content, resolvedChunks, references);

  return assembled;
}

