import { useState, useEffect, useCallback, useRef } from "react";
import {
  FeedClient,
  FeedRegistryClient,
  generatePostHash,
  parseCommentData,
} from "@net-protocol/feeds";
import { NetClient, NULL_ADDRESS } from "@net-protocol/core";
import type { RegisteredFeed, NetMessage } from "@net-protocol/feeds";

/** Comment with depth info for tree display */
export interface CommentWithDepth {
  comment: NetMessage;
  depth: number;
  replyToKey: string | null; // "sender:timestamp" of parent comment, or null for top-level
}

interface FeedDataOptions {
  chainId: number;
  rpcUrl?: string;
}

/**
 * Hook to fetch registered feeds
 */
export function useFeeds(options: FeedDataOptions) {
  const [feeds, setFeeds] = useState<RegisteredFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFeeds = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const client = new FeedRegistryClient({
        chainId: options.chainId,
        overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
      });

      const result = await client.getRegisteredFeeds({ maxFeeds: 100 });
      setFeeds(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [options.chainId, options.rpcUrl]);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  return { feeds, loading, error, refetch: fetchFeeds };
}

interface UsePostsOptions extends FeedDataOptions {
  senderFilter?: string;
}

/**
 * Hook to fetch posts for a feed
 */
export function usePosts(feedName: string | null, options: UsePostsOptions) {
  const [posts, setPosts] = useState<NetMessage[]>([]);
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!feedName) {
      setPosts([]);
      setCommentCounts(new Map());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = new FeedClient({
        chainId: options.chainId,
        overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
      });

      // Check post count first to avoid InvalidRange error on empty feeds
      const postCount = await client.getFeedPostCount(feedName);
      if (postCount === 0) {
        setPosts([]);
        setCommentCounts(new Map());
        setLoading(false);
        return;
      }

      // Fetch more posts if filtering by sender
      const fetchLimit = options.senderFilter ? 200 : 50;
      let result = await client.getFeedPosts({ topic: feedName, maxPosts: fetchLimit });

      // Filter by sender if specified
      if (options.senderFilter) {
        const senderLower = options.senderFilter.toLowerCase();
        result = result.filter(
          (post) => post.sender.toLowerCase() === senderLower
        );
      }

      setPosts(result);

      // Fetch comment counts in batch (single RPC call)
      if (result.length > 0) {
        const batchCounts = await client.getCommentCountBatch(result);
        // Convert from post hash keys to sender:timestamp keys for compatibility
        const counts = new Map<string, number>();
        for (const post of result) {
          const postHash = generatePostHash(post);
          const key = `${post.sender}:${post.timestamp}`;
          counts.set(key, batchCounts.get(postHash) ?? 0);
        }
        setCommentCounts(counts);
      } else {
        setCommentCounts(new Map());
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [feedName, options.chainId, options.rpcUrl, options.senderFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, commentCounts, loading, error, refetch: fetchPosts };
}

/**
 * Build a flat list with depth info from comments by parsing replyTo relationships.
 * Returns comments in tree order (parent followed by children, depth-first).
 */
function buildCommentTree(rawComments: NetMessage[]): CommentWithDepth[] {
  // Parse replyTo for each comment
  const commentMap = new Map<string, { comment: NetMessage; replyToKey: string | null }>();
  const childrenMap = new Map<string, string[]>(); // parent key -> child keys

  for (const comment of rawComments) {
    const key = `${comment.sender}:${comment.timestamp}`;
    let replyToKey: string | null = null;

    // Parse the data field to get replyTo info
    try {
      const commentData = parseCommentData(comment.data as `0x${string}`);
      if (commentData?.replyTo) {
        replyToKey = `${commentData.replyTo.sender}:${commentData.replyTo.timestamp}`;
      }
    } catch {
      // Failed to parse, treat as top-level
    }

    commentMap.set(key, { comment, replyToKey });

    // Build children map
    const parentKey = replyToKey ?? "__root__";
    if (!childrenMap.has(parentKey)) {
      childrenMap.set(parentKey, []);
    }
    childrenMap.get(parentKey)!.push(key);
  }

  // DFS to build flat list in tree order
  const result: CommentWithDepth[] = [];

  function traverse(parentKey: string, depth: number) {
    const children = childrenMap.get(parentKey) ?? [];
    for (const childKey of children) {
      const item = commentMap.get(childKey);
      if (item) {
        result.push({
          comment: item.comment,
          depth,
          replyToKey: item.replyToKey,
        });
        traverse(childKey, depth + 1);
      }
    }
  }

  // Start from root (top-level comments)
  traverse("__root__", 0);

  // Handle orphaned comments (replies to comments not in our set)
  // Add them at the end as top-level
  const addedKeys = new Set(result.map((r) => `${r.comment.sender}:${r.comment.timestamp}`));
  for (const [key, item] of commentMap) {
    if (!addedKeys.has(key)) {
      result.push({
        comment: item.comment,
        depth: 0, // Show as top-level since parent is missing
        replyToKey: item.replyToKey,
      });
    }
  }

  return result;
}

/**
 * Hook to fetch comments for a post
 */
export function useComments(post: NetMessage | null, options: FeedDataOptions) {
  const [comments, setComments] = useState<CommentWithDepth[]>([]);
  const [replyCounts, setReplyCounts] = useState<Map<string, number>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track which post the current data belongs to
  const loadedPostRef = useRef<string | null>(null);
  const currentPostKey = post ? `${post.sender}:${post.timestamp}` : null;

  // Determine if we should show loading state:
  // - If post exists but doesn't match the loaded data, we're in a loading state
  // - Or if explicitly loading
  const isLoading = loading || (currentPostKey !== null && currentPostKey !== loadedPostRef.current);

  // Set loading immediately when post changes to avoid flash
  useEffect(() => {
    if (post) {
      setLoading(true);
      setComments([]);
      setReplyCounts(new Map());
    }
  }, [post]);

  const fetchComments = useCallback(async () => {
    if (!post) {
      setComments([]);
      setReplyCounts(new Map());
      setLoading(false);
      loadedPostRef.current = null;
      return;
    }

    const postKey = `${post.sender}:${post.timestamp}`;
    setLoading(true);
    setError(null);

    try {
      const client = new FeedClient({
        chainId: options.chainId,
        overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
      });

      // Check comment count first to avoid InvalidRange error
      const commentCount = await client.getCommentCount(post);
      if (commentCount === 0) {
        setComments([]);
        setReplyCounts(new Map());
        loadedPostRef.current = postKey;
        setLoading(false);
        return;
      }

      // Fetch all comments (increase limit to get full tree)
      const result = await client.getComments({ post, maxComments: 200 });

      // Build tree structure
      const treeComments = buildCommentTree(result);
      setComments(treeComments);

      // Fetch reply counts for each comment in batch
      if (result.length > 0) {
        const batchCounts = await client.getCommentCountBatch(result);
        // Convert from post hash keys to sender:timestamp keys
        const counts = new Map<string, number>();
        for (const comment of result) {
          const commentHash = generatePostHash(comment);
          const key = `${comment.sender}:${comment.timestamp}`;
          counts.set(key, batchCounts.get(commentHash) ?? 0);
        }
        setReplyCounts(counts);
      } else {
        setReplyCounts(new Map());
      }

      // Mark this post as loaded
      loadedPostRef.current = postKey;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [post, options.chainId, options.rpcUrl]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return { comments, replyCounts, loading: isLoading, error, refetch: fetchComments };
}

/** Profile message with topic (feed name) for display */
export interface ProfileMessage {
  message: NetMessage;
  topic: string;
}

/**
 * Hook to fetch recent activity for an address (profile view)
 */
export function useProfile(address: string | null, options: FeedDataOptions) {
  const [messages, setMessages] = useState<ProfileMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track which address the current data belongs to
  const loadedAddressRef = useRef<string | null>(null);

  // Determine if we should show loading state
  const isLoading = loading || (address !== null && address !== loadedAddressRef.current);

  // Set loading immediately when address changes
  useEffect(() => {
    if (address) {
      setLoading(true);
      setMessages([]);
    }
  }, [address]);

  const fetchProfile = useCallback(async () => {
    if (!address) {
      setMessages([]);
      setLoading(false);
      loadedAddressRef.current = null;
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = new NetClient({
        chainId: options.chainId,
        overrides: options.rpcUrl ? { rpcUrls: [options.rpcUrl] } : undefined,
      });

      // Get message count for this user from feeds (app = NULL_ADDRESS)
      const count = await client.getMessageCount({
        filter: {
          appAddress: NULL_ADDRESS as `0x${string}`,
          maker: address as `0x${string}`,
        },
      });

      if (count === 0) {
        setMessages([]);
        loadedAddressRef.current = address;
        setLoading(false);
        return;
      }

      // Fetch last 50 messages
      const limit = 50;
      const startIndex = count > limit ? count - limit : 0;

      const rawMessages = await client.getMessages({
        filter: {
          appAddress: NULL_ADDRESS as `0x${string}`,
          maker: address as `0x${string}`,
        },
        startIndex,
        endIndex: count,
      });

      // Convert to ProfileMessage with topic
      const profileMessages: ProfileMessage[] = rawMessages.map((msg) => ({
        message: msg,
        topic: msg.topic ?? "unknown",
      }));

      // Sort by most recent first
      profileMessages.sort((a, b) => Number(b.message.timestamp - a.message.timestamp));

      setMessages(profileMessages);
      loadedAddressRef.current = address;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [address, options.chainId, options.rpcUrl]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { messages, loading: isLoading, error, refetch: fetchProfile };
}
