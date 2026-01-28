/**
 * Type declarations for @pollyjs packages
 */

declare module "@pollyjs/core" {
  export interface PollyRequest {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  }

  // Polly matcher can be:
  // - boolean: true to include in matching, false to exclude
  // - function: receives the value and returns a transformed value for matching
  export type MatcherFunction = (value: string) => string;

  export interface PollyConfig {
    adapters?: string[];
    persister?: string;
    persisterOptions?: {
      fs?: {
        recordingsDir?: string;
      };
    };
    recordIfMissing?: boolean;
    recordFailedRequests?: boolean;
    flushRequestsOnStop?: boolean;
    logging?: boolean;
    mode?: "record" | "replay" | "passthrough";
    matchRequestsBy?: {
      headers?: boolean | { exclude?: string[] };
      body?: boolean | MatcherFunction;
      order?: boolean;
      method?: boolean;
      url?: boolean | { protocol?: boolean; username?: boolean; password?: boolean; hostname?: boolean; port?: boolean; pathname?: boolean; query?: boolean; hash?: boolean };
    };
  }

  export class Polly {
    constructor(recordingName: string, config?: PollyConfig);
    static register(adapter: unknown): void;
    server: {
      any(url: string): { passthrough(): void };
      get(url: string): { passthrough(): void };
      post(url: string): { passthrough(): void };
      put(url: string): { passthrough(): void };
      delete(url: string): { passthrough(): void };
      patch(url: string): { passthrough(): void };
    };
    stop(): Promise<void>;
    flush(): Promise<void>;
    pause(): void;
    play(): void;
  }
}

declare module "@pollyjs/adapter-fetch" {
  const FetchAdapter: unknown;
  export default FetchAdapter;
}

declare module "@pollyjs/adapter-node-http" {
  const NodeHttpAdapter: unknown;
  export default NodeHttpAdapter;
}

declare module "@pollyjs/persister-fs" {
  const FSPersister: unknown;
  export default FSPersister;
}
