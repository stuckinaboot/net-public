import { Command } from "commander";
import { registerUpvoteTokenCommand } from "./upvote-token";
import { registerGetUpvotesCommand } from "./get-upvotes";

export function registerUpvoteCommand(program: Command): void {
  const upvoteCommand = program
    .command("upvote")
    .description("Upvote tokens on Net Protocol");

  registerUpvoteTokenCommand(upvoteCommand);
  registerGetUpvotesCommand(upvoteCommand);
}

// Re-exports for botchan
export { registerUpvoteTokenCommand } from "./upvote-token";
export { registerGetUpvotesCommand } from "./get-upvotes";
