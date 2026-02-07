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
import { executeListErc20Listings } from "./list-erc20-listings";
import { executeListErc20Offers } from "./list-erc20-offers";
import { executeCreateErc20Listing } from "./create-erc20-listing";
import { executeCreateErc20Offer } from "./create-erc20-offer";
import { executeSubmitErc20Listing } from "./submit-erc20-listing";
import { executeSubmitErc20Offer } from "./submit-erc20-offer";
import { executeBuyErc20Listing } from "./buy-erc20-listing";
import { executeAcceptErc20Offer } from "./accept-erc20-offer";

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

  // ERC-20 commands

  const listErc20ListingsCommand = new Command("list-erc20-listings")
    .description("List active ERC-20 token listings")
    .requiredOption("--token-address <address>", "ERC-20 token contract address")
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeListErc20Listings({
        tokenAddress: options.tokenAddress,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
      });
    });

  const listErc20OffersCommand = new Command("list-erc20-offers")
    .description("List active ERC-20 token offers")
    .requiredOption("--token-address <address>", "ERC-20 token contract address")
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      await executeListErc20Offers({
        tokenAddress: options.tokenAddress,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        json: options.json,
      });
    });

  const createErc20ListingCommand = new Command("create-erc20-listing")
    .description("Create an ERC-20 token listing (with --private-key: full flow; without: output EIP-712 data)")
    .requiredOption("--token-address <address>", "ERC-20 token contract address")
    .requiredOption("--token-amount <amount>", "Token amount in raw units (bigint string)")
    .requiredOption("--price <eth>", "Total price in ETH for the token amount")
    .option("--offerer <address>", "Offerer address (required without --private-key)")
    .option(...privateKeyOption)
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .action(async (options) => {
      await executeCreateErc20Listing({
        tokenAddress: options.tokenAddress,
        tokenAmount: options.tokenAmount,
        price: options.price,
        offerer: options.offerer,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
      });
    });

  const createErc20OfferCommand = new Command("create-erc20-offer")
    .description("Create an ERC-20 token offer (with --private-key: full flow; without: output EIP-712 data)")
    .requiredOption("--token-address <address>", "ERC-20 token contract address")
    .requiredOption("--token-amount <amount>", "Token amount in raw units (bigint string)")
    .requiredOption("--price <eth>", "Total price in ETH for the token amount")
    .option("--offerer <address>", "Offerer address (required without --private-key)")
    .option(...privateKeyOption)
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .action(async (options) => {
      await executeCreateErc20Offer({
        tokenAddress: options.tokenAddress,
        tokenAmount: options.tokenAmount,
        price: options.price,
        offerer: options.offerer,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
      });
    });

  const submitErc20ListingCommand = new Command("submit-erc20-listing")
    .description("Submit a signed ERC-20 listing (follow-up to create-erc20-listing without --private-key)")
    .requiredOption("--order-data <path>", "Path to order JSON file from create-erc20-listing output")
    .requiredOption("--signature <sig>", "EIP-712 signature (0x-prefixed)")
    .option(...privateKeyOption)
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--encode-only", "Output transaction data as JSON instead of executing")
    .action(async (options) => {
      await executeSubmitErc20Listing({
        orderData: options.orderData,
        signature: options.signature,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  const submitErc20OfferCommand = new Command("submit-erc20-offer")
    .description("Submit a signed ERC-20 offer (follow-up to create-erc20-offer without --private-key)")
    .requiredOption("--order-data <path>", "Path to order JSON file from create-erc20-offer output")
    .requiredOption("--signature <sig>", "EIP-712 signature (0x-prefixed)")
    .option(...privateKeyOption)
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--encode-only", "Output transaction data as JSON instead of executing")
    .action(async (options) => {
      await executeSubmitErc20Offer({
        orderData: options.orderData,
        signature: options.signature,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  const buyErc20ListingCommand = new Command("buy-erc20-listing")
    .description("Buy an ERC-20 token listing")
    .requiredOption("--order-hash <hash>", "Order hash of the listing to buy")
    .requiredOption("--token-address <address>", "ERC-20 token contract address")
    .option("--buyer <address>", "Buyer address (required with --encode-only)")
    .option(...privateKeyOption)
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--encode-only", "Output transaction data as JSON instead of executing")
    .action(async (options) => {
      await executeBuyErc20Listing({
        orderHash: options.orderHash,
        tokenAddress: options.tokenAddress,
        buyer: options.buyer,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
      });
    });

  const acceptErc20OfferCommand = new Command("accept-erc20-offer")
    .description("Accept an ERC-20 token offer by selling your tokens")
    .requiredOption("--order-hash <hash>", "Order hash of the offer to accept")
    .requiredOption("--token-address <address>", "ERC-20 token contract address")
    .option("--seller <address>", "Seller address (required with --encode-only)")
    .option(...privateKeyOption)
    .option(...chainIdOption)
    .option(...rpcUrlOption)
    .option("--encode-only", "Output transaction data as JSON instead of executing")
    .action(async (options) => {
      await executeAcceptErc20Offer({
        orderHash: options.orderHash,
        tokenAddress: options.tokenAddress,
        seller: options.seller,
        privateKey: options.privateKey,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        encodeOnly: options.encodeOnly,
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
  bazaarCommand.addCommand(listErc20ListingsCommand);
  bazaarCommand.addCommand(listErc20OffersCommand);
  bazaarCommand.addCommand(createErc20ListingCommand);
  bazaarCommand.addCommand(createErc20OfferCommand);
  bazaarCommand.addCommand(submitErc20ListingCommand);
  bazaarCommand.addCommand(submitErc20OfferCommand);
  bazaarCommand.addCommand(buyErc20ListingCommand);
  bazaarCommand.addCommand(acceptErc20OfferCommand);
}
