/**
 * Validation utilities for checking order status and ownership
 */

import { PublicClient } from "viem";
import { readContract } from "viem/actions";
import {
  BULK_SEAPORT_ORDER_STATUS_FETCHER_ABI,
  ERC721_OWNER_OF_HELPER_ABI,
  ERC20_BULK_BALANCE_CHECKER_ABI,
} from "../abis";
import {
  BULK_SEAPORT_ORDER_STATUS_FETCHER_ADDRESS,
  ERC721_OWNER_OF_HELPER_ADDRESS,
  ERC20_BULK_BALANCE_CHECKER_ADDRESS,
  getSeaportAddress,
} from "../chainConfig";
import { SeaportOrderStatusInfo, SeaportOrderStatus } from "../types";

/**
 * Bulk fetch Seaport order statuses
 */
export async function bulkFetchOrderStatuses(
  client: PublicClient,
  chainId: number,
  orderHashes: `0x${string}`[]
): Promise<SeaportOrderStatusInfo[]> {
  if (orderHashes.length === 0) {
    return [];
  }

  const seaportAddress = getSeaportAddress(chainId);

  try {
    console.log(`[bulkFetchOrderStatuses] fetching ${orderHashes.length} statuses via ${BULK_SEAPORT_ORDER_STATUS_FETCHER_ADDRESS}`);
    const results = await readContract(client, {
      address: BULK_SEAPORT_ORDER_STATUS_FETCHER_ADDRESS,
      abi: BULK_SEAPORT_ORDER_STATUS_FETCHER_ABI,
      functionName: "getOrderStatuses",
      args: [seaportAddress, orderHashes],
    });

    const statuses = (results as any[]).map((r) => ({
      isValidated: r.isValidated,
      isCancelled: r.isCancelled,
      totalFilled: BigInt(r.totalFilled),
      totalSize: BigInt(r.totalSize),
    }));
    console.log(`[bulkFetchOrderStatuses] success: ${statuses.length} statuses`);
    return statuses;
  } catch (err) {
    console.error(`[bulkFetchOrderStatuses] FAILED for ${orderHashes.length} hashes:`, err);
    throw err;
  }
}

/**
 * Create a mapping of order hash to status
 */
export async function createOrderStatusMap(
  client: PublicClient,
  chainId: number,
  orderHashes: `0x${string}`[]
): Promise<Map<string, SeaportOrderStatusInfo>> {
  const statuses = await bulkFetchOrderStatuses(client, chainId, orderHashes);

  const map = new Map<string, SeaportOrderStatusInfo>();
  orderHashes.forEach((hash, index) => {
    map.set(hash.toLowerCase(), statuses[index]);
  });

  return map;
}

/**
 * Bulk fetch NFT owners for specific token IDs
 */
export async function bulkFetchNftOwners(
  client: PublicClient,
  nftAddress: `0x${string}`,
  tokenIds: string[]
): Promise<(`0x${string}` | null)[]> {
  if (tokenIds.length === 0) {
    return [];
  }

  try {
    console.log(`[bulkFetchNftOwners] fetching ${tokenIds.length} owners for ${nftAddress.slice(0, 10)} via ${ERC721_OWNER_OF_HELPER_ADDRESS}`);
    const owners = await readContract(client, {
      address: ERC721_OWNER_OF_HELPER_ADDRESS,
      abi: ERC721_OWNER_OF_HELPER_ABI,
      functionName: "getTokenOwners",
      args: [nftAddress, tokenIds.map((id) => BigInt(id))],
    });

    const result = (owners as `0x${string}`[]).map((owner) =>
      owner === "0x0000000000000000000000000000000000000000" ? null : owner
    );
    const validCount = result.filter((o) => o !== null).length;
    console.log(`[bulkFetchNftOwners] success: ${validCount}/${tokenIds.length} have owners`);
    return result;
  } catch (err) {
    console.error(`[bulkFetchNftOwners] FAILED for ${tokenIds.length} tokens — returning all null:`, err);
    return tokenIds.map(() => null);
  }
}

/**
 * Create a mapping of token ID to owner address
 */
export async function createOwnershipMap(
  client: PublicClient,
  nftAddress: `0x${string}`,
  tokenIds: string[]
): Promise<Map<string, `0x${string}` | null>> {
  const owners = await bulkFetchNftOwners(client, nftAddress, tokenIds);

  const map = new Map<string, `0x${string}` | null>();
  tokenIds.forEach((tokenId, index) => {
    map.set(tokenId, owners[index]);
  });

  return map;
}

/**
 * Bulk fetch ERC20 balances for addresses
 */
export async function bulkFetchErc20Balances(
  client: PublicClient,
  tokenAddress: `0x${string}`,
  addresses: `0x${string}`[]
): Promise<bigint[]> {
  if (addresses.length === 0) {
    return [];
  }

  try {
    console.log(`[bulkFetchErc20Balances] fetching ${addresses.length} balances for ${tokenAddress.slice(0, 10)}`);
    const balances = await readContract(client, {
      address: ERC20_BULK_BALANCE_CHECKER_ADDRESS,
      abi: ERC20_BULK_BALANCE_CHECKER_ABI,
      functionName: "getBalances",
      args: [tokenAddress, addresses],
    });

    const result = (balances as bigint[]).map((b) => BigInt(b));
    console.log(`[bulkFetchErc20Balances] success: ${result.length} balances`);
    return result;
  } catch (err) {
    console.error(`[bulkFetchErc20Balances] FAILED for ${addresses.length} addresses — returning all zero:`, err);
    return addresses.map(() => BigInt(0));
  }
}

/**
 * Create a mapping of address to ERC20 balance
 */
export async function createBalanceMap(
  client: PublicClient,
  tokenAddress: `0x${string}`,
  addresses: `0x${string}`[]
): Promise<Map<string, bigint>> {
  const balances = await bulkFetchErc20Balances(client, tokenAddress, addresses);

  const map = new Map<string, bigint>();
  addresses.forEach((address, index) => {
    map.set(address.toLowerCase(), balances[index]);
  });

  return map;
}

/**
 * Validate that a listing is still valid:
 * - Order is OPEN
 * - Not expired
 * - Seller still owns the NFT
 */
export function isListingValid(
  orderStatus: SeaportOrderStatus,
  expirationDate: number,
  sellerAddress: `0x${string}`,
  currentOwner: `0x${string}` | null
): boolean {
  if (orderStatus !== SeaportOrderStatus.OPEN) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (expirationDate <= now) {
    return false;
  }

  if (!currentOwner || currentOwner.toLowerCase() !== sellerAddress.toLowerCase()) {
    return false;
  }

  return true;
}

/**
 * Validate that a collection offer is still valid:
 * - Order is OPEN
 * - Not expired
 * - Buyer has sufficient WETH balance
 */
export function isCollectionOfferValid(
  orderStatus: SeaportOrderStatus,
  expirationDate: number,
  priceWei: bigint,
  buyerBalance: bigint
): boolean {
  if (orderStatus !== SeaportOrderStatus.OPEN) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (expirationDate <= now) {
    return false;
  }

  if (buyerBalance < priceWei) {
    return false;
  }

  return true;
}

/**
 * Validate that an ERC20 offer is still valid:
 * - Order is OPEN
 * - Not expired
 * - Buyer has sufficient WETH balance
 */
export function isErc20OfferValid(
  orderStatus: SeaportOrderStatus,
  expirationDate: number,
  priceWei: bigint,
  buyerWethBalance: bigint
): boolean {
  if (orderStatus !== SeaportOrderStatus.OPEN) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (expirationDate <= now) {
    return false;
  }

  if (buyerWethBalance < priceWei) {
    return false;
  }

  return true;
}

/**
 * Validate that an ERC20 listing is still valid:
 * - Order is OPEN
 * - Not expired
 * - Seller has sufficient ERC20 token balance
 */
export function isErc20ListingValid(
  orderStatus: SeaportOrderStatus,
  expirationDate: number,
  tokenAmount: bigint,
  sellerTokenBalance: bigint
): boolean {
  if (orderStatus !== SeaportOrderStatus.OPEN) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (expirationDate <= now) {
    return false;
  }

  if (sellerTokenBalance < tokenAmount) {
    return false;
  }

  return true;
}
