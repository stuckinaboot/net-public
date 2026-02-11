import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface FeedState {
  lastSeenTimestamp: number;
}

export type HistoryEntryType = "post" | "comment" | "register";

export interface HistoryEntry {
  type: HistoryEntryType;
  timestamp: number; // Unix timestamp (local time when action was taken)
  txHash: string;
  chainId: number;
  feed: string;
  sender?: string; // The agent's address (for constructing post IDs)
  text?: string; // Message content (for posts/comments)
  postId?: string; // For comments, the post being replied to
}

interface AppState {
  feeds: Record<string, FeedState>;
  myAddress?: string;
  history?: HistoryEntry[];
}

const MAX_HISTORY_ENTRIES = 100;

// Keep state directory as ~/.botchan/ for backward compat
const STATE_DIR = path.join(os.homedir(), ".botchan");
const STATE_FILE = path.join(STATE_DIR, "state.json");

function ensureStateDir(): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

function loadState(): AppState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // If file is corrupted, start fresh
  }
  return { feeds: {} };
}

function saveState(state: AppState): void {
  ensureStateDir();
  // Atomic write: write to temp file, then rename
  const tempFile = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2));
  fs.renameSync(tempFile, STATE_FILE);
}

/**
 * Get the last seen timestamp for a feed
 */
export function getLastSeenTimestamp(feedName: string): number | null {
  const state = loadState();
  return state.feeds[feedName]?.lastSeenTimestamp ?? null;
}

/**
 * Update the last seen timestamp for a feed
 */
export function setLastSeenTimestamp(feedName: string, timestamp: number): void {
  const state = loadState();
  if (!state.feeds[feedName]) {
    state.feeds[feedName] = { lastSeenTimestamp: timestamp };
  } else {
    state.feeds[feedName].lastSeenTimestamp = timestamp;
  }
  saveState(state);
}

/**
 * Mark a feed as seen up to the latest post timestamp
 */
export function markFeedSeen(feedName: string, posts: { timestamp: bigint }[]): void {
  if (posts.length === 0) return;

  // Find the max timestamp
  const maxTimestamp = posts.reduce(
    (max, post) => (post.timestamp > max ? post.timestamp : max),
    posts[0].timestamp
  );

  setLastSeenTimestamp(feedName, Number(maxTimestamp));
}

/**
 * Get the configured "my address" for filtering own posts
 */
export function getMyAddress(): string | null {
  const state = loadState();
  return state.myAddress ?? null;
}

/**
 * Set the "my address" for filtering own posts
 */
export function setMyAddress(address: string): void {
  const state = loadState();
  state.myAddress = address.toLowerCase();
  saveState(state);
}

/**
 * Clear the "my address"
 */
export function clearMyAddress(): void {
  const state = loadState();
  delete state.myAddress;
  saveState(state);
}

/**
 * Get full state (for debugging)
 */
export function getFullState(): AppState {
  return loadState();
}

/**
 * Reset all state (delete the state file)
 */
export function resetState(): void {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}

/**
 * Get the state file path (for display purposes)
 */
export function getStateFilePath(): string {
  return STATE_FILE;
}

/**
 * Add an entry to the agent's history
 * Keeps only the most recent MAX_HISTORY_ENTRIES entries
 */
export function addHistoryEntry(entry: Omit<HistoryEntry, "timestamp">): void {
  const state = loadState();
  const history = state.history ?? [];

  const newEntry: HistoryEntry = {
    ...entry,
    timestamp: Math.floor(Date.now() / 1000),
  };

  // Add to beginning (most recent first)
  history.unshift(newEntry);

  // Trim to max size
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.length = MAX_HISTORY_ENTRIES;
  }

  state.history = history;
  saveState(state);
}

/**
 * Get the agent's history
 * Returns entries in reverse chronological order (most recent first)
 */
export function getHistory(limit?: number): HistoryEntry[] {
  const state = loadState();
  const history = state.history ?? [];
  return limit ? history.slice(0, limit) : history;
}

/**
 * Get history entries of a specific type
 */
export function getHistoryByType(
  type: HistoryEntryType,
  limit?: number
): HistoryEntry[] {
  const history = getHistory();
  const filtered = history.filter((entry) => entry.type === type);
  return limit ? filtered.slice(0, limit) : filtered;
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  const state = loadState();
  state.history = [];
  saveState(state);
}

/**
 * Get history count
 */
export function getHistoryCount(): number {
  const state = loadState();
  return state.history?.length ?? 0;
}

/**
 * Check if a feed name is a wallet address (i.e., a direct message)
 */
export function isWalletAddress(feed: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(feed);
}

/**
 * Contact info derived from history
 */
export interface Contact {
  address: string;
  lastInteraction: number;
  interactionCount: number;
  firstInteraction: number;
}

/**
 * Get contacts - wallet addresses you've posted to (DMs)
 * Returns contacts sorted by last interaction (most recent first)
 */
export function getContacts(): Contact[] {
  const history = getHistory();
  const contactMap = new Map<string, Contact>();

  // Only look at posts (not comments) to wallet addresses
  for (const entry of history) {
    if (entry.type === "post" && isWalletAddress(entry.feed)) {
      const address = entry.feed.toLowerCase();
      const existing = contactMap.get(address);

      if (existing) {
        existing.interactionCount++;
        // Update first/last interaction times
        if (entry.timestamp > existing.lastInteraction) {
          existing.lastInteraction = entry.timestamp;
        }
        if (entry.timestamp < existing.firstInteraction) {
          existing.firstInteraction = entry.timestamp;
        }
      } else {
        contactMap.set(address, {
          address,
          lastInteraction: entry.timestamp,
          firstInteraction: entry.timestamp,
          interactionCount: 1,
        });
      }
    }
  }

  // Sort by last interaction (most recent first)
  return Array.from(contactMap.values()).sort(
    (a, b) => b.lastInteraction - a.lastInteraction
  );
}

/**
 * Feed activity info derived from history
 */
export interface FeedActivity {
  feed: string;
  postCount: number;
  commentCount: number;
  lastActivity: number;
  firstActivity: number;
}

/**
 * Get feeds the agent has been active in
 * Returns feeds sorted by last activity (most recent first)
 * Excludes wallet addresses (those are contacts, not feeds)
 */
export function getActiveFeeds(): FeedActivity[] {
  const history = getHistory();
  const feedMap = new Map<string, FeedActivity>();

  for (const entry of history) {
    // Skip wallet addresses - those are contacts
    if (isWalletAddress(entry.feed)) continue;
    // Skip feed registrations - only count actual posts/comments
    if (entry.type === "register") continue;

    const feedName = entry.feed.toLowerCase();
    const existing = feedMap.get(feedName);

    if (existing) {
      if (entry.type === "post") existing.postCount++;
      if (entry.type === "comment") existing.commentCount++;
      if (entry.timestamp > existing.lastActivity) {
        existing.lastActivity = entry.timestamp;
      }
      if (entry.timestamp < existing.firstActivity) {
        existing.firstActivity = entry.timestamp;
      }
    } else {
      feedMap.set(feedName, {
        feed: feedName,
        postCount: entry.type === "post" ? 1 : 0,
        commentCount: entry.type === "comment" ? 1 : 0,
        lastActivity: entry.timestamp,
        firstActivity: entry.timestamp,
      });
    }
  }

  // Sort by last activity (most recent first)
  return Array.from(feedMap.values()).sort(
    (a, b) => b.lastActivity - a.lastActivity
  );
}
