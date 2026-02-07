import { Command } from "commander";
import { executeListListings } from "./list-listings";
import { executeListOffers } from "./list-offers";
import { executeListSales } from "./list-sales";
import { executeCreateListing } from "./create-listing";
import { executeCreateOffer } from "./create-offer";
import { executeSubmitListing } from "./submit-listing";
import { executeSubmitOffer } from "./submit-offer";
import { executeBuyListing } from "./buy-listing";
import { executeAcceptOffer } from "./accept-offer";
import { executeOwnedNfts } from "./owned-nfts";

const chainIdOption = [
  "--chain-id <id>",
  "Chain ID. Can also be set via NET_CHAIN_ID env var",
  (value: string) => parseInt(value, 10),
] as const;

const rpcUrlOption = [
  "--rpc-url <url>",
  "Custom RPC URL. Can also be set via NET_RPC_URL env var",
] as const;

const privateKeyOption = [
  "--private-key <key>",
  "Private key (0x-prefixed hex). Can also be set via NET_PRIVATE_KEY env var",
] as const;

export function registerBazaarCommand(program: Command): void {
  const bazaarCommand = program
    .command("bazaar")
    .description("Bazaar NFT trading operations");

  const listListingsCommand = new Command("list-listings")
    .description("List active NFT listings")
    .option("--nft-address <address>", "NFT contract address (optional for cross-collection)")
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeListListings({
        nftAddress: options.nftAddress,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
      });
    });

  const listOffersCommand = new Command("list-offers")
    .description("List active collection offers")
    .requiredOption("--nft-address <address>", "NFT contract address")
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeListOffers({
        nftAddress: options.nftAddress,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
      });
    });

  const listSalesCommand = new Command("list-sales")
    .description("List recent sales")
    .requiredOption("--nft-address <address>", "NFT contract address")
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeListSales({
        nftAddress: options.nftAddress,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
      });
    });

  const createListingCommand = new Command("create-listing")
    .description("Create an NFT listing (with --private-key: full flow; without: output EIP-712 data)")
    .requiredOption("--nft-address <address>", "NFT contract address")
    .requiredOption("--token-id <id>", "Token ID to list")
    .requiredOption("--price <eth>", "Price in ETH (e.g., 0.1)")
    .option("--target-fulfiller <address>", "Make a private listing for this address")
    .option("--offerer <address>", "Offerer address (required without --private-key)")
    .option(...privateKeyOption)
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .action(async (options) => {
      await executeCreateListing({
        nftAddress: options.nftAddress,
        tokenId: options.tokenId,
        price: options.price,
        targetFulfiller: options.targetFulfiller,
        offerer: options.offerer,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
      });
    });

  const createOfferCommand = new Command("create-offer")
    .description("Create a collection offer (with --private-key: full flow; without: output EIP-712 data)")
    .requiredOption("--nft-address <address>", "NFT contract address")
    .requiredOption("--price <eth>", "Offer price in ETH (e.g., 0.1)")
    .option("--offerer <address>", "Offerer address (required without --private-key)")
    .option(...privateKeyOption)
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .action(async (options) => {
      await executeCreateOffer({
        nftAddress: options.nftAddress,
        price: options.price,
        offerer: options.offerer,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
      });
    });

  const submitListingCommand = new Command("submit-listing")
    .description("Submit a signed listing (follow-up to create-listing without --private-key)")
    .requiredOption("--order-data <path>", "Path to order JSON file from create-listing output")
    .requiredOption("--signature <sig>", "EIP-712 signature (0x-prefixed)")
    .option(...privateKeyOption)
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--encode-only", "Output transaction data as JSON instead of executing")
    .action(async (options) => {
      await executeSubmitListing({
        orderData: options.orderData,
        signature: options.signature,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  const submitOfferCommand = new Command("submit-offer")
    .description("Submit a signed offer (follow-up to create-offer without --private-key)")
    .requiredOption("--order-data <path>", "Path to order JSON file from create-offer output")
    .requiredOption("--signature <sig>", "EIP-712 signature (0x-prefixed)")
    .option(...privateKeyOption)
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--encode-only", "Output transaction data as JSON instead of executing")
    .action(async (options) => {
      await executeSubmitOffer({
        orderData: options.orderData,
        signature: options.signature,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  const buyListingCommand = new Command("buy-listing")
    .description("Buy an NFT listing")
    .requiredOption("--order-hash <hash>", "Order hash of the listing to buy")
    .requiredOption("--nft-address <address>", "NFT contract address")
    .option("--buyer <address>", "Buyer address (required with --encode-only)")
    .option(...privateKeyOption)
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--encode-only", "Output transaction data as JSON instead of executing")
    .action(async (options) => {
      await executeBuyListing({
        orderHash: options.orderHash,
        nftAddress: options.nftAddress,
        buyer: options.buyer,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  const acceptOfferCommand = new Command("accept-offer")
    .description("Accept a collection offer by selling your NFT")
    .requiredOption("--order-hash <hash>", "Order hash of the offer to accept")
    .requiredOption("--nft-address <address>", "NFT contract address")
    .requiredOption("--token-id <id>", "Token ID to sell")
    .option("--seller <address>", "Seller address (required with --encode-only)")
    .option(...privateKeyOption)
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--encode-only", "Output transaction data as JSON instead of executing")
    .action(async (options) => {
      await executeAcceptOffer({
        orderHash: options.orderHash,
        nftAddress: options.nftAddress,
        tokenId: options.tokenId,
        seller: options.seller,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  const ownedNftsCommand = new Command("owned-nfts")
    .description("List NFTs owned by an address")
    .requiredOption("--nft-address <address>", "NFT contract address")
    .requiredOption("--owner <address>", "Owner address to check")
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--json", "Output in JSON format")
    .option("--start-token-id <id>", "Start of token ID range (default: 0)")
    .option("--end-token-id <id>", "End of token ID range (default: 10000)")
    .action(async (options) => {
      await executeOwnedNfts({
        nftAddress: options.nftAddress,
        owner: options.owner,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
        startTokenId: options.startTokenId,
        endTokenId: options.endTokenId,
      });
    });

  bazaarCommand.addCommand(listListingsCommand);
  bazaarCommand.addCommand(listOffersCommand);
  bazaarCommand.addCommand(listSalesCommand);
  bazaarCommand.addCommand(createListingCommand);
  bazaarCommand.addCommand(createOfferCommand);
  bazaarCommand.addCommand(submitListingCommand);
  bazaarCommand.addCommand(submitOfferCommand);
  bazaarCommand.addCommand(buyListingCommand);
  bazaarCommand.addCommand(acceptOfferCommand);
  bazaarCommand.addCommand(ownedNftsCommand);
}
