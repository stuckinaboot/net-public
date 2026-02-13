import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import chalk from "chalk";

const CACHE_DIR = join(homedir(), ".netp");
const CACHE_FILE = join(CACHE_DIR, "update-check.json");
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const FETCH_TIMEOUT_MS = 5000;

interface UpdateCache {
  lastCheck: number;
  latestVersion: string | null;
}

export interface UpdateInfo {
  latest: string;
}

function isNewerVersion(latest: string, current: string): boolean {
  const l = latest.split(".").map(Number);
  const c = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

function readCache(): UpdateCache | null {
  try {
    if (existsSync(CACHE_FILE)) {
      return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    }
  } catch {
    // Ignore corrupt cache
  }
  return null;
}

function writeCache(cache: UpdateCache): void {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
    writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch {
    // Ignore cache write failures
  }
}

async function fetchLatestVersion(pkg: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(pkg).replace("%40", "@")}/latest`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = (await res.json()) as { version: string };
      return data.version;
    }
  } catch {
    // Network errors are expected (offline, timeout, etc.)
  }
  return null;
}

/**
 * Check npm registry for a newer version of @net-protocol/cli.
 * Uses a file-based cache to avoid hitting the registry on every invocation.
 * Returns UpdateInfo if an update is available, null otherwise.
 */
export async function getUpdateInfo(
  currentVersion: string
): Promise<UpdateInfo | null> {
  const cache = readCache();

  // Use cached result if fresh
  if (cache && Date.now() - cache.lastCheck < CHECK_INTERVAL_MS) {
    if (
      cache.latestVersion &&
      isNewerVersion(cache.latestVersion, currentVersion)
    ) {
      return { latest: cache.latestVersion };
    }
    return null;
  }

  const latest = await fetchLatestVersion("@net-protocol/cli");

  writeCache({
    lastCheck: Date.now(),
    latestVersion: latest,
  });

  if (latest && isNewerVersion(latest, currentVersion)) {
    return { latest };
  }

  return null;
}

/**
 * Print an update notification banner to stderr.
 * Uses stderr to avoid interfering with JSON output or piped commands.
 */
export function printUpdateBanner(current: string, latest: string): void {
  console.error("");
  console.error(
    chalk.yellow(
      `  Update available: ${chalk.gray(current)} → ${chalk.green(latest)}`
    )
  );
  console.error(
    chalk.yellow(
      `  Run ${chalk.cyan("npm install -g @net-protocol/cli@latest")} to update`
    )
  );
  console.error("");
}
