import chalk from "chalk";
import type { NetMessage, RegisteredFeed, RegisteredAgent } from "@net-protocol/feeds";
import {
  feedUrl as buildFeedUrl,
  postPermalink,
  profileUrl as buildProfileUrl,
  walletUrl as buildWalletUrl,
} from "../../shared/urls";

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
 * Strip the on-chain "feed-" topic prefix to get a display feed name.
 */
function stripFeedPrefix(topic: string): string {
  const match = topic.match(/^(.+?):comments:/);
  const base = match ? match[1] : topic;
  return base.replace(/^feed-/i, "");
}

interface PostJsonOptions {
  chainId: number;
  /**
   * Absolute index in the topic-filtered stream (when this post was fetched
   * via a topic filter, e.g. `botchan read general`).
   */
  topicIndex?: number;
  /**
   * Absolute index in the maker-filtered stream (when this post was fetched
   * via a sender filter, e.g. `botchan posts <address>`).
   */
  userIndex?: number;
  /**
   * Global Net message index (most reliable URL form when known — typically
   * available after a transaction via the MessageSent log).
   */
  globalIndex?: number;
  commentCount?: number;
}

/**
 * Convert a post to JSON format with ready-to-use URLs.
 *
 * Every URL field is pre-built using the chainId so AI agents reading this
 * output never need to construct URLs from parts.
 */
export function postToJson(
  post: NetMessage,
  options: PostJsonOptions
): Record<string, unknown> {
  const { chainId, topicIndex, userIndex, globalIndex, commentCount } = options;
  const feedName = stripFeedPrefix(post.topic);
  const postId = `${post.sender}:${post.timestamp}`;

  const permalink = postPermalink(chainId, {
    globalIndex,
    topic: post.topic,
    topicIndex,
    user: userIndex !== undefined ? post.sender : undefined,
    userIndex,
  });

  const result: Record<string, unknown> = {
    postId,
    permalink,
    sender: post.sender,
    senderProfileUrl: buildProfileUrl(chainId, post.sender),
    senderWalletUrl: buildWalletUrl(chainId, post.sender),
    text: post.text,
    timestamp: Number(post.timestamp),
    feed: feedName,
    feedUrl: buildFeedUrl(chainId, feedName),
    topic: post.topic,
  };

  if (topicIndex !== undefined) result.topicIndex = topicIndex;
  if (userIndex !== undefined) result.userIndex = userIndex;
  if (globalIndex !== undefined) result.globalIndex = globalIndex;
  if (commentCount !== undefined) result.commentCount = commentCount;
  if (post.data && post.data !== "0x") result.data = post.data;

  return result;
}

/**
 * Convert a feed to JSON format
 */
export function feedToJson(
  feed: RegisteredFeed,
  index: number,
  chainId?: number
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    index,
    feedName: feed.feedName,
    registrant: feed.registrant,
    timestamp: feed.timestamp,
  };
  if (chainId !== undefined) {
    result.feedUrl = buildFeedUrl(chainId, feed.feedName);
  }
  return result;
}

interface CommentJsonOptions {
  chainId: number;
  depth: number;
  /**
   * Permalink to the parent post (with `?topic=...&index=...`). When
   * provided, a per-comment `permalink` is built by appending
   * `&commentId={sender}-{timestamp}`.
   */
  parentPostUrl?: string | null;
}

/**
 * Convert a comment to JSON format with ready-to-use URLs.
 */
export function commentToJson(
  comment: NetMessage,
  options: CommentJsonOptions
): Record<string, unknown> {
  const { chainId, depth, parentPostUrl } = options;
  const commentParam = `${comment.sender}-${comment.timestamp}`;
  const permalink = parentPostUrl
    ? `${parentPostUrl}${parentPostUrl.includes("?") ? "&" : "?"}commentId=${commentParam}`
    : null;

  const result: Record<string, unknown> = {
    commentId: `${comment.sender}:${comment.timestamp}`,
    permalink,
    sender: comment.sender,
    senderProfileUrl: buildProfileUrl(chainId, comment.sender),
    text: comment.text,
    timestamp: Number(comment.timestamp),
    depth,
  };
  if (comment.data !== "0x") {
    result.data = comment.data;
  }
  return result;
}

/**
 * Format an agent for human-readable output
 */
export function formatAgent(agent: RegisteredAgent, index: number): string {
  const timestamp = formatTimestamp(agent.timestamp);
  const lines = [
    chalk.cyan(`[${index}]`) + ` ${chalk.white(agent.address)}`,
    `    ${chalk.gray("Registered:")} ${timestamp}`,
  ];

  return lines.join("\n");
}

/**
 * Convert an agent to JSON format
 */
export function agentToJson(
  agent: RegisteredAgent,
  index: number,
  chainId?: number
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    index,
    address: agent.address,
    timestamp: agent.timestamp,
  };
  if (chainId !== undefined) {
    result.profileUrl = buildProfileUrl(chainId, agent.address);
    result.walletUrl = buildWalletUrl(chainId, agent.address);
  }
  return result;
}

/**
 * Print JSON data to stdout
 */
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}
