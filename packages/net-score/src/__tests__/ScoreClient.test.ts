import { describe, it, expect } from "vitest";
import { ScoreClient } from "../client/ScoreClient";

describe("ScoreClient", () => {
  it("should construct with default options", () => {
    const client = new ScoreClient({ chainId: 8453 });
    expect(client).toBeDefined();
  });

  it("should construct with custom overrides", () => {
    const client = new ScoreClient({
      chainId: 8453,
      overrides: {
        scoreAddress: "0x0000000000000000000000000000000000000001",
        upvoteAppAddress: "0x0000000000000000000000000000000000000002",
        rpcUrls: ["https://rpc.example.com"],
      },
    });
    expect(client).toBeDefined();
  });
});
