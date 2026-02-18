import { Command } from "commander";
import { executeProfileGet } from "./get";
import { executeProfileSetPicture } from "./set-picture";
import { executeProfileSetUsername } from "./set-username";
import { executeProfileSetBio } from "./set-bio";
import { executeProfileSetDisplayName } from "./set-display-name";
import { executeProfileSetTokenAddress } from "./set-token-address";
import { executeProfileSetCanvas } from "./set-canvas";
import { executeProfileGetCanvas } from "./get-canvas";
import { executeProfileSetCSS } from "./set-css";
import { executeProfileGetCSS } from "./get-css";
import { executeProfileCSSPrompt } from "./css-prompt";

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
    .option(
      "--address <address>",
      "Wallet address to preserve existing metadata for (used with --encode-only)"
    )
    .action(async (options) => {
      await executeProfileSetUsername({
        username: options.username,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
        address: options.address,
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
    .option(
      "--address <address>",
      "Wallet address to preserve existing metadata for (used with --encode-only)"
    )
    .action(async (options) => {
      await executeProfileSetBio({
        bio: options.bio,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
        address: options.address,
      });
    });

  // Set-display-name subcommand (write)
  const setDisplayNameCommand = new Command("set-display-name")
    .description("Set your profile display name")
    .requiredOption("--name <name>", "Your display name (max 25 characters)")
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
    .option(
      "--address <address>",
      "Wallet address to preserve existing metadata for (used with --encode-only)"
    )
    .action(async (options) => {
      await executeProfileSetDisplayName({
        name: options.name,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
        address: options.address,
      });
    });

  // Set-token-address subcommand (write)
  const setTokenAddressCommand = new Command("set-token-address")
    .description("Set your profile token address (ERC-20 token that represents you)")
    .requiredOption(
      "--token-address <address>",
      "ERC-20 token contract address (0x-prefixed)"
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
    .option(
      "--address <address>",
      "Wallet address to preserve existing metadata for (used with --encode-only)"
    )
    .action(async (options) => {
      await executeProfileSetTokenAddress({
        tokenAddress: options.tokenAddress,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
        address: options.address,
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

  // Set-css subcommand (write)
  const setCSSCommand = new Command("set-css")
    .description("Set your profile custom CSS theme")
    .option("--file <path>", "Path to CSS file")
    .option("--content <css>", "CSS content (inline)")
    .option("--theme <name>", "Use a built-in demo theme (e.g. hotPink, midnightGrunge, ocean)")
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
      await executeProfileSetCSS({
        file: options.file,
        content: options.content,
        theme: options.theme,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  // Get-css subcommand (read-only)
  const getCSSCommand = new Command("get-css")
    .description("Get profile custom CSS for an address")
    .requiredOption("--address <address>", "Wallet address to get CSS for")
    .option("--output <path>", "Write CSS content to file instead of stdout")
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
      await executeProfileGetCSS({
        address: options.address,
        output: options.output,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
      });
    });

  // CSS-prompt subcommand (read-only, no chain interaction)
  const cssPromptCommand = new Command("css-prompt")
    .description("Print the AI prompt for generating profile CSS themes")
    .option("--list-themes", "List available demo themes instead of the prompt")
    .action(async (options) => {
      await executeProfileCSSPrompt({
        listThemes: options.listThemes,
      });
    });

  profileCommand.addCommand(getCommand);
  profileCommand.addCommand(setPictureCommand);
  profileCommand.addCommand(setUsernameCommand);
  profileCommand.addCommand(setBioCommand);
  profileCommand.addCommand(setDisplayNameCommand);
  profileCommand.addCommand(setTokenAddressCommand);
  profileCommand.addCommand(setCanvasCommand);
  profileCommand.addCommand(getCanvasCommand);
  profileCommand.addCommand(setCSSCommand);
  profileCommand.addCommand(getCSSCommand);
  profileCommand.addCommand(cssPromptCommand);
}
