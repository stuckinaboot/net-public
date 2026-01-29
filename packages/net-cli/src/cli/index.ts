#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import { createRequire } from "module";
import { registerStorageCommand } from "../commands/storage";
import { registerMessageCommand } from "../commands/message";
import { registerChainsCommand } from "../commands/chains";
import { registerInfoCommand } from "../commands/info";
import { registerTokenCommand } from "../commands/token";
import { registerProfileCommand } from "../commands/profile";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

const program = new Command();

program
  .name("netp")
  .description("CLI tool for Net Protocol")
  .version(version);

// Register commands
registerStorageCommand(program);
registerMessageCommand(program);
registerChainsCommand(program);
registerInfoCommand(program);
registerTokenCommand(program);
registerProfileCommand(program);

program.parse();
