import { Command } from "commander";
import { registerChatReadCommand } from "./read";
import { registerChatSendCommand } from "./send";

/**
 * Register the chat command group with the commander program
 */
export function registerChatCommand(program: Command): void {
  const chatCommand = program
    .command("chat")
    .description("Group chat operations — use 'chat send' and 'chat read' (NOT 'post'/'read', which are for feeds)");

  registerChatReadCommand(chatCommand);
  registerChatSendCommand(chatCommand);
}

// Re-export individual command registrations for botchan wrapper
export { registerChatReadCommand } from "./read";
export { registerChatSendCommand } from "./send";
