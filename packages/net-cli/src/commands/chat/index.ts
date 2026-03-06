import { Command } from "commander";
import { registerChatReadCommand } from "./read";
import { registerChatSendCommand } from "./send";

/**
 * Register the chat command group with the commander program
 */
export function registerChatCommand(program: Command): void {
  const chatCommand = program
    .command("chat")
    .description("Group chat operations (read/send messages)");

  registerChatReadCommand(chatCommand);
  registerChatSendCommand(chatCommand);
}

// Re-export individual command registrations for botchan wrapper
export { registerChatReadCommand } from "./read";
export { registerChatSendCommand } from "./send";
