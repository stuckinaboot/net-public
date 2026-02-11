import type { NetMessage } from "@net-protocol/feeds";

/**
 * Create a post ID from a message
 * Format: {sender}:{timestamp}
 */
export function createPostId(post: NetMessage): string {
  return `${post.sender}:${post.timestamp}`;
}

/**
 * Parse a post ID string into sender and timestamp
 * Format: {sender}:{timestamp}
 * @throws Error if the format is invalid
 */
export function parsePostId(postId: string): {
  sender: `0x${string}`;
  timestamp: bigint;
} {
  const parts = postId.split(":");
  if (parts.length !== 2) {
    throw new Error(
      `Invalid post ID format. Expected {sender}:{timestamp}, got: ${postId}`
    );
  }

  const [sender, timestampStr] = parts;

  if (!sender.startsWith("0x") || sender.length !== 42) {
    throw new Error(`Invalid sender address in post ID: ${sender}`);
  }

  const timestamp = BigInt(timestampStr);
  if (timestamp <= 0) {
    throw new Error(`Invalid timestamp in post ID: ${timestampStr}`);
  }

  return {
    sender: sender as `0x${string}`,
    timestamp,
  };
}

/**
 * Find a post in a list by its ID components
 */
export function findPostByParsedId(
  posts: NetMessage[],
  parsedId: { sender: `0x${string}`; timestamp: bigint }
): NetMessage | undefined {
  return posts.find(
    (p) =>
      p.sender.toLowerCase() === parsedId.sender.toLowerCase() &&
      p.timestamp === parsedId.timestamp
  );
}
