import { createServer, type IncomingMessage, type ServerResponse } from "http";
import type { SubscriptionStore } from "./subscriptions.js";
import type { NetWatcher } from "./watcher.js";
import type { SubscriptionFilter } from "./types.js";

/**
 * Lightweight HTTP management API for webhook subscriptions.
 *
 * ⚠️ No authentication is included — bind to localhost or add your own auth
 * middleware when exposing to the network.
 *
 * Endpoints:
 *   GET  /subscriptions          — List all subscriptions
 *   POST /subscriptions          — Create a subscription
 *   DELETE /subscriptions/:id    — Remove a subscription
 *   POST /subscriptions/:id/pause   — Pause a subscription
 *   POST /subscriptions/:id/resume  — Resume a subscription
 *   GET  /health                 — Health check
 */
export function createManagementServer(params: {
  store: SubscriptionStore;
  watcher: NetWatcher;
  chainId: number;
}): ReturnType<typeof createServer> {
  const { store, watcher, chainId } = params;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const path = url.pathname;

    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // GET /health
      if (path === "/health" && req.method === "GET") {
        json(res, 200, {
          status: "ok",
          watching: watcher.running,
          chainId,
          subscriptions: store.list().length,
        });
        return;
      }

      // GET /subscriptions
      if (path === "/subscriptions" && req.method === "GET") {
        const subs = store.list();
        // Strip secrets from response
        const safe = subs.map(({ secret, ...rest }) => rest);
        json(res, 200, safe);
        return;
      }

      // POST /subscriptions
      if (path === "/subscriptions" && req.method === "POST") {
        const body = await readBody(req);
        const { filter, webhookUrl, secret } = body as {
          filter: SubscriptionFilter;
          webhookUrl: string;
          secret?: string;
        };

        if (!webhookUrl || !filter) {
          json(res, 400, { error: "webhookUrl and filter are required" });
          return;
        }

        try {
          const sub = store.add({ chainId, filter, webhookUrl, secret });
          const { secret: _, ...safe } = sub;
          json(res, 201, safe);
        } catch (err) {
          json(res, 400, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
        return;
      }

      // DELETE /subscriptions/:id
      const deleteMatch = path.match(/^\/subscriptions\/(sub_[a-f0-9]+)$/);
      if (deleteMatch && req.method === "DELETE") {
        const removed = store.remove(deleteMatch[1]);
        if (removed) {
          json(res, 200, { deleted: true });
        } else {
          json(res, 404, { error: "Subscription not found" });
        }
        return;
      }

      // POST /subscriptions/:id/pause
      const pauseMatch = path.match(/^\/subscriptions\/(sub_[a-f0-9]+)\/pause$/);
      if (pauseMatch && req.method === "POST") {
        const sub = store.setActive(pauseMatch[1], false);
        if (sub) {
          const { secret, ...safe } = sub;
          json(res, 200, safe);
        } else {
          json(res, 404, { error: "Subscription not found" });
        }
        return;
      }

      // POST /subscriptions/:id/resume
      const resumeMatch = path.match(/^\/subscriptions\/(sub_[a-f0-9]+)\/resume$/);
      if (resumeMatch && req.method === "POST") {
        const sub = store.setActive(resumeMatch[1], true);
        if (sub) {
          const { secret, ...safe } = sub;
          json(res, 200, safe);
        } else {
          json(res, 404, { error: "Subscription not found" });
        }
        return;
      }

      json(res, 404, { error: "Not found" });
    } catch (err) {
      json(res, 500, {
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });

  return server;
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const MAX_BODY_BYTES = 64 * 1024; // 64 KB

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    req.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}
