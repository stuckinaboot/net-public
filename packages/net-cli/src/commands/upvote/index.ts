import { Command } from "commander";
import { registerUpvoteTokenCommand } from "./upvote-token";
import { registerGetUpvotesCommand } from "./get-upvotes";
import { registerUpvoteUserCommand } from "./upvote-user";
import { registerGetUserUpvotesCommand } from "./get-user-upvotes";

export function registerUpvoteCommand(program: Command): void {
  const upvoteCommand = program
    .command("upvote")
    .description("Upvote tokens and users on Net Protocol");

  registerUpvoteTokenCommand(upvoteCommand);
  registerGetUpvotesCommand(upvoteCommand);
  registerUpvoteUserCommand(upvoteCommand);
  registerGetUserUpvotesCommand(upvoteCommand);
}

// Re-exports for botchan
export { registerUpvoteTokenCommand } from "./upvote-token";
export { registerGetUpvotesCommand } from "./get-upvotes";
export { registerUpvoteUserCommand } from "./upvote-user";
export { registerGetUserUpvotesCommand } from "./get-user-upvotes";
