#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import { registerStorageCommand } from "../commands/storage";

const program = new Command();

program
  .name("net-cli")
  .description("CLI tool for Net Protocol")
  .version("1.0.0");

// Register commands
registerStorageCommand(program);

program.parse();
