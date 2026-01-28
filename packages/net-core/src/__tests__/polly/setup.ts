import { Polly, PollyConfig } from "@pollyjs/core";
import FetchAdapter from "@pollyjs/adapter-fetch";
import NodeHttpAdapter from "@pollyjs/adapter-node-http";
import FSPersister from "@pollyjs/persister-fs";
import path from "path";
import { beforeAll, afterAll } from "vitest";

// Track if adapters are already registered to avoid double registration
let adaptersRegistered = false;

function ensureAdaptersRegistered(): void {
  if (!adaptersRegistered) {
    // Register adapters and persister (fetch first for browser-like environments)
    Polly.register(FetchAdapter);
    Polly.register(NodeHttpAdapter);
    Polly.register(FSPersister);
    adaptersRegistered = true;
  }
}

const RECORDINGS_DIR = path.join(__dirname, "recordings");

/**
 * Normalize JSON-RPC request body by removing the 'id' field.
 * This ensures recordings match regardless of what id viem assigns.
 */
function normalizeJsonRpcBody(body: string): string {
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object" && "jsonrpc" in parsed) {
      // Remove the id field for matching purposes
      const { id, ...rest } = parsed;
      return JSON.stringify(rest);
    }
    return body;
  } catch {
    return body;
  }
}

/**
 * Body normalizer for JSON-RPC requests.
 * Returns a normalized body string with the 'id' field removed.
 * This ensures recordings match regardless of what id viem assigns.
 */
function jsonRpcBodyNormalizer(body: string): string {
  return normalizeJsonRpcBody(body);
}

export interface PollyOptions {
  /** Name for this recording (used as folder name) */
  recordingName: string;
  /** Whether to record new requests if no recording exists */
  recordIfMissing?: boolean;
  /** Custom request matching options */
  matchRequestsBy?: PollyConfig["matchRequestsBy"];
}

/**
 * Create a configured Polly instance for recording/replaying external API calls
 */
export function setupPolly(options: PollyOptions): Polly {
  ensureAdaptersRegistered();

  const {
    recordingName,
    recordIfMissing = false,
    matchRequestsBy = {
      headers: {
        exclude: [
          "authorization",
          "x-api-key",
          "user-agent",
          "accept-encoding",
          "connection",
          "host",
        ],
      },
      // Use custom matcher to ignore JSON-RPC 'id' field
      body: jsonRpcBodyNormalizer,
      order: false,
    },
  } = options;

  const polly = new Polly(recordingName, {
    adapters: ["fetch", "node-http"],
    persister: "fs",
    persisterOptions: {
      fs: {
        recordingsDir: RECORDINGS_DIR,
      },
    },
    recordIfMissing,
    matchRequestsBy,
    recordFailedRequests: true,
    logging: false,
  });

  // Passthrough for localhost (local development servers)
  polly.server.any("http://localhost*").passthrough();

  return polly;
}

/**
 * Vitest hook for recording/replaying external API calls.
 * Set POLLY_RECORD=true to record new requests.
 */
export function usePollyRecording(
  recordingName: string,
  options: Partial<Omit<PollyOptions, "recordingName">> = {}
) {
  let polly: Polly;

  // Check if we should record (via env var)
  const shouldRecord = process.env.POLLY_RECORD === "true";

  beforeAll(() => {
    polly = setupPolly({
      recordingName,
      recordIfMissing: shouldRecord,
      ...options,
    });
  });

  afterAll(async () => {
    await polly.stop();
  });

  return () => polly;
}

/**
 * One-off recording helper for manually capturing API responses.
 */
export async function recordOnce(
  recordingName: string,
  fn: () => Promise<void>
): Promise<void> {
  const polly = setupPolly({
    recordingName,
    recordIfMissing: true,
  });

  try {
    await fn();
  } finally {
    await polly.stop();
  }
}

/**
 * Create a Polly instance for use within a single test.
 * Use this when you need to control Polly manually within a test.
 */
export function createPolly(recordingName: string): Polly {
  ensureAdaptersRegistered();

  const shouldRecord = process.env.POLLY_RECORD === "true";

  return new Polly(recordingName, {
    adapters: ["fetch", "node-http"],
    persister: "fs",
    persisterOptions: {
      fs: {
        recordingsDir: RECORDINGS_DIR,
      },
    },
    mode: shouldRecord ? "record" : "replay",
    recordIfMissing: shouldRecord,
    flushRequestsOnStop: true,
    matchRequestsBy: {
      headers: {
        exclude: [
          "user-agent",
          "accept-encoding",
          "connection",
          "host",
        ],
      },
      // Use custom matcher to ignore JSON-RPC 'id' field
      body: jsonRpcBodyNormalizer,
      order: false,
    },
    logging: false,
  });
}
