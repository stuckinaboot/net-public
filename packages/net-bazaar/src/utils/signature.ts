/**
 * Seaport signature checks for orders stored on Net.
 *
 * Seaport's order status (validated / cancelled / filled) says nothing about
 * the signature, so an order signed by the wrong key looks open until someone
 * tries to fill it and the fill reverts. These checks drop such orders.
 */

import {
  concat,
  domainSeparator,
  isAddressEqual,
  keccak256,
  parseAbi,
  recoverAddress,
  type PublicClient,
} from "viem";
import { readContract } from "viem/actions";
import { getSeaportAddress } from "../chainConfig";
import { getSeaportEip712Domain } from "./orderCreation";
import { decodeSeaportSubmission } from "./seaport";

const ERC1271_MAGIC_VALUE = "0x1626ba7e";
const ERC1271_ABI = parseAbi([
  "function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)",
]);

/** The parts of a Net-stored Seaport order a signature check needs. */
export type SignedOrder = {
  maker: `0x${string}`;
  orderHash: string;
  messageData: `0x${string}`;
};

/**
 * The EIP-712 digest Seaport checks an order's signature against.
 */
export function getSeaportOrderDigest(
  chainId: number,
  orderHash: `0x${string}`
): `0x${string}` {
  const separator = domainSeparator({
    domain: getSeaportEip712Domain(chainId, getSeaportAddress(chainId)),
  });
  return keccak256(concat(["0x1901", separator, orderHash]));
}

/**
 * Whether Seaport would accept an order's signature. Mirrors Seaport's own
 * check: the signature recovers to the maker, or the maker's contract code
 * accepts it through ERC-1271. The ecrecover path is local, so only a
 * mismatch costs an RPC call.
 */
export async function isOrderSignatureValid(
  client: PublicClient,
  chainId: number,
  order: SignedOrder
): Promise<boolean> {
  const { signature } = decodeSeaportSubmission(order.messageData);
  const digest = getSeaportOrderDigest(chainId, order.orderHash as `0x${string}`);

  try {
    const signer = await recoverAddress({ hash: digest, signature });
    if (isAddressEqual(signer, order.maker)) return true;
  } catch {
    // Not a plain 64/65-byte ECDSA signature; only ERC-1271 can accept it.
  }

  try {
    const result = await readContract(client, {
      address: order.maker,
      abi: ERC1271_ABI,
      functionName: "isValidSignature",
      args: [digest, signature],
    });
    return result === ERC1271_MAGIC_VALUE;
  } catch {
    // An EOA maker (no code) or a reverting wallet: Seaport rejects it too.
    return false;
  }
}

/**
 * Keeps the orders whose signature Seaport would accept, in their original
 * order. Each order is judged on its own submission, so a junk-signed copy
 * of a real order (same order hash) never hides the real one.
 */
export async function filterOrdersWithValidSignatures<T extends SignedOrder>(
  client: PublicClient,
  chainId: number,
  orders: T[]
): Promise<T[]> {
  const valid = await Promise.all(
    orders.map((order) => isOrderSignatureValid(client, chainId, order))
  );
  return orders.filter((_, i) => valid[i]);
}
