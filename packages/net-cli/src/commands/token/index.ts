import { Command } from "commander";
import { executeTokenDeploy } from "./deploy";
import { executeTokenInfo } from "./info";
import { executeTokenSend } from "./send";
import { executeTokenTransfers } from "./transfers";

/**
 * Register the token command with the commander program
 */
export function registerTokenCommand(program: Command): void {
  const tokenCommand = program
    .command("token")
    .description("Token operations: deploy (Netr/Banger), info, and send with a message");

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

  // Send subcommand
  const sendCommand = new Command("send")
    .description("Send an ERC-20 or ETH to an address with an optional message recorded on Net")
    .requiredOption("--token <address|ETH>", "Token address, or ETH for native ETH")
    .requiredOption("--to <address>", "Recipient address")
    .requiredOption("--amount <amount>", "Amount in token units (e.g. 5 for 5 USDC, 0.001 for 0.001 ETH)")
    .option("--message <text>", "Message to attach (max 1024 bytes)")
    .option(
      "--private-key <key>",
      "Private key (0x-prefixed hex). Can also be set via NET_PRIVATE_KEY env var"
    )
    .option("--sender <address>", "Sender address (required with --encode-only to check allowance)")
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453). Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL. Can also be set via NET_RPC_URL env var")
    .option("--encode-only", "Output approvals + transaction as JSON instead of executing")
    .action(async (options) => {
      await executeTokenSend({
        token: options.token,
        to: options.to,
        amount: options.amount,
        message: options.message,
        privateKey: options.privateKey,
        sender: options.sender,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  // Transfers subcommand
  const transfersCommand = new Command("transfers")
    .description("List token transfers sent with a message: by sender, recipient, sender to recipient, or token")
    .option("--sent-by <address>", "Transfers sent by this address")
    .option("--received-by <address>", "Transfers received by this address")
    .option("--from <address>", "With --to: transfers from this address")
    .option("--to <address>", "With --from: transfers to this address")
    .option("--token <address|ETH>", "All transfers of this token")
    .option("--limit <n>", "Max transfers to return (default 20)")
    .option("--offset <n>", "Skip this many of the newest transfers (default 0)")
    .option(
      "--chain-id <id>",
      "Chain ID (default: 8453). Can also be set via NET_CHAIN_ID env var",
      (value) => parseInt(value, 10)
    )
    .option("--rpc-url <url>", "Custom RPC URL. Can also be set via NET_RPC_URL env var")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeTokenTransfers({
        sentBy: options.sentBy,
        receivedBy: options.receivedBy,
        from: options.from,
        to: options.to,
        token: options.token,
        limit: options.limit,
        offset: options.offset,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
      });
    });

  tokenCommand.addCommand(deployCommand);
  tokenCommand.addCommand(infoCommand);
  tokenCommand.addCommand(sendCommand);
  tokenCommand.addCommand(transfersCommand);
}
