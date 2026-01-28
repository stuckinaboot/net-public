import { Polly, PollyConfig } from "@pollyjs/core";
import FetchAdapter from "@pollyjs/adapter-fetch";
import NodeHttpAdapter from "@pollyjs/adapter-node-http";
import FSPersister from "@pollyjs/persister-fs";
import path from "path";
import { beforeAll, afterAll } from "vitest";

// Register adapters and persister (fetch first for browser-like environments)
Polly.register(FetchAdapter);
Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);

const RECORDINGS_DIR = path.join(__dirname, "recordings");

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
      body: true,
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

  // Let MSW handle internal APIs - only record external APIs
  polly.server.any("*/api/*").passthrough();
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
