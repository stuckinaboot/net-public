import { Command } from "commander";
import { executeProfileGet } from "./get";
import { executeProfileSetPicture } from "./set-picture";
import { executeProfileSetUsername } from "./set-username";
import { executeProfileSetBio } from "./set-bio";
import { executeProfileSetCanvas } from "./set-canvas";
import { executeProfileGetCanvas } from "./get-canvas";

/**
 * Register the profile command with the commander program
 */
export function registerProfileCommand(program: Command): void {
  // Command group
  const profileCommand = program
    .command("profile")
    .description("User profile operations");

  // Get subcommand (read-only)
  const getCommand = new Command("get")
    .description("Get profile data for an address")
    .requiredOption("--address <address>", "Wallet address to get profile for")
    .option(
      "--chain-id <id>",
      "Chain ID. Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option(
      "--rpc-url <url>",
      "Custom RPC URL. Can also be set via NET_RPC_URL env var"
    )
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeProfileGet({
        address: options.address,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
      });
    });

  // Set-picture subcommand (write)
  const setPictureCommand = new Command("set-picture")
    .description("Set your profile picture URL")
    .requiredOption("--url <url>", "Image URL for profile picture")
    .option(
      "--private-key <key>",
      "Private key (0x-prefixed hex, 66 characters). Can also be set via NET_PRIVATE_KEY env var"
    )
    .option(
      "--chain-id <id>",
      "Chain ID. Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option(
      "--rpc-url <url>",
      "Custom RPC URL. Can also be set via NET_RPC_URL env var"
    )
    .option(
      "--encode-only",
      "Output transaction data as JSON instead of executing"
    )
    .action(async (options) => {
      await executeProfileSetPicture({
        url: options.url,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  // Set-x-username subcommand (write)
  const setUsernameCommand = new Command("set-x-username")
    .description("Set your X (Twitter) username for your profile")
    .requiredOption(
      "--username <username>",
      "Your X (Twitter) username (with or without @)"
    )
    .option(
      "--private-key <key>",
      "Private key (0x-prefixed hex, 66 characters). Can also be set via NET_PRIVATE_KEY env var"
    )
    .option(
      "--chain-id <id>",
      "Chain ID. Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option(
      "--rpc-url <url>",
      "Custom RPC URL. Can also be set via NET_RPC_URL env var"
    )
    .option(
      "--encode-only",
      "Output transaction data as JSON instead of executing"
    )
    .action(async (options) => {
      await executeProfileSetUsername({
        username: options.username,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  // Set-bio subcommand (write)
  const setBioCommand = new Command("set-bio")
    .description("Set your profile bio")
    .requiredOption("--bio <bio>", "Your profile bio (max 280 characters)")
    .option(
      "--private-key <key>",
      "Private key (0x-prefixed hex, 66 characters). Can also be set via NET_PRIVATE_KEY env var"
    )
    .option(
      "--chain-id <id>",
      "Chain ID. Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option(
      "--rpc-url <url>",
      "Custom RPC URL. Can also be set via NET_RPC_URL env var"
    )
    .option(
      "--encode-only",
      "Output transaction data as JSON instead of executing"
    )
    .action(async (options) => {
      await executeProfileSetBio({
        bio: options.bio,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  // Set-canvas subcommand (write)
  const setCanvasCommand = new Command("set-canvas")
    .description("Set your profile canvas (HTML content)")
    .option("--file <path>", "Path to file containing canvas content")
    .option("--content <html>", "HTML content for canvas (inline)")
    .option(
      "--private-key <key>",
      "Private key (0x-prefixed hex, 66 characters). Can also be set via NET_PRIVATE_KEY env var"
    )
    .option(
      "--chain-id <id>",
      "Chain ID. Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option(
      "--rpc-url <url>",
      "Custom RPC URL. Can also be set via NET_RPC_URL env var"
    )
    .option(
      "--encode-only",
      "Output transaction data as JSON instead of executing"
    )
    .action(async (options) => {
      await executeProfileSetCanvas({
        file: options.file,
        content: options.content,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  // Get-canvas subcommand (read-only)
  const getCanvasCommand = new Command("get-canvas")
    .description("Get profile canvas for an address")
    .requiredOption("--address <address>", "Wallet address to get canvas for")
    .option("--output <path>", "Write canvas content to file instead of stdout")
    .option(
      "--chain-id <id>",
      "Chain ID. Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option(
      "--rpc-url <url>",
      "Custom RPC URL. Can also be set via NET_RPC_URL env var"
    )
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeProfileGetCanvas({
        address: options.address,
        output: options.output,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
      });
    });

  profileCommand.addCommand(getCommand);
  profileCommand.addCommand(setPictureCommand);
  profileCommand.addCommand(setUsernameCommand);
  profileCommand.addCommand(setBioCommand);
  profileCommand.addCommand(setCanvasCommand);
  profileCommand.addCommand(getCanvasCommand);
}
