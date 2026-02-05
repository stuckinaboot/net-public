# @net-protocol/bazaar

**Status: In Development** - This package is under active development. APIs may change without notice.

NFT marketplace SDK for Net Protocol - read listings, collection offers, and ERC20 offers via Seaport.

## What is Net Bazaar?

Net Bazaar is a decentralized NFT marketplace built on Net Protocol. It uses Seaport for order execution and Net Protocol for order storage and indexing.

**Key features:**
- **NFT Listings**: Buy and sell NFTs with native currency
- **Collection Offers**: Make offers on any NFT in a collection
- **ERC20 Offers**: Make offers to buy ERC20 tokens (Base and HyperEVM only)

## What can you do with this package?

- **Read listings**: Get valid NFT listings for a collection
- **Read collection offers**: Get valid offers for any NFT in a collection
- **Read ERC20 offers**: Get valid offers for ERC20 tokens
- **Cancel orders**: Prepare transactions to cancel your listings or offers

This package provides both React hooks (for UI) and a client class (for non-React code).

## Installation

```bash
npm install @net-protocol/bazaar @net-protocol/core viem
# or
yarn add @net-protocol/bazaar @net-protocol/core viem
```

For React hooks, also install:
```bash
npm install react wagmi @tanstack/react-query
```

## Usage

### React Hooks

```typescript
import { useBazaarListings, useBazaarCollectionOffers, useBazaarErc20Offers } from "@net-protocol/bazaar/react";

// Get NFT listings for a collection
function ListingsComponent() {
  const { listings, isLoading, error } = useBazaarListings({
    chainId: 8453,
    nftAddress: "0x...",
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {listings.map((listing) => (
        <div key={listing.orderHash}>
          Token #{listing.tokenId}: {listing.price} {listing.currency}
        </div>
      ))}
    </div>
  );
}

// Get collection offers
function CollectionOffersComponent() {
  const { offers, isLoading } = useBazaarCollectionOffers({
    chainId: 8453,
    nftAddress: "0x...",
  });

  const bestOffer = offers[0]; // Sorted by price, highest first
  return <div>Best offer: {bestOffer?.price} {bestOffer?.currency}</div>;
}

// Get ERC20 offers (Base and HyperEVM only)
function Erc20OffersComponent() {
  const { offers, isLoading } = useBazaarErc20Offers({
    chainId: 8453,
    tokenAddress: "0x...",
  });

  const bestOffer = offers[0]; // Sorted by price per token, highest first
  return (
    <div>
      Best offer: {bestOffer?.pricePerToken} {bestOffer?.currency} per token
    </div>
  );
}
```

### BazaarClient (Non-React)

```typescript
import { BazaarClient } from "@net-protocol/bazaar";

const client = new BazaarClient({ chainId: 8453 });

// Get listings
const listings = await client.getListings({
  nftAddress: "0x...",
});

// Get collection offers
const collectionOffers = await client.getCollectionOffers({
  nftAddress: "0x...",
});

// Get ERC20 offers (Base and HyperEVM only)
const erc20Offers = await client.getErc20Offers({
  tokenAddress: "0x...",
});

// Cancel a listing
const cancelTx = client.prepareCancelListing(listing);
// Use with wagmi's useWriteContract or viem's writeContract
```

## API Reference

### Types

```typescript
interface Listing {
  maker: `0x${string}`;
  nftAddress: `0x${string}`;
  tokenId: string;
  priceWei: bigint;
  price: number;
  currency: string;
  expirationDate: number;
  orderHash: string;
  orderStatus: SeaportOrderStatus;
  messageData: `0x${string}`;
  orderComponents?: SeaportOrderComponents;
}

interface CollectionOffer {
  maker: `0x${string}`;
  nftAddress: `0x${string}`;
  priceWei: bigint;
  price: number;
  currency: string;
  expirationDate: number;
  orderHash: string;
  orderStatus: SeaportOrderStatus;
  messageData: `0x${string}`;
  orderComponents?: SeaportOrderComponents;
}

interface Erc20Offer {
  maker: `0x${string}`;
  tokenAddress: `0x${string}`;
  tokenAmount: bigint;
  priceWei: bigint;
  pricePerTokenWei: bigint;
  price: number;
  pricePerToken: number;
  currency: string;
  expirationDate: number;
  orderHash: `0x${string}`;
  orderStatus: SeaportOrderStatus;
  messageData: `0x${string}`;
  orderComponents?: SeaportOrderComponents;
}
```

### Validation

All returned listings and offers are automatically validated:
- Order status is OPEN (not filled, cancelled, or expired)
- Not expired
- For listings: seller still owns the NFT
- For offers: buyer has sufficient WETH balance

### Sorting

- **Listings**: Sorted by price (lowest first), deduplicated per token
- **Collection offers**: Sorted by price (highest first)
- **ERC20 offers**: Sorted by price per token (highest first)

## Supported Chains

| Chain | Listings | Collection Offers | ERC20 Offers |
|-------|----------|-------------------|--------------|
| Base (8453) | Yes | Yes | Yes |
| Base Sepolia (84532) | Yes | Yes | No |
| Degen (666666666) | Yes | Yes | No |
| Ham (5112) | Yes | Yes | No |
| Ink (57073) | Yes | Yes | No |
| Unichain (130) | Yes | Yes | No |
| HyperEVM (999) | Yes | Yes | Yes |
| Plasma (9745) | Yes | Yes | No |
| Monad (143) | Yes | Yes | No |

## License

MIT
