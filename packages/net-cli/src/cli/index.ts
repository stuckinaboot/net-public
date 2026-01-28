#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import { registerStorageCommand } from "../commands/storage";
import { registerMessageCommand } from "../commands/message";
import { registerChainsCommand } from "../commands/chains";
import { registerInfoCommand } from "../commands/info";
import { registerTokenCommand } from "../commands/token";

const program = new Command();

program
  .name("netp")
  .description("CLI tool for Net Protocol")
  .version("0.1.0");

// Register commands
registerStorageCommand(program);
registerMessageCommand(program);
registerChainsCommand(program);
registerInfoCommand(program);
registerTokenCommand(program);

program.parse();
