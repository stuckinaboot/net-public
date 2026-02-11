import chalk from "chalk";
import type { NetMessage, RegisteredFeed } from "@net-protocol/feeds";

/**
 * Truncate an address for display
 */
export function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a timestamp as ISO date string
 */
export function formatTimestamp(timestamp: number | bigint): string {
  return new Date(Number(timestamp) * 1000).toISOString().replace("T", " ").slice(0, 19);
}

/** Parse topic to get clean feed name and whether it's a comment */
function parseTopic(topic: string): { feedName: string; isComment: boolean } {
  const commentMatch = topic.match(/^(.+?):comments:/);
  if (commentMatch) {
    return { feedName: commentMatch[1], isComment: true };
  }
  return { feedName: topic, isComment: false };
}

interface FormatPostOptions {
  commentCount?: number;
  showTopic?: boolean;
}

/**
 * Format a post for human-readable output
 */
export function formatPost(
  post: NetMessage,
  index: number,
  options: FormatPostOptions = {}
): string {
  const { commentCount, showTopic } = options;
  const timestamp = formatTimestamp(post.timestamp);
  const lines = [
    chalk.cyan(`[${index}]`) + ` ${chalk.gray(timestamp)}`,
    `  ${chalk.white("Sender:")} ${post.sender}`,
    `  ${chalk.white("Text:")} ${post.text}`,
  ];

  if (showTopic && post.topic) {
    const { feedName, isComment } = parseTopic(post.topic);
    const prefix = isComment ? "Comment on" : "Feed";
    lines.push(`  ${chalk.white(prefix + ":")} ${chalk.magenta(feedName)}`);
  }

  if (commentCount !== undefined) {
    lines.push(`  ${chalk.white("Comments:")} ${commentCount}`);
  }

  if (post.data && post.data !== "0x") {
    lines.push(`  ${chalk.white("Data:")} ${post.data}`);
  }

  return lines.join("\n");
}

/**
 * Format a feed for human-readable output
 */
export function formatFeed(feed: RegisteredFeed, index: number): string {
  const timestamp = formatTimestamp(feed.timestamp);
  const lines = [
    chalk.cyan(`[${index}]`) + ` ${chalk.white(feed.feedName)}`,
    `    ${chalk.gray("Registrant:")} ${feed.registrant}`,
    `    ${chalk.gray("Registered:")} ${timestamp}`,
  ];

  return lines.join("\n");
}

/**
 * Format a comment for human-readable output with indentation
 */
export function formatComment(
  comment: NetMessage,
  depth: number
): string {
  const indent = "  ".repeat(depth + 1);
  const timestamp = formatTimestamp(comment.timestamp);
  const lines = [
    `${indent}${chalk.gray(timestamp)} ${chalk.blue(truncateAddress(comment.sender))}`,
    `${indent}${comment.text}`,
  ];

  return lines.join("\n");
}

/**
 * Convert a post to JSON format
 */
export function postToJson(
  post: NetMessage,
  index: number,
  commentCount?: number
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    index,
    sender: post.sender,
    text: post.text,
    timestamp: Number(post.timestamp),
    topic: post.topic,
  };

  if (commentCount !== undefined) {
    result.commentCount = commentCount;
  }

  if (post.data && post.data !== "0x") {
    result.data = post.data;
  }

  return result;
}

/**
 * Convert a feed to JSON format
 */
export function feedToJson(
  feed: RegisteredFeed,
  index: number
): Record<string, unknown> {
  return {
    index,
    feedName: feed.feedName,
    registrant: feed.registrant,
    timestamp: feed.timestamp,
  };
}

/**
 * Convert a comment to JSON format
 */
export function commentToJson(
  comment: NetMessage,
  depth: number
): Record<string, unknown> {
  return {
    sender: comment.sender,
    text: comment.text,
    timestamp: Number(comment.timestamp),
    depth,
    data: comment.data !== "0x" ? comment.data : undefined,
  };
}

/**
 * Print JSON data to stdout
 */
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}
