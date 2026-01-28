import { Command } from "commander";
import { executeTokenDeploy } from "./deploy";
import { executeTokenInfo } from "./info";

/**
 * Register the token command with the commander program
 */
export function registerTokenCommand(program: Command): void {
  const tokenCommand = program
    .command("token")
    .description("Token operations (Netr/Banger)");

  // Deploy subcommand
  const deployCommand = new Command("deploy")
    .description("Deploy a new Netr token")
    .requiredOption("--name <name>", "Token name")
    .requiredOption("--symbol <symbol>", "Token symbol")
    .requiredOption("--image <url>", "Token image URL")
    .option("--animation <url>", "Token animation URL")
    .option("--fid <number>", "Farcaster ID")
    .option(
      "--private-key <key>",
      "Private key (0x-prefixed hex). Can also be set via NET_PRIVATE_KEY env var"
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
    .option("--mint-price <wei>", "Mint price in wei for NFT drop")
    .option("--mint-end-timestamp <timestamp>", "Unix timestamp when minting ends")
    .option("--max-mint-supply <amount>", "Maximum mint supply for NFT drop")
    .option("--metadata-address <address>", "Dynamic metadata contract address")
    .option("--extra-string-data <data>", "Extra string data to store with token")
    .option("--initial-buy <eth>", "ETH amount to swap for tokens on deploy (e.g., '0.001')")
    .action(async (options) => {
      await executeTokenDeploy({
        name: options.name,
        symbol: options.symbol,
        image: options.image,
        animation: options.animation,
        fid: options.fid,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
        mintPrice: options.mintPrice,
        mintEndTimestamp: options.mintEndTimestamp,
        maxMintSupply: options.maxMintSupply,
        metadataAddress: options.metadataAddress,
        extraStringData: options.extraStringData,
        initialBuy: options.initialBuy,
      });
    });

  // Info subcommand
  const infoCommand = new Command("info")
    .description("Get information about a Netr token")
    .requiredOption("--address <address>", "Token address")
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
      await executeTokenInfo({
        address: options.address,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
      });
    });

  tokenCommand.addCommand(deployCommand);
  tokenCommand.addCommand(infoCommand);
}
