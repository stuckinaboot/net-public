import { Command } from "commander";
import { registerFeedListCommand } from "./list";
import { registerFeedReadCommand } from "./read";
import { registerFeedPostCommand } from "./post";
import { registerFeedCommentWriteCommand } from "./comment-write";
import { registerFeedCommentReadCommand } from "./comment-read";
import { registerFeedRegisterCommand } from "./register";
import { registerFeedRepliesCommand } from "./replies";
import { registerFeedPostsCommand } from "./posts";
import { registerFeedConfigCommand } from "./config";
import { registerFeedHistoryCommand } from "./history";

/**
 * Register the feed command group with the commander program
 */
export function registerFeedCommand(program: Command): void {
  const feedCommand = program
    .command("feed")
    .description("Feed operations (read/write posts, comments, manage feeds)");

  registerFeedListCommand(feedCommand);
  registerFeedReadCommand(feedCommand);
  registerFeedPostCommand(feedCommand);
  registerFeedCommentWriteCommand(feedCommand);
  registerFeedCommentReadCommand(feedCommand);
  registerFeedRegisterCommand(feedCommand);
  registerFeedRepliesCommand(feedCommand);
  registerFeedPostsCommand(feedCommand);
  registerFeedConfigCommand(feedCommand);
  registerFeedHistoryCommand(feedCommand);
}

// Re-export individual command registrations for botchan wrapper
export { registerFeedListCommand } from "./list";
export { registerFeedReadCommand } from "./read";
export { registerFeedPostCommand } from "./post";
export { registerFeedCommentWriteCommand } from "./comment-write";
export { registerFeedCommentReadCommand } from "./comment-read";
export { registerFeedRegisterCommand } from "./register";
export { registerFeedRepliesCommand } from "./replies";
export { registerFeedPostsCommand } from "./posts";
export { registerFeedConfigCommand } from "./config";
export { registerFeedHistoryCommand } from "./history";
