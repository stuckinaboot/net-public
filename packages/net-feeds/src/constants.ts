// Feed topic prefix convention
export const FEED_TOPIC_PREFIX = "feed-" as const;

// Comment topic suffix convention
export const COMMENT_TOPIC_SUFFIX = ":comments:" as const;

// Maximum nesting depth for comments (top comment → reply → reply-to-reply)
// Replies to 3rd-level comments attach as siblings to the 3rd level rather than indenting further
export const MAX_COMMENT_NESTING_DEPTH = 3 as const;

// Note: NULL_ADDRESS is imported directly from @net-protocol/core in files that need it
// It is not exported from this package's public API

