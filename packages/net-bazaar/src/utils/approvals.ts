/**
 * Approval utilities for checking and building ERC721/ERC20 approval transactions
 */

import { PublicClient } from "viem";
import { readContract } from "viem/actions";
import { ERC721_APPROVAL_ABI, ERC20_APPROVAL_ABI } from "../abis";
import { WriteTransactionConfig } from "../types";

const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

/**
 * Check if an ERC721 collection is approved for a spender, and return an approval tx if not.
 *
 * @returns A `setApprovalForAll` tx if not approved, or `null` if already approved.
 */
export async function checkErc721Approval(
  client: PublicClient,
  nftAddress: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`
): Promise<WriteTransactionConfig | null> {
  const isApproved = await readContract(client, {
    address: nftAddress,
    abi: ERC721_APPROVAL_ABI,
    functionName: "isApprovedForAll",
    args: [owner, spender],
  });

  if (isApproved) {
    return null;
  }

  return {
    to: nftAddress,
    functionName: "setApprovalForAll",
    args: [spender, true],
    abi: ERC721_APPROVAL_ABI,
  };
}

/**
 * Check if an ERC20 token has sufficient allowance for a spender, and return an approval tx if not.
 *
 * @returns An `approve(spender, maxUint256)` tx if allowance is insufficient, or `null` if sufficient.
 */
export async function checkErc20Approval(
  client: PublicClient,
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint
): Promise<WriteTransactionConfig | null> {
  const allowance = (await readContract(client, {
    address: tokenAddress,
    abi: ERC20_APPROVAL_ABI,
    functionName: "allowance",
    args: [owner, spender],
  })) as bigint;

  if (allowance >= amount) {
    return null;
  }

  return {
    to: tokenAddress,
    functionName: "approve",
    args: [spender, MAX_UINT256],
    abi: ERC20_APPROVAL_ABI,
  };
}
